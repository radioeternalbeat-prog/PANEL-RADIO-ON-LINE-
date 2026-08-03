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
      ruta TEXT
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

  // No se siembran datos de demostración.
  // Cada usuario crea sus propias estaciones, playlists y contenido desde 0.
}

crearEsquema();
// Migraciones de esquema (idempotentes, para BDs de versiones anteriores).
try { db.exec("ALTER TABLE samples ADD COLUMN slot INTEGER DEFAULT 0"); } catch { /* ya existe */ }
try { db.exec("ALTER TABLE programacion ADD COLUMN playlist_id INTEGER"); } catch { /* ya existe */ }
try { db.exec("ALTER TABLE estaciones ADD COLUMN stream_url TEXT"); } catch { /* ya existe */ }
try { db.exec("ALTER TABLE estaciones ADD COLUMN embed_token TEXT"); } catch { /* ya existe */ }
try { db.exec("ALTER TABLE estaciones ADD COLUMN embed_canal TEXT"); } catch { /* ya existe */ }
sembrar();

export default db;
