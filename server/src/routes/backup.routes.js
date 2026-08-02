import { Router } from "express";
import { db } from "../db/db.js";

const router = Router();

// Tablas válidas del esquema (whitelist estricta para prevenir SQL injection).
const TABLAS_PERMITIDAS = new Set([
  "usuarios",
  "estaciones",
  "pistas",
  "playlists",
  "programacion",
  "oyentes_pais",
  "ancho_banda",
  "samples",
  "mensajes",
  "playlist_pistas",
  "inserciones",
  "historial",
  "midi_mapeos",
]);

// Valida que un nombre de tabla sea seguro (solo letras, números, guion bajo).
function esNombreSeguro(nombre) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nombre);
}

// Lista las tablas reales de la base de datos (excluye internas de SQLite).
function listarTablas() {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.name)
    .filter((t) => TABLAS_PERMITIDAS.has(t));
}

// Columnas existentes de una tabla (para filtrar al restaurar).
function columnasDe(tabla) {
  if (!TABLAS_PERMITIDAS.has(tabla) || !esNombreSeguro(tabla)) return [];
  return db.prepare(`PRAGMA table_info("${tabla}")`).all().map((c) => c.name);
}

// GET /api/backup/exportar
// Devuelve un volcado completo (JSON) de todas las tablas de la base de datos.
router.get("/exportar", (req, res) => {
  try {
    const tablas = listarTablas();
    const datos = {};
    let totalRegistros = 0;
    for (const t of tablas) {
      const filas = db.prepare(`SELECT * FROM "${t}"`).all();
      datos[t] = filas;
      totalRegistros += filas.length;
    }
    res.json({
      formato: "eternal-beat-backup",
      version: 1,
      exportado: new Date().toISOString(),
      totalRegistros,
      tablas: datos,
    });
  } catch (err) {
    res.status(500).json({ mensaje: "No se pudo generar la copia de seguridad." });
  }
});

// POST /api/backup/importar  { tablas: { nombreTabla: [filas...] } }
// Restaura la base de datos desde una copia. Operación transaccional:
// si algo falla, se revierte todo y los datos quedan intactos.
router.post("/importar", (req, res) => {
  const backup = req.body || {};
  if (!backup.tablas || typeof backup.tablas !== "object") {
    return res.status(400).json({ mensaje: "Archivo de copia inválido (falta 'tablas')." });
  }

  const tablasBD = new Set(listarTablas());
  let totalRestaurado = 0;

  // Desactiva claves foráneas durante la restauración para evitar conflictos de orden.
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN");
  try {
    for (const [tabla, filas] of Object.entries(backup.tablas)) {
      // Validación estricta: solo tablas permitidas con nombres seguros
      if (!tablasBD.has(tabla) || !TABLAS_PERMITIDAS.has(tabla)) continue;
      if (!esNombreSeguro(tabla) || !Array.isArray(filas)) continue;

      const colsValidas = new Set(columnasDe(tabla));
      if (colsValidas.size === 0) continue;

      db.exec(`DELETE FROM "${tabla}"`);

      for (const fila of filas) {
        // Solo columnas que existan hoy en la tabla (tolera cambios de esquema).
        const cols = Object.keys(fila).filter(
          (c) => colsValidas.has(c) && esNombreSeguro(c)
        );
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => "?").join(",");
        const valores = cols.map((c) => fila[c]);
        const colsQuoted = cols.map((c) => `"${c}"`).join(",");
        db.prepare(
          `INSERT INTO "${tabla}" (${colsQuoted}) VALUES (${placeholders})`
        ).run(...valores);
        totalRestaurado++;
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    db.exec("PRAGMA foreign_keys = ON");
    return res
      .status(500)
      .json({ mensaje: "No se pudo restaurar la copia. No se modificaron tus datos." });
  }
  db.exec("PRAGMA foreign_keys = ON");

  res.json({
    mensaje: `Copia restaurada correctamente (${totalRestaurado} registros). Recarga la página para ver los cambios.`,
    totalRestaurado,
  });
});

export default router;
