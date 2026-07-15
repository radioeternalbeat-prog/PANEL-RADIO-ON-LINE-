import { Router } from "express";
import { estacionesRepo, historialRepo, programacionRepo, mensajesRepo } from "../db/repos.js";

// Rutas PÚBLICAS (sin autenticación) para la página de radio de los oyentes.
const router = Router();

function estacionPrincipal() {
  const todas = estacionesRepo.listar();
  // Prioriza una estación con reproductor público; luego una en línea; luego la primera.
  return (
    todas.find((e) => e.embedToken && e.embedCanal) ||
    todas.find((e) => e.estado === "online") ||
    todas[0] ||
    null
  );
}

function infoPublica(est) {
  if (!est) return null;
  return {
    id: est.id,
    nombre: est.nombre,
    estado: est.estado,
    enVivo: est.estado === "online",
    cancionActual: est.cancionActual,
    oyentes: est.oyentesActuales,
    pico: est.picoOyentes,
    uptime: est.uptime,
    bitrate: est.bitrate,
    formato: est.formato,
    embedToken: est.embedToken,
    embedCanal: est.embedCanal,
    streamUrl: est.streamUrl,
    historial: historialRepo.listar(est.id, 8),
    programacion: programacionRepo.listar(),
  };
}

// GET /api/publico/radio  -> info pública de la estación principal.
router.get("/radio", (req, res) => {
  const est = estacionPrincipal();
  if (!est) return res.status(404).json({ mensaje: "No hay estaciones disponibles." });
  res.json(infoPublica(est));
});

// GET /api/publico/radio/:id -> info pública de una estación concreta.
router.get("/radio/:id", (req, res) => {
  const est = estacionesRepo.obtener(req.params.id);
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });
  res.json(infoPublica(est));
});

// GET /api/publico/historial -> últimas canciones emitidas.
router.get("/historial", (req, res) => {
  const est = estacionPrincipal();
  if (!est) return res.json([]);
  res.json(historialRepo.listar(est.id, 20));
});

// POST /api/publico/peticion  { nombre, texto }
// Petición/saludo de un oyente desde la página pública -> llega al panel de mensajes.
router.post("/peticion", (req, res) => {
  const { nombre, texto } = req.body || {};
  if (!texto || !String(texto).trim()) {
    return res.status(400).json({ mensaje: "Escribe tu mensaje o petición." });
  }
  if (String(texto).length > 500) {
    return res.status(400).json({ mensaje: "El mensaje es demasiado largo." });
  }
  const msg = mensajesRepo.agregar({
    autor: (nombre && String(nombre).trim().slice(0, 60)) || "Oyente web",
    texto: String(texto).trim().slice(0, 500),
    origen: "peticion",
  });
  res.status(201).json({ ok: true, id: msg.id });
});

export default router;
