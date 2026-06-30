import "dotenv/config";
import http from "http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";

import { requiereAuth } from "./auth.js";
import authRoutes from "./routes/auth.routes.js";
import estacionesRoutes from "./routes/estaciones.routes.js";
import estadisticasRoutes from "./routes/estadisticas.routes.js";
import autodjRoutes from "./routes/autodj.routes.js";
import itunesRoutes from "./routes/itunes.routes.js";
import samplesRoutes, { UPLOADS_DIR } from "./routes/samples.routes.js";
import mensajesRoutes from "./routes/mensajes.routes.js";
import { mensajesRepo } from "./db/repos.js";
import { iniciarWebSocket } from "./realtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// Marcador de versión para verificar qué build está desplegado.
const VERSION = "1.3.0-caster-stream-real-2026-06";

// CORS restringible en producción: define CORS_ORIGIN=https://tu-dominio (separa varios con coma).
const origenesPermitidos = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : null;
app.use(cors(origenesPermitidos ? { origin: origenesPermitidos } : {}));
// Límite alto para permitir la importación de iTunes Library.xml (puede pesar varios MB).
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Salud del servicio (público)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, servicio: "PANEL RADIO ONLINE API", version: VERSION, ts: Date.now() });
});

// Archivos de audio subidos (samples) — públicos para que <audio> los pueda cargar.
app.use("/uploads", express.static(UPLOADS_DIR));

// Webhook público para recibir mensajes de WhatsApp (Twilio / Meta Cloud API).
// Configura la URL de tu proveedor apuntando aquí. Acepta formatos comunes.
app.post("/api/webhooks/whatsapp", (req, res) => {
  // Protección opcional: si defines WEBHOOK_TOKEN, exige ?token=... en la URL.
  const requerido = process.env.WEBHOOK_TOKEN;
  if (requerido && req.query.token !== requerido) {
    return res.status(401).json({ mensaje: "Token de webhook inválido." });
  }
  const b = req.body || {};
  // Twilio: Body, From, ProfileName | Meta/genérico: text/message, from, name
  const texto = b.Body || b.text || b.message || b.mensaje;
  const telefono = b.From || b.from || b.wa_id || null;
  const autor = b.ProfileName || b.name || b.autor || "WhatsApp";
  if (!texto) return res.status(400).json({ mensaje: "Sin texto en el webhook." });
  const creado = mensajesRepo.agregar({ autor, telefono, texto, origen: "whatsapp" });
  res.status(201).json({ ok: true, id: creado.id });
});

// Autenticación (público)
app.use("/api/auth", authRoutes);

// Rutas protegidas (requieren token JWT)
app.use("/api/estaciones", requiereAuth, estacionesRoutes);
app.use("/api/estadisticas", requiereAuth, estadisticasRoutes);
app.use("/api/autodj", requiereAuth, autodjRoutes);
app.use("/api/itunes", requiereAuth, itunesRoutes);
app.use("/api/samples", requiereAuth, samplesRoutes);
app.use("/api/mensajes", requiereAuth, mensajesRoutes);

// 404 para rutas de API no encontradas
app.use("/api", (req, res) => {
  res.status(404).json({ mensaje: "Recurso no encontrado." });
});

// --- Servir el frontend compilado (producción) ---
// Si existe la carpeta dist (resultado de `npm run build` del frontend),
// el backend la sirve y entrega index.html para las rutas del SPA.
const distDir = path.resolve(__dirname, "../../dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
  console.log("🌐 Sirviendo frontend desde", distDir);
}

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ mensaje: "Error interno del servidor." });
});

const server = http.createServer(app);
iniciarWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 PANEL RADIO ONLINE escuchando en http://localhost:${PORT}`);
  console.log(`📡 WebSocket de estadísticas en ws://localhost:${PORT}/ws`);
});
