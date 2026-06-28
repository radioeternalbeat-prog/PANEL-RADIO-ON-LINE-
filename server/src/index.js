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
import { iniciarWebSocket } from "./realtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
// Límite alto para permitir la importación de iTunes Library.xml (puede pesar varios MB).
app.use(express.json({ limit: "50mb" }));

// Salud del servicio (público)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, servicio: "PANEL RADIO ONLINE API", ts: Date.now() });
});

// Autenticación (público)
app.use("/api/auth", authRoutes);

// Rutas protegidas (requieren token JWT)
app.use("/api/estaciones", requiereAuth, estacionesRoutes);
app.use("/api/estadisticas", requiereAuth, estadisticasRoutes);
app.use("/api/autodj", requiereAuth, autodjRoutes);
app.use("/api/itunes", requiereAuth, itunesRoutes);

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
