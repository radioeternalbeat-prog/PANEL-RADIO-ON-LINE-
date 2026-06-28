// Almacén de datos en memoria para PANEL RADIO ONLINE.
// En producción, esta capa se reemplaza por una base de datos (PostgreSQL/SQLite)
// y por consultas reales al servidor de streaming (Icecast/SHOUTcast).

import bcrypt from "bcryptjs";

// --- Usuarios ---
// Contraseña por defecto: "admin123" (hash generado en arranque para la demo).
export const usuarios = [
  {
    id: 1,
    usuario: "admin",
    nombre: "Administrador",
    rol: "Administrador",
    plan: "Profesional",
    // hash de "admin123"
    claveHash: bcrypt.hashSync("admin123", 10),
  },
];

// --- Estaciones ---
export const estaciones = [
  {
    id: "rock-fm",
    nombre: "Rock FM Online",
    estado: "online",
    servidor: "Icecast 2.4.4",
    montaje: "/rockfm",
    host: "stream.panelradio.online",
    puerto: 8000,
    bitrate: 128,
    formato: "MP3",
    oyentesActuales: 142,
    oyentesMaximos: 250,
    picoOyentes: 198,
    cancionActual: "Queen - Bohemian Rhapsody",
    autodj: true,
    uptime: "5d 12h 34m",
  },
  {
    id: "latino-mix",
    nombre: "Latino Mix",
    estado: "online",
    servidor: "Icecast 2.4.4",
    montaje: "/latinomix",
    host: "stream.panelradio.online",
    puerto: 8010,
    bitrate: 192,
    formato: "AAC",
    oyentesActuales: 87,
    oyentesMaximos: 150,
    picoOyentes: 121,
    cancionActual: "Bad Bunny - Tití Me Preguntó",
    autodj: true,
    uptime: "2d 03h 11m",
  },
  {
    id: "jazz-lounge",
    nombre: "Jazz Lounge",
    estado: "offline",
    servidor: "Icecast 2.4.4",
    montaje: "/jazz",
    host: "stream.panelradio.online",
    puerto: 8020,
    bitrate: 128,
    formato: "MP3",
    oyentesActuales: 0,
    oyentesMaximos: 100,
    picoOyentes: 64,
    cancionActual: "—",
    autodj: false,
    uptime: "—",
  },
];

// Canciones que rotan en el AutoDJ por estación (para simular "ahora suena").
export const rotacionCanciones = {
  "rock-fm": [
    "Queen - Bohemian Rhapsody",
    "Nirvana - Smells Like Teen Spirit",
    "AC/DC - Thunderstruck",
    "Guns N' Roses - Sweet Child O' Mine",
  ],
  "latino-mix": [
    "Bad Bunny - Tití Me Preguntó",
    "Shakira - La Tortura",
    "Luis Fonsi - Despacito",
    "Karol G - Provenza",
  ],
  "jazz-lounge": ["Dave Brubeck - Take Five", "Miles Davis - So What"],
};

export const oyentesPorPais = [
  { pais: "México", oyentes: 78 },
  { pais: "España", oyentes: 52 },
  { pais: "Argentina", oyentes: 41 },
  { pais: "Colombia", oyentes: 33 },
  { pais: "Chile", oyentes: 18 },
  { pais: "Otros", oyentes: 7 },
];

export const anchoBandaPorDia = [
  { dia: "Lun", gb: 42 },
  { dia: "Mar", gb: 38 },
  { dia: "Mié", gb: 51 },
  { dia: "Jue", gb: 47 },
  { dia: "Vie", gb: 63 },
  { dia: "Sáb", gb: 81 },
  { dia: "Dom", gb: 74 },
];

