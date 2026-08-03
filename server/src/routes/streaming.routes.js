// ============================================================
// Rutas de streaming: gestión de la conexión a Icecast.
// Incluye test de conexión, iniciar/detener transmisión y estado.
// ============================================================

import { Router } from "express";
import {
  conectarIcecast,
  desconectarIcecast,
  estadoConexion,
  testConexion,
  listarConexiones,
} from "../services/icecastEncoder.js";

const router = Router();

// POST /api/streaming/test  { host, port, mountpoint, username, password }
// Prueba la conexión al servidor Icecast sin iniciar transmisión.
router.post("/test", async (req, res) => {
  const { host, port, mountpoint, username, password } = req.body || {};
  if (!host || !password) {
    return res.status(400).json({ mensaje: "Host y contraseña son obligatorios." });
  }

  try {
    const resultado = await testConexion({ host, port, mountpoint, username, password });
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

// POST /api/streaming/conectar  { estacionId, host, port, mountpoint, username, password, contentType, bitrate, nombre }
// Inicia la conexión al servidor Icecast (abre el stream SOURCE).
router.post("/conectar", async (req, res) => {
  const { estacionId, ...config } = req.body || {};
  if (!estacionId || !config.host || !config.password) {
    return res.status(400).json({ mensaje: "Faltan datos: estacionId, host y password son obligatorios." });
  }

  try {
    const resultado = await conectarIcecast(estacionId, config);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

// POST /api/streaming/desconectar  { estacionId }
// Cierra la conexión al servidor Icecast.
router.post("/desconectar", (req, res) => {
  const { estacionId } = req.body || {};
  if (!estacionId) return res.status(400).json({ mensaje: "Falta estacionId." });

  const resultado = desconectarIcecast(estacionId);
  res.json(resultado);
});

// GET /api/streaming/estado/:estacionId
// Obtiene el estado actual de la conexión de una estación.
router.get("/estado/:estacionId", (req, res) => {
  const estado = estadoConexion(req.params.estacionId);
  res.json(estado);
});

// GET /api/streaming/conexiones
// Lista todas las conexiones activas (para el superadmin).
router.get("/conexiones", (req, res) => {
  res.json(listarConexiones());
});

export default router;
