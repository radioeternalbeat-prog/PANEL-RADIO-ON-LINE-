// Capa de base de datos con SQLite integrado de Node (node:sqlite).
// Crea el esquema y siembra datos iniciales la primera vez.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ubicación del archivo de base de datos (configurable por entorno).
const DB_PATH = process.env.DB_PATH || resolve(__dirname, "../../data/panel.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

function crearEsquema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL,
      plan TEXT NOT NULL,
      clave_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estaciones (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'offline',
      servidor TEXT,
      montaje TEXT,
      host TEXT,
      puerto INTEGER,
      bitrate INTEGER,
      formato TEXT,
      stream_url TEXT,
      embed_token TEXT,
      embed_canal TEXT,
      oyentes_actuales INTEGER DEFAULT 0,
      oyentes_maximos INTEGER DEFAULT 100,
      pico_oyentes INTEGER DEFAULT 0,
      cancion_actual TEXT DEFAULT '—',
      autodj INTEGER DEFAULT 0,
      uptime TEXT DEFAULT '—'
    );

    CREATE TABLE IF NOT EXISTS pistas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      artista TEXT,
      album TEXT,
      duracion TEXT,
      genero TEXT,
      fuente TEXT DEFAULT 'manual',
      artwork TEXT,
      preview_url TEXT,
      itunes_id INTEGER,
      ruta TEXT,
      bpm REAL,
      tonalidad TEXT,
      rating INTEGER,
      rekordbox_id TEXT
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT,
      pistas INTEGER DEFAULT 0,
      activa INTEGER DEFAULT 1,
      peso INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS programacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      inicio TEXT,
      fin TEXT,
      playlist TEXT,
      dias TEXT
    );

    CREATE TABLE IF NOT EXISTS oyentes_pais (
      pais TEXT PRIMARY KEY,
      oyentes INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ancho_banda (
      dia TEXT PRIMARY KEY,
      orden INTEGER,
      gb INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria TEXT DEFAULT 'efecto',
      slot INTEGER DEFAULT 0,
      archivo TEXT NOT NULL,
      url TEXT NOT NULL,
      color TEXT,
      creado INTEGER
    );

    CREATE TABLE IF NOT EXISTS mensajes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autor TEXT,
      telefono TEXT,
      texto TEXT NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      origen TEXT DEFAULT 'manual',
      creado INTEGER
    );

    CREATE TABLE IF NOT EXISTS playlist_pistas (
      playlist_id INTEGER NOT NULL,
      pista_id INTEGER NOT NULL,
      creado INTEGER,
      PRIMARY KEY (playlist_id, pista_id)
    );

    CREATE TABLE IF NOT EXISTS inserciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT DEFAULT 'jingle',
      playlist_id INTEGER,
      cada_min INTEGER DEFAULT 30,
      activa INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estacion_id TEXT,
      titulo TEXT,
      artista TEXT,
      artwork TEXT,
      creado INTEGER
    );

    -- Mapeos MIDI: cada usuario puede guardar varios perfiles (uno por
    -- controlador físico) y activar el que esté usando en cada momento.
    CREATE TABLE IF NOT EXISTS midi_mapeos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      dispositivo TEXT,
      mapeo TEXT NOT NULL DEFAULT '[]',
      activo INTEGER DEFAULT 0,
      creado INTEGER,
      actualizado INTEGER,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_midi_mapeos_usuario ON midi_mapeos(usuario_id);
  `);
}

function vacia(tabla) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get().n === 0;
}

function sembrar() {
  // Usuario administrador por defecto (configurable por entorno).
  if (vacia("usuarios")) {
    const adminUser = process.env.ADMIN_USER || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    db.prepare(
      `INSERT INTO usuarios (usuario, nombre, rol, plan, clave_hash)
       VALUES (?, ?, ?, ?, ?)`
    ).run(adminUser, "Administrador", "Administrador", "Profesional", bcrypt.hashSync(adminPass, 10));
  }

  if (vacia("estaciones")) {
    const ins = db.prepare(`
      INSERT INTO estaciones
        (id, nombre, estado, servidor, montaje, host, puerto, bitrate, formato, stream_url, embed_token, embed_canal,
         oyentes_actuales, oyentes_maximos, pico_oyentes, cancion_actual, autodj, uptime)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    const filas = [
      ["eternal-beat", "Eternal Beat", "online", "Caster.fm (Icecast 2.5)", "/D6md9", "sapircast.caster.fm", 13721, 96, "MP3", "https://sapircast.caster.fm:13721/D6md9", "54a0c09f-f333-4ef2-b6d4-342e9c5e744c", "a224c145-3acb-4070-a588-9f0d2b554247", 0, 400, 0, "—", 1, "0d 0h 1m"],
      ["rock-fm", "Rock FM Online", "online", "Icecast 2.4.4", "/rockfm", "stream.panelradio.online", 8000, 128, "MP3", null, null, null, 142, 250, 198, "Queen - Bohemian Rhapsody", 1, "5d 12h 34m"],
      ["latino-mix", "Latino Mix", "online", "Icecast 2.4.4", "/latinomix", "stream.panelradio.online", 8010, 192, "AAC", null, null, null, 87, 150, 121, "Bad Bunny - Tití Me Preguntó", 1, "2d 03h 11m"],
      ["jazz-lounge", "Jazz Lounge", "offline", "Icecast 2.4.4", "/jazz", "stream.panelradio.online", 8020, 128, "MP3", null, null, null, 0, 100, 64, "—", 0, "—"],
    ];
    for (const f of filas) ins.run(...f);
  }

  if (vacia("pistas")) {
    const ins = db.prepare(`
      INSERT INTO pistas (titulo, artista, album, duracion, genero, fuente)
      VALUES (?,?,?,?,?,?)
    `);
    const filas = [
      ["Bohemian Rhapsody", "Queen", "A Night at the Opera", "5:55", "Rock", "manual"],
      ["Tití Me Preguntó", "Bad Bunny", "Un Verano Sin Ti", "4:03", "Reggaetón", "manual"],
      ["Billie Jean", "Michael Jackson", "Thriller", "4:54", "Pop", "manual"],
      ["Take Five", "Dave Brubeck", "Time Out", "5:24", "Jazz", "manual"],
      ["La Tortura", "Shakira", "Fijación Oral", "3:32", "Latino", "manual"],
      ["Smells Like Teen Spirit", "Nirvana", "Nevermind", "5:01", "Rock", "manual"],
      ["Despacito", "Luis Fonsi", "Vida", "3:48", "Latino", "manual"],
      ["So What", "Miles Davis", "Kind of Blue", "9:22", "Jazz", "manual"],
    ];
    for (const f of filas) ins.run(...f);
  }

  if (vacia("playlists")) {
    const ins = db.prepare(`INSERT INTO playlists (nombre, tipo, pistas, activa, peso) VALUES (?,?,?,?,?)`);
    const filas = [
      ["Rotación General", "General", 248, 1, 70],
      ["Éxitos del Momento", "Top", 35, 1, 20],
      ["Clásicos", "Especial", 120, 0, 10],
      ["Jingles e IDs", "Jingle", 18, 1, 0],
    ];
    for (const f of filas) ins.run(...f);
  }

  if (vacia("programacion")) {
    const ins = db.prepare(`INSERT INTO programacion (nombre, inicio, fin, playlist, dias) VALUES (?,?,?,?,?)`);
    const filas = [
      ["Mañanas Activas", "06:00", "10:00", "Éxitos del Momento", "L-V"],
      ["Mediodía", "12:00", "14:00", "Rotación General", "L-D"],
      ["Noche Clásica", "22:00", "00:00", "Clásicos", "V-S"],
    ];
    for (const f of filas) ins.run(...f);
  }

  if (vacia("oyentes_pais")) {
    const ins = db.prepare(`INSERT INTO oyentes_pais (pais, oyentes) VALUES (?,?)`);
    for (const f of [["México", 78], ["España", 52], ["Argentina", 41], ["Colombia", 33], ["Chile", 18], ["Otros", 7]]) ins.run(...f);
  }

  if (vacia("ancho_banda")) {
    const ins = db.prepare(`INSERT INTO ancho_banda (dia, orden, gb) VALUES (?,?,?)`);
    const dias = [["Lun", 42], ["Mar", 38], ["Mié", 51], ["Jue", 47], ["Vie", 63], ["Sáb", 81], ["Dom", 74]];
    dias.forEach(([dia, gb], i) => ins.run(dia, i, gb));
  }
}

