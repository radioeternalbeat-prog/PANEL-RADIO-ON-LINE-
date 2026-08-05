// ============================================================
// Rutas de autenticación para tenants (clientes).
// Registro, login y perfil de tenant.
// ============================================================

import { Router } from "express";
import bcrypt from "bcryptjs";
import { loginTenant, registrarTenant } from "../authTenant.js";
import { requiereAuth } from "../auth.js";
import { tenantsRepo } from "../db/licencias.js";
import { crearRateLimit } from "../rateLimit.js";

// Rate-limit para registro: máx 3 por hora por IP
const registroLimiter = crearRateLimit({
  ventanaMs: 60 * 60 * 1000,
  max: 3,
  mensaje: "Demasiados registros desde esta IP. Intenta más tarde.",
});

// Rate-limit para login tenant: máx 5 por minuto por IP
const loginLimiter = crearRateLimit({
  ventanaMs: 60_000,
  max: 5,
  mensaje: "Demasiados intentos de inicio de sesión. Espera 1 minuto.",
});

const router = Router();

// POST /api/tenant/registro  { nombre, email, telefono?, usuario, clave }
router.post("/registro", registroLimiter, (req, res) => {
  try {
    const resultado = registrarTenant(req.body || {});
    res.status(201).json({
      mensaje: "Cuenta creada exitosamente. Tienes 7 días de prueba gratuita.",
      ...resultado,
    });
  } catch (err) {
    res.status(400).json({ mensaje: err.message });
  }
});

// POST /api/tenant/login  { usuario, clave }
router.post("/login", loginLimiter, (req, res) => {
  const { usuario, clave } = req.body || {};
  if (!usuario || !clave) {
    return res.status(400).json({ mensaje: "Usuario y contraseña son obligatorios." });
  }

  const resultado = loginTenant(usuario, clave);
  if (!resultado) {
    return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos." });
  }

  res.json(resultado);
});

// GET /api/tenant/perfil  (requiere token)
router.get("/perfil", requiereAuth, (req, res) => {
  const tenantId = req.usuario.tenantId || req.usuario.id;
  const tenant = tenantsRepo.obtener(tenantId);
  if (!tenant) return res.status(404).json({ mensaje: "Cuenta no encontrada." });

  res.json({
    id: tenant.id,
    usuario: tenant.usuario,
    nombre: tenant.nombre,
    email: tenant.email,
    telefono: tenant.telefono,
    rol: tenant.rol,
    estado: tenant.estado,
    nombreRadio: tenant.nombreRadio,
    logoUrl: tenant.logoUrl,
    licenciaActiva: tenant.licenciaActiva,
    licenciaExpirada: tenant.licenciaExpirada,
    enTrial: tenant.enTrial,
    trialExpirado: tenant.trialExpirado,
    diasRestantes: tenant.diasRestantes,
    trialFin: tenant.trialFin,
    licenciaExpira: tenant.licenciaExpira,
    planId: tenant.planId,
  });
});

// PUT /api/tenant/perfil-radio  { nombreRadio, logoUrl }  (requiere token)
// Permite al usuario personalizar el nombre y logo de su radio.
router.put("/perfil-radio", requiereAuth, (req, res) => {
  const { nombreRadio, logoUrl } = req.body || {};
  const tenantId = req.usuario.tenantId || req.usuario.id;
  const tenant = tenantsRepo.actualizarDatos(tenantId, { nombreRadio, logoUrl });
  if (!tenant) return res.status(404).json({ mensaje: "Cuenta no encontrada." });
  res.json({ mensaje: "Perfil de radio actualizado.", nombreRadio: tenant.nombreRadio, logoUrl: tenant.logoUrl });
});

// POST /api/tenant/cambiar-clave  { actual, nueva }  (requiere token)
router.post("/cambiar-clave", requiereAuth, (req, res) => {
  const { actual, nueva } = req.body || {};
  if (!actual || !nueva) return res.status(400).json({ mensaje: "Faltan datos." });
  if (nueva.length < 6) return res.status(400).json({ mensaje: "La nueva contraseña debe tener al menos 6 caracteres." });

  const tenantId = req.usuario.tenantId || req.usuario.id;
  const raw = tenantsRepo.porUsuarioRaw
    ? (() => {
        const t = tenantsRepo.obtener(tenantId);
        return t ? tenantsRepo.porUsuarioRaw(t.usuario) : null;
      })()
    : null;

  if (!raw || !bcrypt.compareSync(actual, raw.clave_hash)) {
    return res.status(400).json({ mensaje: "La contraseña actual no es correcta." });
  }

  tenantsRepo.cambiarClave(tenantId, nueva);
  res.json({ mensaje: "Contraseña actualizada correctamente." });
});

export default router;
