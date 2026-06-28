import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";

import { requiereAuth } from "./auth.js";
import authRoutes from "./routes/auth.routes.js";
import estacionesRoutes from "./routes/estaciones.routes.js";
import estadisticasRoutes from "./routes/estadisticas.routes.js";
import autodjRoutes from "./routes/autodj.routes.js";
import itunesRoutes from "./routes/itunes.routes.js";
import { iniciarWebSocket } from "./realtime.js";

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

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ mensaje: "Recurso no encontrado." });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ mensaje: "Error interno del servidor." });
});

const server = http.createServer(app);
iniciarWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 API PANEL RADIO ONLINE escuchando en http://localhost:${PORT}`);
  console.log(`📡 WebSocket de estadísticas en ws://localhost:${PORT}/ws`);
});
