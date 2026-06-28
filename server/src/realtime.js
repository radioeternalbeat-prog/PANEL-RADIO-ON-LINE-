import { WebSocketServer } from "ws";
import { verificarToken } from "./auth.js";
import {
  estaciones,
  oyentesPorHora,
  rotacionCanciones,
} from "./data/store.js";

// Simula la evolución de oyentes y la canción en reproducción.
// En producción, estos datos vendrían de la API de estadísticas de Icecast/SHOUTcast.
function actualizarMetricas() {
  for (const est of estaciones) {
    if (est.estado !== "online") {
      est.oyentesActuales = 0;
      continue;
    }

    // Variación aleatoria suave de oyentes (±5), dentro de límites.
    const delta = Math.round((Math.random() - 0.45) * 10);
    est.oyentesActuales = Math.min(
      est.oyentesMaximos,
      Math.max(0, est.oyentesActuales + delta)
    );
    if (est.oyentesActuales > est.picoOyentes) {
      est.picoOyentes = est.oyentesActuales;
    }

    // Cambiar de canción de vez en cuando.
    if (est.autodj && Math.random() < 0.25) {
      const lista = rotacionCanciones[est.id];
      if (lista && lista.length) {
        est.cancionActual = lista[Math.floor(Math.random() * lista.length)];
      }
    }
  }

  // Actualizar el bucket de la hora actual con el total de oyentes.
  const horaActual = `${String(new Date().getHours()).padStart(2, "0")}:00`;
  const bucket = oyentesPorHora.find((h) => h.hora === horaActual);
  const total = estaciones.reduce((a, e) => a + e.oyentesActuales, 0);
  if (bucket) bucket.oyentes = total;
}

function construirSnapshot() {
  return {
    tipo: "metricas",
    ts: Date.now(),
    totalOyentes: estaciones.reduce((a, e) => a + e.oyentesActuales, 0),
    enLinea: estaciones.filter((e) => e.estado === "online").length,
    estaciones: estaciones.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      estado: e.estado,
      oyentesActuales: e.oyentesActuales,
      picoOyentes: e.picoOyentes,
      cancionActual: e.cancionActual,
    })),
  };
}

export function iniciarWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    // Autenticación opcional por token en query (?token=...).
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    const payload = token ? verificarToken(token) : null;

    socket.usuario = payload?.usuario || "anonimo";

    // Enviar snapshot inicial inmediatamente.
    socket.send(JSON.stringify(construirSnapshot()));
  });

  // Cada 3 segundos: actualizar métricas y difundir a todos los clientes.
  const intervalo = setInterval(() => {
    actualizarMetricas();
    const snapshot = JSON.stringify(construirSnapshot());
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(snapshot);
      }
    }
  }, 3000);

  wss.on("close", () => clearInterval(intervalo));

  return wss;
}
