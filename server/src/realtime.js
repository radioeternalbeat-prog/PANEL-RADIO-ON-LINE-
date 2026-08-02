import { WebSocketServer } from "ws";
import { verificarToken } from "./auth.js";
import { estacionesRepo, historialRepo } from "./db/repos.js";
import { rotacionCanciones, registrarTotalOyentes } from "./live.js";
import { leerEstadoIcecast, esEstacionReal } from "./services/icecast.js";
import { azuracastConfigurado, leerAzuraCast } from "./services/azuracast.js";

// Para estaciones DEMO (sin servidor real) simula la evolución de oyentes y
// la canción en reproducción. Las estaciones REALES se actualizan aparte
// leyendo el servidor Icecast (ver actualizarStatsReales).
function actualizarMetricasSimuladas() {
  const estaciones = estacionesRepo.listar();

  for (const est of estaciones) {
    if (esEstacionReal(est)) continue; // las reales no se simulan
    if (est.estado !== "online") continue;

    const delta = Math.round((Math.random() - 0.45) * 10);
    const oyentes = Math.min(est.oyentesMaximos, Math.max(0, est.oyentesActuales + delta));
    const pico = Math.max(est.picoOyentes, oyentes);

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

// Lee estadísticas REALES del servidor de streaming para cada estación real.
// Prefiere la API de AzuraCast (si está configurada) por dar título/artista/
// historial reales; si no, cae al estado JSON de Icecast (Caster.fm).
async function actualizarStatsReales() {
  const reales = estacionesRepo.listar().filter(esEstacionReal);
  const usarAzura = azuracastConfigurado();

  await Promise.all(
    reales.map(async (est) => {
      const r = usarAzura ? await leerAzuraCast() : await leerEstadoIcecast(est);

      if (r.alAire) {
        // Registra la canción real en el historial (dedupe interno).
        if (r.titulo) {
          historialRepo.agregar({
            estacionId: est.id,
            titulo: r.titulo,
            artista: r.artista || null,
            artwork: r.artwork || null,
          });
        }
        // Texto de "ahora suena": del servidor, o lo último reportado por el panel.
        let cancion = r.titulo ? (r.artista ? `${r.artista} — ${r.titulo}` : r.titulo) : null;
        if (!cancion) {
          const ult = historialRepo.ultimo(est.id);
          if (ult && Date.now() - ult.creado < 10 * 60 * 1000) {
            cancion = ult.artista ? `${ult.artista} — ${ult.titulo}` : ult.titulo;
          } else {
            cancion = "Transmisión en vivo";
          }
        }
        estacionesRepo.aplicarStatsReales(est.id, {
          estado: "online",
          oyentesActuales: r.oyentes || 0,
          picoOyentes: Math.max(est.picoOyentes, r.pico || 0, r.oyentes || 0),
          cancionActual: cancion,
          uptime: r.uptime || est.uptime,
        });
      } else if (r.ok) {
        // El servidor responde pero nadie está emitiendo: fuera del aire.
        estacionesRepo.aplicarStatsReales(est.id, {
          estado: "offline",
          oyentesActuales: 0,
          picoOyentes: est.picoOyentes,
          cancionActual: "—",
          uptime: "—",
        });
      }
      // Si r.ok === false (servidor inaccesible) se conservan los últimos datos.
    })
  );
}

function construirSnapshot() {
  const estaciones = estacionesRepo.listar();
  return {
    tipo: "metricas",
    ts: Date.now(),
    totalOyentes: estaciones.reduce(
      (a, e) => a + (e.estado === "online" ? e.oyentesActuales : 0),
      0
    ),
    enLinea: estaciones.filter((e) => e.estado === "online").length,
    estaciones: estaciones.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      estado: e.estado,
      oyentesActuales: e.oyentesActuales,
      picoOyentes: e.picoOyentes,
      cancionActual: e.cancionActual,
      uptime: e.uptime,
      bitrate: e.bitrate,
      real: esEstacionReal(e),
      enVivo: e.estado === "online",
    })),
  };
}

export function iniciarWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    const payload = token ? verificarToken(token) : null;

    // En producción, rechazar conexiones sin token válido.
    // Las rutas públicas (/api/publico) ya proveen datos para oyentes sin auth.
    if (!payload && process.env.NODE_ENV === "production") {
      socket.close(4001, "Token requerido");
      return;
    }

    socket.usuario = payload?.usuario || "anonimo";
    socket.autenticado = !!payload;

    socket.send(JSON.stringify(construirSnapshot()));
  });

  function difundir() {
    const snapshot = JSON.stringify(construirSnapshot());
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(snapshot);
    }
  }

  // Tick rápido (3s): simula estaciones demo y difunde el snapshot.
  const intervalo = setInterval(() => {
    actualizarMetricasSimuladas();
    difundir();
  }, 3000);

  // Tick real (12s): consulta el servidor Icecast de las estaciones reales.
  // Se ejecuta de inmediato al arrancar para tener datos cuanto antes.
  async function cicloReal() {
    try {
      await actualizarStatsReales();
      const total = estacionesRepo
        .listar()
        .reduce((a, e) => a + (e.estado === "online" ? e.oyentesActuales : 0), 0);
      registrarTotalOyentes(total);
      difundir();
    } catch {
      /* no interrumpe el ciclo */
    }
  }
  cicloReal();
  const intervaloReal = setInterval(cicloReal, 12000);

  wss.on("close", () => {
    clearInterval(intervalo);
    clearInterval(intervaloReal);
  });

  return wss;
}
