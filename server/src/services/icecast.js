// Cliente para leer estadísticas públicas de un servidor Icecast (status-json.xsl).
// Caster.fm expone este endpoint sin autenticación, así obtenemos oyentes,
// pico, "ahora suena" y si la fuente está al aire — datos REALES.

const TIMEOUT_MS = 6000;

// Una estación es "real" si tiene una URL de stream y host/puerto configurados.
export function esEstacionReal(est) {
  return !!(est && est.streamUrl && est.host && est.puerto);
}

// Limpia títulos vacíos o de relleno ("- ", "Unspecified", etc.).
function limpiarTitulo(t) {
  if (!t) return null;
  const s = String(t).trim();
  if (!s || s === "-" || s.replace(/-/g, "").trim() === "") return null;
  if (/^unspecified/i.test(s)) return null;
  return s;
}

// Construye la URL del status JSON derivando el protocolo del streamUrl.
function urlEstado(est) {
  let proto = "https";
  try {
    if (est.streamUrl) proto = new URL(est.streamUrl).protocol.replace(":", "");
  } catch {
    /* usa https por defecto */
  }
  return `${proto}://${est.host}:${est.puerto}/status-json.xsl`;
}

// Formatea una duración (ms) como "Xd Yh Zm".
function formatearUptime(ms) {
  if (!ms || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return `${d}d ${h}h ${m}m`;
}

// Lee el estado real del servidor para una estación.
// Devuelve { ok, alAire, oyentes, pico, titulo, bitrate, uptime }.
export async function leerEstadoIcecast(est) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(urlEstado(est), {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return { ok: false, alAire: false };

    const data = await resp.json();
    let fuentes = data?.icestats?.source;
    if (!fuentes) {
      // Servidor responde pero no hay nadie emitiendo.
      return { ok: true, alAire: false, oyentes: 0, pico: 0, titulo: null };
    }
    if (!Array.isArray(fuentes)) fuentes = [fuentes];

    // Encuentra la fuente del montaje de esta estación (o la primera).
    const mount = est.montaje || "";
    const f =
      fuentes.find((s) => String(s.listenurl || "").endsWith(mount)) || fuentes[0];
    if (!f) return { ok: true, alAire: false, oyentes: 0, pico: 0, titulo: null };

    // Uptime desde el inicio del stream.
    let uptime = "—";
    const inicio = f.stream_start_iso8601 || f.stream_start;
    if (inicio) {
      const ms = Date.now() - new Date(inicio).getTime();
      uptime = formatearUptime(ms);
    }

    return {
      ok: true,
      alAire: true,
      oyentes: Number(f.listeners) || 0,
      pico: Number(f.listener_peak) || 0,
      titulo: limpiarTitulo(f.title || f["display-title"] || f?.metadata?.x_icy_title),
      bitrate: Number(f.bitrate) || est.bitrate,
      uptime,
    };
  } catch {
    // Timeout, red caída o servidor inaccesible.
    return { ok: false, alAire: false };
  } finally {
    clearTimeout(t);
  }
}
