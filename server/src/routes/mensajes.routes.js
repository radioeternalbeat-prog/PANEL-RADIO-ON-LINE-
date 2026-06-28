import { Router } from "express";
import { mensajesRepo } from "../db/repos.js";

const router = Router();

const ESTADOS = ["pendiente", "al_aire", "leido"];

// GET /api/mensajes
router.get("/", (req, res) => {
  res.json(mensajesRepo.listar());
});

// POST /api/mensajes  { autor, telefono, texto }
router.post("/", (req, res) => {
  const { autor, telefono, texto } = req.body || {};
  if (!texto || !texto.trim()) {
    return res.status(400).json({ mensaje: "El mensaje no puede estar vacío." });
  }
  res.status(201).json(mensajesRepo.agregar({ autor, telefono, texto: texto.trim(), origen: "manual" }));
});

// PATCH /api/mensajes/:id  { estado }
router.patch("/:id", (req, res) => {
  const { estado } = req.body || {};
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ mensaje: "Estado inválido." });
  }
  const m = mensajesRepo.actualizarEstado(Number(req.params.id), estado);
  if (!m) return res.status(404).json({ mensaje: "Mensaje no encontrado." });
  res.json(m);
});

// DELETE /api/mensajes/:id
router.delete("/:id", (req, res) => {
  const m = mensajesRepo.eliminar(Number(req.params.id));
  if (!m) return res.status(404).json({ mensaje: "Mensaje no encontrado." });
  res.json({ mensaje: "Mensaje eliminado.", mensajeEliminado: m });
});

export default router;
