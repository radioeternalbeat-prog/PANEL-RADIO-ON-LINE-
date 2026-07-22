import { Router } from "express";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { pistasRepo } from "../db/repos.js";
import { parsearRekordboxXml } from "../services/rekordbox.js";
import { requiereAuth, verificarToken } from "../auth.js";

const router = Router();

// Carpeta raíz permitida para servir audio local de Rekordbox.
// Por seguridad, NO se sirve ningún archivo fuera de esta carpeta.
// Configúrala en .env con la carpeta donde Rekordbox guarda tu música
// (normalmente la misma que usas en "Preferencias > Avanzado > Base de datos").
const MUSIC_ROOT = process.env.REKORDBOX_MUSIC_ROOT
  ? path.resolve(process.env.REKORDBOX_MUSIC_ROOT)
  : null;

// Verifica que 'ruta' esté contenida dentro de MUSIC_ROOT (evita path traversal
// y evita servir archivos arbitrarios del disco si alguien manipula el campo 'ruta').
function rutaPermitida(ruta) {
  if (!MUSIC_ROOT || !ruta) return false;
  const resuelta = path.resolve(ruta);
  const raizConSeparador = MUSIC_ROOT.endsWith(path.sep) ? MUSIC_ROOT : MUSIC_ROOT + path.sep;
  return resuelta === MUSIC_ROOT || resuelta.startsWith(raizConSeparador);
}

const MIME_POR_EXT = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aiff": "audio/aiff",
  ".aif": "audio/aiff",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
};

// POST /api/rekordbox/importar-xml  { xml: "<DJ_PLAYLISTS>..." }
// Importa la colección exportada desde Rekordbox:
// Rekordbox > Archivo > Biblioteca > Exportar colección en formato xml.
router.post("/importar-xml", requiereAuth, (req, res) => {
  const xml = req.body?.xml;
  if (!xml || typeof xml !== "string") {
    return res.status(400).json({ mensaje: "Falta el contenido del archivo XML." });
  }
  let pistas;
  try {
    pistas = parsearRekordboxXml(xml);
  } catch (err) {
    return res.status(400).json({ mensaje: err.message });
  }
  if (!pistas.length) {
    return res.status(400).json({ mensaje: "El XML no contiene pistas reconocibles." });
  }
  const { agregadas, omitidas } = pistasRepo.agregarVarias(pistas);
  res.status(201).json({
    mensaje: `${agregadas.length} pista(s) importada(s) desde Rekordbox.`,
    totalEnArchivo: pistas.length,
    agregadas: agregadas.length,
    omitidas,
    reproducibleLocalmente: !!MUSIC_ROOT,
  });
});

// GET /api/rekordbox/estado
// Informa si el streaming de archivos locales está habilitado (REKORDBOX_MUSIC_ROOT configurado).
router.get("/estado", requiereAuth, (req, res) => {
  res.json({ streamingHabilitado: !!MUSIC_ROOT, musicRoot: MUSIC_ROOT || null });
});

// GET /api/rekordbox/stream/:id?token=...
// Sirve el audio real de una pista importada desde Rekordbox, leyendo el
// archivo directamente del disco (solo si está dentro de REKORDBOX_MUSIC_ROOT).
// Usa ?token= (en vez de header Authorization) porque el elemento <audio>
// del navegador no puede enviar headers personalizados.
router.get("/stream/:id", (req, res) => {
  const token = req.query.token;
  const payload = token ? verificarToken(String(token)) : null;
  if (!payload) return res.status(401).json({ mensaje: "No autorizado." });

  if (!MUSIC_ROOT) {
    return res.status(501).json({
      mensaje: "Reproducción local deshabilitada. Configura REKORDBOX_MUSIC_ROOT en el servidor.",
    });
  }

  const pistas = pistasRepo.listar();
  const pista = pistas.find((p) => p.id === Number(req.params.id));
  if (!pista || !pista.ruta) return res.status(404).json({ mensaje: "Pista no encontrada." });
  if (!rutaPermitida(pista.ruta)) {
    return res.status(403).json({ mensaje: "Ruta fuera de la carpeta de música permitida." });
  }
  if (!existsSync(pista.ruta)) {
    return res.status(404).json({ mensaje: "El archivo ya no existe en esa ruta." });
  }

  const stat = statSync(pista.ruta);
  const ext = path.extname(pista.ruta).toLowerCase();
  const mime = MIME_POR_EXT[ext] || "application/octet-stream";
  const rango = req.headers.range;

  if (!rango) {
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
    });
    createReadStream(pista.ruta).pipe(res);
    return;
  }

  // Soporte de Range para permitir búsqueda (seek) en la reproducción.
  const partes = rango.replace(/bytes=/, "").split("-");
  const inicio = parseInt(partes[0], 10) || 0;
  const fin = partes[1] ? parseInt(partes[1], 10) : stat.size - 1;
  if (inicio >= stat.size || fin >= stat.size) {
    res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
    return res.end();
  }
  res.writeHead(206, {
    "Content-Range": `bytes ${inicio}-${fin}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": fin - inicio + 1,
    "Content-Type": mime,
  });
  createReadStream(pista.ruta, { start: inicio, end: fin }).pipe(res);
});

export default router;