export const biblioteca = [
  { id: 1, titulo: "Bohemian Rhapsody", artista: "Queen", album: "A Night at the Opera", duracion: "5:55", genero: "Rock" },
  { id: 2, titulo: "Tití Me Preguntó", artista: "Bad Bunny", album: "Un Verano Sin Ti", duracion: "4:03", genero: "Reggaetón" },
  { id: 3, titulo: "Billie Jean", artista: "Michael Jackson", album: "Thriller", duracion: "4:54", genero: "Pop" },
  { id: 4, titulo: "Take Five", artista: "Dave Brubeck", album: "Time Out", duracion: "5:24", genero: "Jazz" },
  { id: 5, titulo: "La Tortura", artista: "Shakira", album: "Fijación Oral", duracion: "3:32", genero: "Latino" },
  { id: 6, titulo: "Smells Like Teen Spirit", artista: "Nirvana", album: "Nevermind", duracion: "5:01", genero: "Rock" },
  { id: 7, titulo: "Despacito", artista: "Luis Fonsi", album: "Vida", duracion: "3:48", genero: "Latino" },
  { id: 8, titulo: "So What", artista: "Miles Davis", album: "Kind of Blue", duracion: "9:22", genero: "Jazz" },
];

export const playlists = [
  { id: 1, nombre: "Rotación General", tipo: "General", pistas: 248, activa: true, peso: 70 },
  { id: 2, nombre: "Éxitos del Momento", tipo: "Top", pistas: 35, activa: true, peso: 20 },
  { id: 3, nombre: "Clásicos", tipo: "Especial", pistas: 120, activa: false, peso: 10 },
  { id: 4, nombre: "Jingles e IDs", tipo: "Jingle", pistas: 18, activa: true, peso: 0 },
];

export const programacion = [
  { id: 1, nombre: "Mañanas Activas", inicio: "06:00", fin: "10:00", playlist: "Éxitos del Momento", dias: "L-V" },
  { id: 2, nombre: "Mediodía", inicio: "12:00", fin: "14:00", playlist: "Rotación General", dias: "L-D" },
  { id: 3, nombre: "Noche Clásica", inicio: "22:00", fin: "00:00", playlist: "Clásicos", dias: "V-S" },
];

// Historial de oyentes por hora (se inicializa y se va actualizando en vivo).
export const oyentesPorHora = Array.from({ length: 24 }, (_, h) => {
  const base = 60 + Math.round(80 * Math.sin((h / 24) * Math.PI * 2 - 1.5) + 80);
  return {
    hora: `${String(h).padStart(2, "0")}:00`,
    oyentes: Math.max(5, base),
  };
});

let siguienteIdEstacion = 100;
export function nuevoIdEstacion() {
  return `estacion-${siguienteIdEstacion++}`;
}

// --- Gestión de pistas de la biblioteca ---
let siguienteIdPista = 1000;

// Convierte milisegundos a "m:ss".
export function msADuracion(ms) {
  if (!ms || Number.isNaN(ms)) return "0:00";
  const total = Math.round(ms / 1000);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, "0")}`;
}

// Agrega una pista a la biblioteca evitando duplicados por itunesId (si aplica).
// Devuelve la pista agregada, o null si ya existía.
export function agregarPista(datos) {
  if (datos.itunesId) {
    const yaExiste = biblioteca.some((t) => t.itunesId === datos.itunesId);
    if (yaExiste) return null;
  }
  const pista = {
    id: siguienteIdPista++,
    titulo: datos.titulo || "Desconocido",
    artista: datos.artista || "Desconocido",
    album: datos.album || "",
    duracion: datos.duracion || "0:00",
    genero: datos.genero || "Sin género",
    fuente: datos.fuente || "manual", // itunes | xml | manual
    artwork: datos.artwork || null,
    previewUrl: datos.previewUrl || null,
    itunesId: datos.itunesId || null,
    ruta: datos.ruta || null, // ruta del archivo local (import XML)
  };
  biblioteca.push(pista);
  return pista;
}

// Agrega varias pistas; devuelve { agregadas, omitidas }.
export function agregarPistas(lista = []) {
  const agregadas = [];
  let omitidas = 0;
  for (const d of lista) {
    const p = agregarPista(d);
    if (p) agregadas.push(p);
    else omitidas++;
  }
  return { agregadas, omitidas };
}
