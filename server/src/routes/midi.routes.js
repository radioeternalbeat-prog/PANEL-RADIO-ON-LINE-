import { Router } from "express";
import { midiMapeosRepo } from "../db/repos.js";

const router = Router();

// Todas las rutas están protegidas por requiereAuth (ver index.js) y
// siempre se filtran por req.usuario.id: cada usuario solo ve/edita sus
// propios perfiles de mapeo MIDI.

// GET /api/midi/mapeos
router.get("/mapeos", (req, res) => {
  res.json(midiMapeosRepo.listarPorUsuario(req.usuario.id));
});

// GET /api/midi/mapeos/activo
router.get("/mapeos/activo", (req, res) => {
  res.json(midiMapeosRepo.activo(req.usuario.id) || null);
});

// GET /api/midi/mapeos/:id
router.get("/mapeos/:id", (req, res) => {
  const m = midiMapeosRepo.obtener(Number(req.params.id), req.usuario.id);
  if (!m) return res.status(404).json({ mensaje: "Mapeo no encontrado." });
  res.json(m);
});

// POST /api/midi/mapeos  { nombre, dispositivo, mapeo: [...], activo }
router.post("/mapeos", (req, res) => {
  const { nombre, dispositivo, mapeo, activo } = req.body || {};
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ mensaje: "El perfil necesita un nombre." });
  }
  if (mapeo !== undefined && !Array.isArray(mapeo)) {
    return res.status(400).json({ mensaje: "El mapeo debe ser una lista de asignaciones." });
  }
  const creado = midiMapeosRepo.crear(req.usuario.id, {
    nombre: nombre.trim(),
    dispositivo,
    mapeo,
    activo,
  });
  res.status(201).json(creado);
});

// PUT /api/midi/mapeos/:id  { nombre?, dispositivo?, mapeo? }
router.put("/mapeos/:id", (req, res) => {
  const { nombre, dispositivo, mapeo } = req.body || {};
  if (mapeo !== undefined && !Array.isArray(mapeo)) {
    return res.status(400).json({ mensaje: "El mapeo debe ser una lista de asignaciones." });
  }
  const actualizado = midiMapeosRepo.actualizar(Number(req.params.id), req.usuario.id, {
    nombre: nombre?.trim(),
    dispositivo,
    mapeo,
  });
  if (!actualizado) return res.status(404).json({ mensaje: "Mapeo no encontrado." });
  res.json(actualizado);
});

// POST /api/midi/mapeos/:id/activar
router.post("/mapeos/:id/activar", (req, res) => {
  const activado = midiMapeosRepo.activar(Number(req.params.id), req.usuario.id);
  if (!activado) return res.status(404).json({ mensaje: "Mapeo no encontrado." });
  res.json(activado);
});

// DELETE /api/midi/mapeos/:id
router.delete("/mapeos/:id", (req, res) => {
  const eliminado = midiMapeosRepo.eliminar(Number(req.params.id), req.usuario.id);
  if (!eliminado) return res.status(404).json({ mensaje: "Mapeo no encontrado." });
  res.json({ mensaje: "Mapeo eliminado.", mapeo: eliminado });
});

export default router;
