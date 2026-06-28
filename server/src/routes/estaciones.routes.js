import { Router } from "express";
import { estaciones, nuevoIdEstacion } from "../data/store.js";

const router = Router();

// GET /api/estaciones
router.get("/", (req, res) => {
  res.json(estaciones);
});

// GET /api/estaciones/:id
router.get("/:id", (req, res) => {
  const est = estaciones.find((e) => e.id === req.params.id);
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });
  res.json(est);
});

// POST /api/estaciones
router.post("/", (req, res) => {
  const { nombre, montaje, host, puerto, bitrate, formato, oyentesMaximos } = req.body || {};
  if (!nombre) return res.status(400).json({ mensaje: "El nombre es obligatorio." });

  const nueva = {
    id: nuevoIdEstacion(),
    nombre,
    estado: "offline",
    servidor: "Icecast 2.4.4",
    montaje: montaje || "/stream",
    host: host || "stream.panelradio.online",
    puerto: Number(puerto) || 8000,
    bitrate: Number(bitrate) || 128,
    formato: formato || "MP3",
    oyentesActuales: 0,
    oyentesMaximos: Number(oyentesMaximos) || 100,
    picoOyentes: 0,
    cancionActual: "—",
    autodj: false,
    uptime: "—",
  };
  estaciones.push(nueva);
  res.status(201).json(nueva);
});

// PUT /api/estaciones/:id
router.put("/:id", (req, res) => {
  const est = estaciones.find((e) => e.id === req.params.id);
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });

  const campos = ["nombre", "montaje", "host", "puerto", "bitrate", "formato", "oyentesMaximos", "autodj"];
  for (const c of campos) {
    if (req.body[c] !== undefined) est[c] = req.body[c];
  }
  res.json(est);
});

// DELETE /api/estaciones/:id
router.delete("/:id", (req, res) => {
  const i = estaciones.findIndex((e) => e.id === req.params.id);
  if (i === -1) return res.status(404).json({ mensaje: "Estación no encontrada." });
  const [eliminada] = estaciones.splice(i, 1);
  res.json({ mensaje: "Estación eliminada.", estacion: eliminada });
});

// POST /api/estaciones/:id/iniciar
router.post("/:id/iniciar", (req, res) => {
  const est = estaciones.find((e) => e.id === req.params.id);
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });
  // En producción: aquí se arrancaría el mount en Icecast / proceso de Liquidsoap.
  est.estado = "online";
  est.uptime = "0d 0h 1m";
  est.oyentesActuales = Math.max(1, est.picoOyentes - 30);
  res.json(est);
});

// POST /api/estaciones/:id/detener
router.post("/:id/detener", (req, res) => {
  const est = estaciones.find((e) => e.id === req.params.id);
  if (!est) return res.status(404).json({ mensaje: "Estación no encontrada." });
  est.estado = "offline";
  est.uptime = "—";
  est.oyentesActuales = 0;
  est.cancionActual = "—";
  res.json(est);
});

export default router;
