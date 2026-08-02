// ============================================================
// Integración con Mercado Pago — Checkout Pro
// 
// Flujo:
// 1. Cliente elige un plan → POST /api/pagos/crear-preferencia
// 2. Se crea una "preferencia" en Mercado Pago con el precio del plan
// 3. Cliente es redirigido a Mercado Pago para pagar
// 4. Mercado Pago envía un webhook → POST /api/pagos/webhook
// 5. Verificamos el pago y activamos la licencia automáticamente
//
// Configuración requerida (.env):
//   MP_ACCESS_TOKEN=tu-access-token-de-produccion
//   MP_PUBLIC_KEY=tu-public-key (opcional, para frontend)
//   APP_URL=https://tu-panel.onrender.com (para URLs de retorno)
// ============================================================

import { Router } from "express";
import crypto from "node:crypto";
import { tenantsRepo, planesRepo, pagosRepo } from "../db/licencias.js";
import { requiereAuth } from "../auth.js";

const router = Router();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "";
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";
const APP_URL = process.env.APP_URL || process.env.CORS_ORIGIN || "http://localhost:5173";

// Función helper para llamar a la API de Mercado Pago
async function mpFetch(endpoint, { method = "GET", body } = {}) {
  if (!MP_ACCESS_TOKEN) {
    throw new Error("Mercado Pago no está configurado (falta MP_ACCESS_TOKEN).");
  }

  const resp = await fetch(`https://api.mercadopago.com${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("[MercadoPago Error]", resp.status, data);
    throw new Error(data.message || `Error ${resp.status} de Mercado Pago`);
  }
  return data;
}

// ---- CREAR PREFERENCIA DE PAGO ----
// POST /api/pagos/crear-preferencia  { planId }
// El cliente (autenticado) solicita comprar un plan.
router.post("/crear-preferencia", requiereAuth, async (req, res) => {
  try {
    const { planId } = req.body || {};
    if (!planId) return res.status(400).json({ mensaje: "Debes indicar un plan." });

    const plan = planesRepo.obtener(planId);
    if (!plan || !plan.activo) {
      return res.status(404).json({ mensaje: "Plan no encontrado o no disponible." });
    }

    // Obtener tenant del usuario autenticado
    const tenantId = req.usuario.tenantId || req.usuario.id;
    const tenant = tenantsRepo.obtener(tenantId);
    if (!tenant) {
      return res.status(404).json({ mensaje: "Cuenta no encontrada." });
    }

    // Crear preferencia en Mercado Pago
    const preferencia = await mpFetch("/checkout/preferences", {
      method: "POST",
      body: {
        items: [
          {
            id: plan.codigo,
            title: `Panel Radio Online — ${plan.nombre}`,
            description: plan.descripcion || `Licencia ${plan.nombre} por ${plan.duracionDias} días`,
            quantity: 1,
            unit_price: plan.precio,
            currency_id: plan.moneda,
          },
        ],
        payer: {
          email: tenant.email,
          name: tenant.nombre,
        },
        back_urls: {
          success: `${APP_URL}/licencia/exito`,
          failure: `${APP_URL}/licencia/error`,
          pending: `${APP_URL}/licencia/pendiente`,
        },
        auto_return: "approved",
        external_reference: `tenant_${tenant.id}_plan_${plan.id}_${Date.now()}`,
        notification_url: `${APP_URL}/api/pagos/webhook`,
        metadata: {
          tenant_id: tenant.id,
          plan_id: plan.id,
        },
      },
    });

    // Registrar pago pendiente en nuestra BD
    const pago = pagosRepo.crear({
      tenantId: tenant.id,
      planId: plan.id,
      monto: plan.precio,
      moneda: plan.moneda,
      mpPreferenceId: preferencia.id,
    });

    res.json({
      preferenceId: preferencia.id,
      initPoint: preferencia.init_point,
      sandboxInitPoint: preferencia.sandbox_init_point,
      pago,
    });
  } catch (err) {
    console.error("[Crear Preferencia Error]", err.message);
    res.status(500).json({ mensaje: err.message || "No se pudo crear la preferencia de pago." });
  }
});

// ---- WEBHOOK DE MERCADO PAGO ----
// POST /api/pagos/webhook
// Mercado Pago envía notificaciones aquí cuando el estado del pago cambia.
router.post("/webhook", async (req, res) => {
  try {
    // Verificar firma del webhook (si MP_WEBHOOK_SECRET está configurado)
    if (MP_WEBHOOK_SECRET) {
      const xSignature = req.headers["x-signature"] || "";
      const xRequestId = req.headers["x-request-id"] || "";
      const dataId = req.query["data.id"] || req.body?.data?.id || "";

      // Extraer ts y v1 del header x-signature
      const parts = Object.fromEntries(
        xSignature.split(",").map((p) => p.trim().split("="))
      );
      const ts = parts.ts || "";
      const v1 = parts.v1 || "";

      // Construir el manifest para verificar
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const expected = crypto
        .createHmac("sha256", MP_WEBHOOK_SECRET)
        .update(manifest)
        .digest("hex");

      if (v1 !== expected) {
        console.warn("[Webhook] Firma inválida");
        return res.status(401).json({ mensaje: "Firma inválida." });
      }
    }

    const { type, data, action } = req.body || {};

    // Solo nos interesan las notificaciones de pago
    if (type === "payment" || action === "payment.created" || action === "payment.updated") {
      const paymentId = data?.id || req.query["data.id"];
      if (paymentId) {
        await procesarPago(String(paymentId));
      }
    }

    // Responder 200 inmediatamente (Mercado Pago reintenta si no recibe 200)
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[Webhook Error]", err.message);
    // Aún devolvemos 200 para evitar reintentos infinitos
    res.status(200).json({ ok: true, error: err.message });
  }
});

// ---- VERIFICAR ESTADO DE PAGO (manual, desde frontend) ----
// GET /api/pagos/verificar/:mpPaymentId
router.get("/verificar/:mpPaymentId", requiereAuth, async (req, res) => {
  try {
    const paymentId = req.params.mpPaymentId;
    const resultado = await procesarPago(paymentId);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ mensaje: err.message || "No se pudo verificar el pago." });
  }
});

// ---- MI LICENCIA (para el cliente autenticado) ----
// GET /api/pagos/mi-licencia
router.get("/mi-licencia", requiereAuth, (req, res) => {
  const tenantId = req.usuario.tenantId || req.usuario.id;
  const tenant = tenantsRepo.obtener(tenantId);
  if (!tenant) return res.status(404).json({ mensaje: "Cuenta no encontrada." });

  const plan = tenant.planId ? planesRepo.obtener(tenant.planId) : null;
  const pagos = pagosRepo.listar(tenant.id);

  res.json({
    licenciaActiva: tenant.licenciaActiva,
    licenciaExpirada: tenant.licenciaExpirada,
    enTrial: tenant.enTrial,
    trialExpirado: tenant.trialExpirado,
    diasRestantes: tenant.diasRestantes,
    trialFin: tenant.trialFin,
    licenciaExpira: tenant.licenciaExpira,
    plan,
    pagos: pagos.slice(0, 10), // últimos 10 pagos
  });
});

// ---- PUBLIC KEY (para inicializar el SDK en frontend) ----
// GET /api/pagos/config
router.get("/config", (req, res) => {
  res.json({
    publicKey: process.env.MP_PUBLIC_KEY || "",
    configurado: !!MP_ACCESS_TOKEN,
  });
});

// ============================================================
// Función interna: consulta Mercado Pago y activa la licencia
// ============================================================

async function procesarPago(mpPaymentId) {
  // Consultar el pago en Mercado Pago
  const mpPago = await mpFetch(`/v1/payments/${mpPaymentId}`);

  const externalRef = mpPago.external_reference || "";
  // external_reference: "tenant_5_plan_2_1722600000000"
  const partes = externalRef.match(/tenant_(\d+)_plan_(\d+)/);
  const tenantId = partes ? Number(partes[1]) : mpPago.metadata?.tenant_id;
  const planId = partes ? Number(partes[2]) : mpPago.metadata?.plan_id;

  if (!tenantId || !planId) {
    return { estado: "ignorado", mensaje: "No se pudo identificar el tenant/plan." };
  }

  const plan = planesRepo.obtener(planId);
  if (!plan) {
    return { estado: "error", mensaje: "Plan no encontrado." };
  }

  // Buscar o crear registro de pago en nuestra BD
  let pago = pagosRepo.porMpPayment(mpPaymentId);
  if (!pago) {
    // Buscar por preference_id
    const prefId = mpPago.preference_id;
    pago = prefId ? pagosRepo.porPreferencia(prefId) : null;
  }

  if (mpPago.status === "approved") {
    // Pago aprobado → activar licencia
    if (pago) {
      pagosRepo.confirmar(pago.id, {
        mpPaymentId: String(mpPaymentId),
        mpStatus: mpPago.status,
        mpStatusDetail: mpPago.status_detail,
      });
    } else {
      // Crear registro de pago si no existía
      pago = pagosRepo.crear({
        tenantId,
        planId,
        monto: mpPago.transaction_amount,
        moneda: mpPago.currency_id,
        mpPreferenceId: mpPago.preference_id,
      });
      pagosRepo.confirmar(pago.id, {
        mpPaymentId: String(mpPaymentId),
        mpStatus: mpPago.status,
        mpStatusDetail: mpPago.status_detail,
      });
    }

    // Activar la licencia del tenant
    tenantsRepo.activarLicencia(tenantId, {
      planId: plan.id,
      duracionDias: plan.duracionDias,
      pagoId: pago?.id,
    });

    console.log(`[MercadoPago] Licencia activada: tenant=${tenantId}, plan=${plan.nombre}, pago=${mpPaymentId}`);
    return { estado: "aprobado", mensaje: `Licencia "${plan.nombre}" activada por ${plan.duracionDias} días.` };

  } else if (mpPago.status === "rejected" || mpPago.status === "cancelled") {
    if (pago) {
      pagosRepo.rechazar(pago.id, {
        mpPaymentId: String(mpPaymentId),
        mpStatus: mpPago.status,
        mpStatusDetail: mpPago.status_detail,
      });
    }
    return { estado: "rechazado", mensaje: "El pago fue rechazado o cancelado." };

  } else {
    // pending, in_process, etc.
    return { estado: mpPago.status, mensaje: `Pago en estado: ${mpPago.status}` };
  }
}

export default router;
