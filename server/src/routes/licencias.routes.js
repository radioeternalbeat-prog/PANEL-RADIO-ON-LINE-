// ============================================================
// Rutas de gestión de licencias y clientes (Superadmin).
// ============================================================

import { Router } from "express";
import { tenantsRepo, planesRepo, pagosRepo } from "../db/licencias.js";
import { requiereSuperadmin } from "../licenciaMiddleware.js";

const router = Router();

// ---- PLANES ----

// GET /api/licencias/planes  (público — para la página de precios)
router.get("/planes", (req, res) => {
  res.json(planesRepo.listar());
});

// GET /api/licencias/planes/todos  (superadmin — incluye inactivos)
router.get("/planes/todos", requiereSuperadmin, (req, res) => {
  res.json(planesRepo.listarTodos());
});

// POST /api/licencias/planes  (superadmin — crear plan)
router.post("/planes", requiereSuperadmin, (req, res) => {
  const { nombre, codigo, precio, moneda, duracionDias, maxEstaciones, maxOyentes, maxStorageMb, descripcion } = req.body || {};
  if (!nombre || !codigo || !precio || !duracionDias) {
    return res.status(400).json({ mensaje: "Nombre, código, precio y duración son obligatorios." });
  }
  try {
    const plan = planesRepo.crear(req.body);
    res.status(201).json(plan);
  } catch (err) {
    if (err.message?.includes("UNIQUE")) {
      return res.status(409).json({ mensaje: "Ya existe un plan con ese código." });
    }
    throw err;
  }
});

// PUT /api/licencias/planes/:id  (superadmin — actualizar plan)
router.put("/planes/:id", requiereSuperadmin, (req, res) => {
  const plan = planesRepo.actualizar(Number(req.params.id), req.body || {});
  if (!plan) return res.status(404).json({ mensaje: "Plan no encontrado." });
  res.json(plan);
});

// ---- TENANTS (CLIENTES) ----

// GET /api/licencias/clientes  (superadmin)
router.get("/clientes", requiereSuperadmin, (req, res) => {
  res.json(tenantsRepo.listar());
});

// GET /api/licencias/clientes/estadisticas  (superadmin)
router.get("/clientes/estadisticas", requiereSuperadmin, (req, res) => {
  const stats = tenantsRepo.estadisticas();
  const ingresos = pagosRepo.ingresosTotales();
  res.json({ ...stats, ingresosTotales: ingresos });
});

// GET /api/licencias/clientes/:id  (superadmin)
router.get("/clientes/:id", requiereSuperadmin, (req, res) => {
  const tenant = tenantsRepo.obtener(Number(req.params.id));
  if (!tenant) return res.status(404).json({ mensaje: "Cliente no encontrado." });
  const pagos = pagosRepo.listar(tenant.id);
  res.json({ ...tenant, pagos });
});

// PUT /api/licencias/clientes/:id  (superadmin — actualizar datos)
router.put("/clientes/:id", requiereSuperadmin, (req, res) => {
  const tenant = tenantsRepo.actualizarDatos(Number(req.params.id), req.body || {});
  if (!tenant) return res.status(404).json({ mensaje: "Cliente no encontrado." });
  res.json(tenant);
});

// POST /api/licencias/clientes/:id/activar  (superadmin — activar licencia manual)
router.post("/clientes/:id/activar", requiereSuperadmin, (req, res) => {
  const { planId } = req.body || {};
  if (!planId) return res.status(400).json({ mensaje: "Debes indicar un plan." });

  const plan = planesRepo.obtener(planId);
  if (!plan) return res.status(404).json({ mensaje: "Plan no encontrado." });

  const tenant = tenantsRepo.activarLicencia(Number(req.params.id), {
    planId: plan.id,
    duracionDias: plan.duracionDias,
    pagoId: null, // activación manual
  });

  if (!tenant) return res.status(404).json({ mensaje: "Cliente no encontrado." });
  res.json({ mensaje: `Licencia "${plan.nombre}" activada por ${plan.duracionDias} días.`, tenant });
});

// POST /api/licencias/clientes/:id/desactivar  (superadmin)
router.post("/clientes/:id/desactivar", requiereSuperadmin, (req, res) => {
  const tenant = tenantsRepo.desactivarLicencia(Number(req.params.id));
  if (!tenant) return res.status(404).json({ mensaje: "Cliente no encontrado." });
  res.json({ mensaje: "Licencia desactivada.", tenant });
});

// POST /api/licencias/clientes/:id/suspender  (superadmin)
router.post("/clientes/:id/suspender", requiereSuperadmin, (req, res) => {
  const tenant = tenantsRepo.suspender(Number(req.params.id));
  if (!tenant) return res.status(404).json({ mensaje: "Cliente no encontrado." });
  res.json({ mensaje: "Cuenta suspendida.", tenant });
});

// POST /api/licencias/clientes/:id/reactivar  (superadmin)
router.post("/clientes/:id/reactivar", requiereSuperadmin, (req, res) => {
  const tenant = tenantsRepo.reactivar(Number(req.params.id));
  if (!tenant) return res.status(404).json({ mensaje: "Cliente no encontrado." });
  res.json({ mensaje: "Cuenta reactivada.", tenant });
});

// DELETE /api/licencias/clientes/:id  (superadmin)
router.delete("/clientes/:id", requiereSuperadmin, (req, res) => {
  const tenant = tenantsRepo.eliminar(Number(req.params.id));
  if (!tenant) return res.status(404).json({ mensaje: "Cliente no encontrado." });
  res.json({ mensaje: "Cliente eliminado.", tenant });
});

// ---- PAGOS ----

// GET /api/licencias/pagos  (superadmin — todos los pagos)
router.get("/pagos", requiereSuperadmin, (req, res) => {
  res.json(pagosRepo.listar());
});

// GET /api/licencias/pagos/:id  (superadmin)
router.get("/pagos/:id", requiereSuperadmin, (req, res) => {
  const pago = pagosRepo.obtener(Number(req.params.id));
  if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado." });
  res.json(pago);
});

export default router;
