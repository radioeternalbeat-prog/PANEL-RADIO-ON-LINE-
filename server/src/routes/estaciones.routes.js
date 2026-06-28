import { Router } from "express";
import { estacionesRepo } from "../db/repos.js";

const router = Router();

// GET /api/estaciones
router.get("/", (req, res) => {
  res.json(estacionesRepo.listar());
});

// GET /api/estaciones/:id
router.get("/:id", (req, res) => {
  const est = estacionesRepo.obtener(req.params.id);
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });
  res.json(est);
});

// POST /api/estaciones
router.post("/", (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre) return res.status(400).json({ mensaje: "El nombre es obligatorio." });
  const nueva = estacionesRepo.crear(req.body);
  res.status(201).json(nueva);
});

// PUT /api/estaciones/:id
router.put("/:id", (req, res) => {
  const est = estacionesRepo.actualizar(req.params.id, req.body || {});
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });
  res.json(est);
});

// DELETE /api/estaciones/:id
router.delete("/:id", (req, res) => {
  const eliminada = estacionesRepo.eliminar(req.params.id);
  if (!eliminada) return res.status(404).json({ mensaje: "Estación no encontrada." });
  res.json({ mensaje: "Estación eliminada.", estacion: eliminada });
});

// POST /api/estaciones/:id/iniciar
router.post("/:id/iniciar", (req, res) => {
  const est = estacionesRepo.iniciar(req.params.id);
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });
  res.json(est);
});

// POST /api/estaciones/:id/detener
router.post("/:id/detener", (req, res) => {
  const est = estacionesRepo.detener(req.params.id);
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });
  res.json(est);
});

export default router;
