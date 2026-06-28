// Datos simulados para PANEL RADIO ONLINE
// Reemplazar por llamadas reales a la API (Icecast/SHOUTcast) en el futuro.

export const cuenta = {
  usuario: "admin",
  nombre: "Administrador",
  plan: "Profesional",
  rol: "Administrador",
};

export const estaciones = [
  {
    id: "rock-fm",
    nombre: "Rock FM Online",
    estado: "online", // online | offline | error
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

// Serie de oyentes por hora (últimas 24h)
export const oyentesPorHora = Array.from({ length: 24 }, (_, h) => {
  const base = 60 + Math.round(80 * Math.sin((h / 24) * Math.PI * 2 - 1.5) + 80);
  return {
    hora: `${String(h).padStart(2, "0")}:00`,
    oyentes: Math.max(5, base + Math.round((Math.random() - 0.5) * 30)),
  };
});

// Oyentes por país
export const oyentesPorPais = [
  { pais: "México", oyentes: 78 },
  { pais: "España", oyentes: 52 },
  { pais: "Argentina", oyentes: 41 },
  { pais: "Colombia", oyentes: 33 },
  { pais: "Chile", oyentes: 18 },
  { pais: "Otros", oyentes: 7 },
];

// Datos de ancho de banda por día (GB)
export const anchoBandaPorDia = [
  { dia: "Lun", gb: 42 },
  { dia: "Mar", gb: 38 },
  { dia: "Mié", gb: 51 },
  { dia: "Jue", gb: 47 },
  { dia: "Vie", gb: 63 },
  { dia: "Sáb", gb: 81 },
  { dia: "Dom", gb: 74 },
];

// Biblioteca de música del AutoDJ
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

// Playlists
export const playlists = [
  { id: 1, nombre: "Rotación General", tipo: "General", pistas: 248, activa: true, peso: 70 },
  { id: 2, nombre: "Éxitos del Momento", tipo: "Top", pistas: 35, activa: true, peso: 20 },
  { id: 3, nombre: "Clásicos", tipo: "Especial", pistas: 120, activa: false, peso: 10 },
  { id: 4, nombre: "Jingles e IDs", tipo: "Jingle", pistas: 18, activa: true, peso: 0 },
];

// Programación de horarios
export const programacion = [
  { id: 1, nombre: "Mañanas Activas", inicio: "06:00", fin: "10:00", playlist: "Éxitos del Momento", dias: "L-V" },
  { id: 2, nombre: "Mediodía", inicio: "12:00", fin: "14:00", playlist: "Rotación General", dias: "L-D" },
  { id: 3, nombre: "Noche Clásica", inicio: "22:00", fin: "00:00", playlist: "Clásicos", dias: "V-S" },
];

export const formatosSoportados = ["MP3", "AAC", "AAC+", "Ogg Vorbis", "Opus"];
export const bitratesSoportados = [64, 96, 128, 192, 256, 320];
