// Cliente HTTP central para la API de PANEL RADIO ONLINE.
// Adjunta automáticamente el token JWT y maneja errores y expiración de sesión.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

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
};
