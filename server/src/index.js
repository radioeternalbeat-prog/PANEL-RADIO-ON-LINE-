import "dotenv/config";
import http from "http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";

import { requiereAuth, verificarToken } from "./auth.js";
import { requiereLicencia, requiereSuperadmin, infoLicencia } from "./licenciaMiddleware.js";
import authRoutes from "./routes/auth.routes.js";
import tenantAuthRoutes from "./routes/tenantAuth.routes.js";
import licenciasRoutes from "./routes/licencias.routes.js";
import mercadopagoRoutes from "./routes/mercadopago.routes.js";
import estacionesRoutes from "./routes/estaciones.routes.js";
import estadisticasRoutes from "./routes/estadisticas.routes.js";
import autodjRoutes from "./routes/autodj.routes.js";
import itunesRoutes from "./routes/itunes.routes.js";
import samplesRoutes, { UPLOADS_DIR } from "./routes/samples.routes.js";
import mensajesRoutes from "./routes/mensajes.routes.js";
import midiRoutes from "./routes/midi.routes.js";
import backupRoutes from "./routes/backup.routes.js";
import publicoRoutes from "./routes/publico.routes.js";
import ahoraRoutes from "./routes/ahora.routes.js";
import streamingRoutes from "./routes/streaming.routes.js";
import { mensajesRepo } from "./db/repos.js";
import { planesRepo } from "./db/licencias.js";
import { iniciarWebSocket } from "./realtime.js";
import { iniciarStreamingWs } from "./streamingWs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// Marcador de versión para verificar qué build está desplegado.
const VERSION = "2.0.0-licencias-multitenant-2026-08";

// CORS restringible en producción: define CORS_ORIGIN=https://tu-dominio (separa varios con coma).
// Si no se define, en producción solo permite el mismo origen; en desarrollo permite todos.
const origenesPermitidos = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : null;

const corsOptions = origenesPermitidos
  ? { origin: origenesPermitidos, credentials: true }
  : process.env.NODE_ENV === "production"
    ? { origin: false } // Bloquea cross-origin en producción si no se configura
    : {}; // Permite todo en desarrollo
app.use(cors(corsOptions));
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

// Autenticación de tenants / clientes (público: registro y login)
app.use("/api/tenant", tenantAuthRoutes);

// Licencias: planes públicos (accesible sin token para la página de precios)
app.get("/api/licencias/planes", (req, res) => {
  res.json(planesRepo.listar());
});

// Licencias: gestión de clientes y planes (requiere auth)
app.use("/api/licencias", requiereAuth, licenciasRoutes);

// Pagos con Mercado Pago (webhook es público, crear preferencia requiere auth)
app.use("/api/pagos", mercadopagoRoutes);

// Rutas protegidas (requieren token JWT + licencia activa o trial)
app.use("/api/estaciones", requiereAuth, requiereLicencia, infoLicencia, estacionesRoutes);
app.use("/api/estadisticas", requiereAuth, requiereLicencia, infoLicencia, estadisticasRoutes);
app.use("/api/autodj", requiereAuth, requiereLicencia, infoLicencia, autodjRoutes);
app.use("/api/itunes", requiereAuth, requiereLicencia, infoLicencia, itunesRoutes);
app.use("/api/samples", requiereAuth, requiereLicencia, infoLicencia, samplesRoutes);
// Rutas públicas (sin autenticación): página de radio para oyentes.
app.use("/api/publico", publicoRoutes);

app.use("/api/mensajes", requiereAuth, requiereLicencia, mensajesRoutes);
app.use("/api/midi", requiereAuth, requiereLicencia, midiRoutes);
app.use("/api/backup", requiereAuth, requiereSuperadmin, backupRoutes);
app.use("/api/ahora-suena", requiereAuth, requiereLicencia, ahoraRoutes);
app.use("/api/streaming", requiereAuth, requiereLicencia, streamingRoutes);

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
  app.get(/^(?!\/api|\/ws).*/, (req, res) => {
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
const wssMetricas = iniciarWebSocket(server);
const wssStreaming = iniciarStreamingWs(server);

// Manejar upgrade HTTP → WebSocket centralmente para evitar conflictos
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname === "/ws-stream") {
    // Streaming de audio — verificar auth y estacionId
    const token = url.searchParams.get("token");
    const estacionId = url.searchParams.get("estacionId");

    const payload = token ? verificarToken(token) : null;
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    if (!estacionId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    wssStreaming.handleUpgrade(request, socket, head, (ws) => {
      ws.estacionId = estacionId;
      ws.usuario = payload.usuario;
      wssStreaming.emit("connection", ws, request);
    });
  } else if (url.pathname === "/ws") {
    // Métricas en tiempo real
    wssMetricas.handleUpgrade(request, socket, head, (ws) => {
      wssMetricas.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`🚀 PANEL RADIO ONLINE escuchando en http://localhost:${PORT}`);
  console.log(`📡 WebSocket de estadísticas en ws://localhost:${PORT}/ws`);
  console.log(`🎵 WebSocket de streaming en ws://localhost:${PORT}/ws-stream`);
});
