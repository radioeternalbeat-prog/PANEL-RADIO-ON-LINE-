// Cliente para la API pública "Now Playing" de AzuraCast.
// Cuando el VPS tenga AzuraCast, define estas variables de entorno:
//   AZURACAST_BASE_URL = https://radio.tudominio.com
//   AZURACAST_STATION  = shortcode-de-tu-estacion  (ej. "eternal_beat")
// Con eso el panel muestra "ahora suena", oyentes e historial 100% reales,
// sin que el propio panel tenga que reportar nada.

const TIMEOUT_MS = 6000;

export function azuracastConfigurado() {
  return !!(process.env.AZURACAST_BASE_URL && process.env.AZURACAST_STATION);
}

function limpiar(t) {
  if (!t) return null;
  const s = String(t).trim();
  return s || null;
}

// Normaliza el conteo de oyentes (puede venir como número u objeto).
function contarOyentes(listeners) {
  if (listeners == null) return 0;
  if (typeof listeners === "number") return listeners;
  return Number(listeners.current ?? listeners.total ?? listeners.unique ?? 0) || 0;
}

// Lee el "now playing" real de AzuraCast.
// Devuelve { ok, alAire, oyentes, pico, titulo, artista, artwork, historial:[{titulo,artista,artwork}] }.
export async function leerAzuraCast() {
  const base = String(process.env.AZURACAST_BASE_URL || "").replace(/\/$/, "");
  const estacion = process.env.AZURACAST_STATION;
  if (!base || !estacion) return { ok: false, alAire: false };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${base}/api/nowplaying/${estacion}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return { ok: false, alAire: false };

    let data = await resp.json();
    // El endpoint puede devolver un objeto o un array de estaciones.
    if (Array.isArray(data)) data = data[0];
    if (!data) return { ok: true, alAire: false, oyentes: 0 };

    const np = data.now_playing?.song || {};
    const historial = (data.song_history || [])
      .map((h) => h.song || {})
      .map((s) => ({
        titulo: limpiar(s.title) || limpiar(s.text) || "—",
        artista: limpiar(s.artist),
        artwork: limpiar(s.art),
      }))
      .filter((h) => h.titulo && h.titulo !== "—")
      .slice(0, 10);

    return {
      ok: true,
      alAire: data.is_online !== false,
      oyentes: contarOyentes(data.listeners),
      pico: 0,
      titulo: limpiar(np.title) || limpiar(np.text),
      artista: limpiar(np.artist),
      artwork: limpiar(np.art),
      enVivoDj: !!data.live?.is_live,
      historial,
    };
  } catch {
    return { ok: false, alAire: false };
  } finally {
    clearTimeout(t);
  }
}
