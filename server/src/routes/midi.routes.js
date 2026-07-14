import { Router } from "express";
import { midiMapeosRepo } from "../db/repos.js";

const router = Router();

// Todas las rutas están protegidas por requiereAuth (ver index.js) y
// siempre se filtran por req.usuario.id: cada usuario solo ve/edita sus
// propios perfiles de mapeo MIDI.

const TIPOS_MENSAJE_VALIDOS = new Set(["cc", "note", "noteoff", "pitchbend"]);

// Valida la forma de CADA asignación dentro del array `mapeo` antes de
// persistirlo (el repo solo hace JSON.stringify, así que si no se valida
// aquí, se podría guardar un perfil corrupto vía llamadas directas a la API
// que luego rompa el enrutamiento en el frontend).
function validarMapeo(mapeo) {
  if (!Array.isArray(mapeo)) return "El mapeo debe ser una lista de asignaciones.";
  for (const [i, a] of mapeo.entries()) {
    if (!a || typeof a !== "object") return `La asignación #${i + 1} no es un objeto válido.`;
    if (typeof a.controlId !== "string" || !a.controlId) {
      return `La asignación #${i + 1} necesita un controlId.`;
    }
    if (!TIPOS_MENSAJE_VALIDOS.has(a.mensajeTipo)) {
      return `La asignación #${i + 1} tiene un mensajeTipo inválido: "${a.mensajeTipo}".`;
    }
    if (!Number.isInteger(a.canal) || a.canal < 0 || a.canal > 15) {
      return `La asignación #${i + 1} necesita un canal MIDI válido (0-15).`;
    }
    if (!Number.isInteger(a.dato1) || a.dato1 < 0 || a.dato1 > 127) {
      return `La asignación #${i + 1} necesita un dato1 válido (0-127).`;
    }
  }
  return null;
}

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
  if (mapeo !== undefined) {
    const error = validarMapeo(mapeo);
    if (error) return res.status(400).json({ mensaje: error });
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
  if (mapeo !== undefined) {
    const error = validarMapeo(mapeo);
    if (error) return res.status(400).json({ mensaje: error });
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
