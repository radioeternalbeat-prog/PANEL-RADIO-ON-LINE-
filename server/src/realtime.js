import { WebSocketServer } from "ws";
import { verificarToken } from "./auth.js";
import { estacionesRepo } from "./db/repos.js";
import { rotacionCanciones, registrarTotalOyentes } from "./live.js";

// Simula la evolución de oyentes y la canción en reproducción, y la persiste en la BD.
// En producción, estos datos vendrían de la API de estadísticas de Icecast/SHOUTcast.
function actualizarMetricas() {
  const estaciones = estacionesRepo.listar();

  for (const est of estaciones) {
    if (est.estado !== "online") continue;

    const delta = Math.round((Math.random() - 0.45) * 10);
    let oyentes = Math.min(est.oyentesMaximos, Math.max(0, est.oyentesActuales + delta));
    let pico = Math.max(est.picoOyentes, oyentes);

    let cancion = est.cancionActual;
    if (est.autodj && Math.random() < 0.25) {
      const lista = rotacionCanciones[est.id];
      if (lista && lista.length) {
        cancion = lista[Math.floor(Math.random() * lista.length)];
      }
    }

    estacionesRepo.actualizarMetricas(est.id, {
      oyentesActuales: oyentes,
      picoOyentes: pico,
      cancionActual: cancion,
    });
  }

  const total = estacionesRepo
    .listar()
    .reduce((a, e) => a + (e.estado === "online" ? e.oyentesActuales : 0), 0);
  registrarTotalOyentes(total);
}

function construirSnapshot() {
  const estaciones = estacionesRepo.listar();
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
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    const payload = token ? verificarToken(token) : null;
    socket.usuario = payload?.usuario || "anonimo";

    socket.send(JSON.stringify(construirSnapshot()));
  });

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
