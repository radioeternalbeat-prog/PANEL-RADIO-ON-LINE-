// Cliente HTTP central para la API de PANEL RADIO ONLINE.
// Adjunta automáticamente el token JWT y maneja errores y expiración de sesión.

// URL base de la API.
// - En desarrollo, usa VITE_API_URL (p. ej. http://localhost:4000/api).
// - En producción (frontend servido por el backend), usa el mismo origen: /api.
function resolverApiUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== "undefined") return `${window.location.origin}/api`;
  return "http://localhost:4000/api";
}

const API_URL = resolverApiUrl();

const TOKEN_KEY = "pro_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Callback que se dispara cuando el token expira (lo configura el AuthContext).
let onSesionExpirada = null;
export function configurarSesionExpirada(cb) {
  onSesionExpirada = cb;
}

async function request(ruta, { metodo = "GET", cuerpo, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. ¿Está activo el backend?");
  }

  if (respuesta.status === 401 && auth) {
    setToken(null);
    if (onSesionExpirada) onSesionExpirada();
    throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "Ocurrió un error en la solicitud.");
  }
  return datos;
}

export const api = {
  // Auth
  login: (usuario, clave) =>
    request("/auth/login", { metodo: "POST", cuerpo: { usuario, clave }, auth: false }),
  perfil: () => request("/auth/perfil"),

  // Estaciones
  estaciones: () => request("/estaciones"),
  estacion: (id) => request(`/estaciones/${id}`),
  crearEstacion: (datos) => request("/estaciones", { metodo: "POST", cuerpo: datos }),
  actualizarEstacion: (id, datos) => request(`/estaciones/${id}`, { metodo: "PUT", cuerpo: datos }),
  eliminarEstacion: (id) => request(`/estaciones/${id}`, { metodo: "DELETE" }),
  iniciarEstacion: (id) => request(`/estaciones/${id}/iniciar`, { metodo: "POST" }),
  detenerEstacion: (id) => request(`/estaciones/${id}/detener`, { metodo: "POST" }),

  // Estadísticas
  resumen: () => request("/estadisticas/resumen"),
  oyentesPorHora: () => request("/estadisticas/oyentes-por-hora"),
  oyentesPorPais: () => request("/estadisticas/oyentes-por-pais"),
  anchoBanda: () => request("/estadisticas/ancho-banda"),

  // AutoDJ
  biblioteca: (busqueda = "") =>
    request(`/autodj/biblioteca${busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : ""}`),
  eliminarPista: (id) => request(`/autodj/biblioteca/${id}`, { metodo: "DELETE" }),
  playlists: () => request("/autodj/playlists"),
  programacion: () => request("/autodj/programacion"),

  // iTunes
  buscarItunes: (termino, limite = 25) =>
    request(`/itunes/buscar?termino=${encodeURIComponent(termino)}&limite=${limite}`),
  importarItunes: (pistas) => request("/itunes/importar", { metodo: "POST", cuerpo: { pistas } }),
  importarLibraryXml: (xml) => request("/itunes/importar-xml", { metodo: "POST", cuerpo: { xml } }),

  // Mensajes (WhatsApp / oyentes)
  mensajes: () => request("/mensajes"),
  agregarMensaje: (datos) => request("/mensajes", { metodo: "POST", cuerpo: datos }),
  estadoMensaje: (id, estado) => request(`/mensajes/${id}`, { metodo: "PATCH", cuerpo: { estado } }),
  eliminarMensaje: (id) => request(`/mensajes/${id}`, { metodo: "DELETE" }),

  // Samples / soundboard
  samples: () => request("/samples"),
  eliminarSample: (id) => request(`/samples/${id}`, { metodo: "DELETE" }),
  // La subida usa multipart, se hace con un helper aparte.

  // Mapeos MIDI (perfiles de controlador por usuario)
  midiMapeos: () => request("/midi/mapeos"),
  midiMapeoActivo: () => request("/midi/mapeos/activo"),
  crearMidiMapeo: (datos) => request("/midi/mapeos", { metodo: "POST", cuerpo: datos }),
  actualizarMidiMapeo: (id, datos) => request(`/midi/mapeos/${id}`, { metodo: "PUT", cuerpo: datos }),
  activarMidiMapeo: (id) => request(`/midi/mapeos/${id}/activar`, { metodo: "POST" }),
  eliminarMidiMapeo: (id) => request(`/midi/mapeos/${id}`, { metodo: "DELETE" }),
};

// Sube un sample (audio) vía multipart/form-data.
export async function subirSample({ archivo, nombre, categoria, color }) {
  const fd = new FormData();
  fd.append("archivo", archivo);
  if (nombre) fd.append("nombre", nombre);
  if (categoria) fd.append("categoria", categoria);
  if (color) fd.append("color", color);

  const token = getToken();
  const resp = await fetch(`${API_URL}/samples`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(datos.mensaje || "No se pudo subir el sample.");
  return datos;
}

// URL absoluta para un recurso servido por el backend (ej. /uploads/..).
export function urlRecurso(ruta) {
  if (!ruta) return ruta;
  if (/^https?:\/\//.test(ruta)) return ruta;
  const base = API_URL.replace(/\/api$/, "");
  return `${base}${ruta}`;
}