crearEsquema();
// Migración: agrega la columna 'slot' a samples si la BD es de una versión anterior.
try {
  db.exec("ALTER TABLE samples ADD COLUMN slot INTEGER DEFAULT 0");
} catch {
  /* la columna ya existe */
}
// Migración: vincula la programación a una playlist real (playlist_id).
try {
  db.exec("ALTER TABLE programacion ADD COLUMN playlist_id INTEGER");
} catch {
  /* la columna ya existe */
}
// Migración: URL pública del stream por estación.
try {
  db.exec("ALTER TABLE estaciones ADD COLUMN stream_url TEXT");
} catch {
  /* la columna ya existe */
}
// Migración: reproductor embebible (Caster.fm): token público y canal.
try {
  db.exec("ALTER TABLE estaciones ADD COLUMN embed_token TEXT");
} catch {
  /* la columna ya existe */
}
try {
  db.exec("ALTER TABLE estaciones ADD COLUMN embed_canal TEXT");
} catch {
  /* la columna ya existe */
}
// Migración: metadatos de Rekordbox (BPM, tonalidad, rating, id de pista).
for (const ddl of [
  "ALTER TABLE pistas ADD COLUMN bpm REAL",
  "ALTER TABLE pistas ADD COLUMN tonalidad TEXT",
  "ALTER TABLE pistas ADD COLUMN rating INTEGER",
  "ALTER TABLE pistas ADD COLUMN rekordbox_id TEXT",
]) {
  try {
    db.exec(ddl);
  } catch {
    /* la columna ya existe */
  }
}
sembrar();

// Tras sembrar: enlaza bloques de programación existentes con su playlist por nombre.
try {
  db.exec(`
    UPDATE programacion
    SET playlist_id = (SELECT id FROM playlists WHERE playlists.nombre = programacion.playlist)
    WHERE playlist_id IS NULL
      AND EXISTS (SELECT 1 FROM playlists WHERE playlists.nombre = programacion.playlist);
  `);
} catch {
  /* sin cambios */
}

// Garantiza que exista una playlist por nombre y devuelve su id (idempotente).
function asegurarPlaylist(nombre, tipo) {
  const fila = db.prepare("SELECT id FROM playlists WHERE nombre = ?").get(nombre);
  if (fila) return fila.id;
  const info = db
    .prepare("INSERT INTO playlists (nombre, tipo, pistas, activa, peso) VALUES (?,?,0,1,0)")
    .run(nombre, tipo);
  return info.lastInsertRowid;
}

// Playlists dedicadas a cuñas (jingles y publicidad) + reglas de inserción 24/7.
try {
  const idJingles = asegurarPlaylist("Jingles", "Jingle");
  const idPublicidad = asegurarPlaylist("Publicidad / Avisos", "Publicidad");
  if (vacia("inserciones")) {
    const ins = db.prepare(
      "INSERT INTO inserciones (nombre, tipo, playlist_id, cada_min, activa) VALUES (?,?,?,?,?)"
    );
    ins.run("Jingles e IDs", "jingle", idJingles, 30, 1);
    ins.run("Avisos Publicitarios", "publicidad", idPublicidad, 60, 1);
  }
} catch {
  /* sin cambios */
}

export default db;
