import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { pistasRepo, playlistsRepo, programacionRepo, insercionesRepo } from "../db/repos.js";
import { UPLOADS_DIR } from "./samples.routes.js";

const router = Router();

// Subida de archivos de música completos a la biblioteca.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp3";
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);
    cb(null, `cancion-${Date.now()}-${base}${ext}`);
  },
});
const subir = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB por archivo
  fileFilter: (req, file, cb) =>
    /^audio\//.test(file.mimetype) ? cb(null, true) : cb(new Error("Solo se permiten archivos de audio.")),
});

// GET /api/autodj/biblioteca?busqueda=texto
router.get("/biblioteca", (req, res) => {
  const q = (req.query.busqueda || "").toString();
  res.json(pistasRepo.listar(q));
});

// DELETE /api/autodj/biblioteca/:id
router.delete("/biblioteca/:id", (req, res) => {
  const eliminada = pistasRepo.eliminar(Number(req.params.id));
  if (!eliminada) return res.status(404).json({ mensaje: "Pista no encontrada." });
  res.json({ mensaje: "Pista eliminada.", pista: eliminada });
});

// POST /api/autodj/subir  (multipart: campo "archivo" + titulo, artista, genero)
// Sube una canción completa a la biblioteca (reproducible en player y decks).
router.post("/subir", subir.single("archivo"), (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: "Falta el archivo de audio." });
  const { titulo, artista, genero } = req.body || {};
  const nombre = titulo || req.file.originalname.replace(/\.[^.]+$/, "");
  const url = `/uploads/${req.file.filename}`;
  const pista = pistasRepo.agregar({
    titulo: nombre,
    artista: artista || "Desconocido",
    genero: genero || "Subido",
    fuente: "archivo",
    previewUrl: url, // URL de audio reproducible (canción completa)
    ruta: url,
  });
  res.status(201).json(pista);
});

// GET /api/autodj/playlists
router.get("/playlists", (req, res) => {
  res.json(playlistsRepo.listar());
});

// POST /api/autodj/playlists  { nombre, tipo }
router.post("/playlists", (req, res) => {
  const { nombre, tipo } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ mensaje: "El nombre es obligatorio." });
  res.status(201).json(playlistsRepo.crear({ nombre: nombre.trim(), tipo }));
});

// DELETE /api/autodj/playlists/:id
router.delete("/playlists/:id", (req, res) => {
  const p = playlistsRepo.eliminar(Number(req.params.id));
  if (!p) return res.status(404).json({ mensaje: "Playlist no encontrada." });
  res.json({ mensaje: "Playlist eliminada.", playlist: p });
});

// GET /api/autodj/playlists/:id/pistas  -> canciones de la playlist
router.get("/playlists/:id/pistas", (req, res) => {
  res.json(playlistsRepo.pistasDe(Number(req.params.id)));
});

// POST /api/autodj/playlists/:id/pistas  { pistaId }  -> agregar de la biblioteca
router.post("/playlists/:id/pistas", (req, res) => {
  const { pistaId } = req.body || {};
  if (!pistaId) return res.status(400).json({ mensaje: "Falta pistaId." });
  res.status(201).json(playlistsRepo.agregarPista(Number(req.params.id), Number(pistaId)));
});

// DELETE /api/autodj/playlists/:id/pistas/:pistaId
router.delete("/playlists/:id/pistas/:pistaId", (req, res) => {
  res.json(playlistsRepo.quitarPista(Number(req.params.id), Number(req.params.pistaId)));
});

// POST /api/autodj/playlists/:id/subir  (multipart) -> sube audio Y lo agrega a la playlist
router.post("/playlists/:id/subir", subir.single("archivo"), (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: "Falta el archivo de audio." });
  const { titulo, artista } = req.body || {};
  const url = `/uploads/${req.file.filename}`;
  const pista = pistasRepo.agregar({
    titulo: titulo || req.file.originalname.replace(/\.[^.]+$/, ""),
    artista: artista || "Desconocido",
    genero: "Playlist",
    fuente: "archivo",
    previewUrl: url,
    ruta: url,
  });
  playlistsRepo.agregarPista(Number(req.params.id), pista.id);
  res.status(201).json(pista);
});

// GET /api/autodj/programacion
router.get("/programacion", (req, res) => {
  res.json(programacionRepo.listar());
});

// POST /api/autodj/programacion  { nombre, inicio, fin, playlistId, dias }
router.post("/programacion", (req, res) => {
  const { nombre, inicio, fin, playlistId, dias } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ mensaje: "El nombre es obligatorio." });
  res.status(201).json(
    programacionRepo.crear({ nombre: nombre.trim(), inicio, fin, playlistId, dias })
  );
});

// PUT /api/autodj/programacion/:id
router.put("/programacion/:id", (req, res) => {
  const p = programacionRepo.actualizar(Number(req.params.id), req.body || {});
  if (!p) return res.status(404).json({ mensaje: "Bloque no encontrado." });
  res.json(p);
});

// DELETE /api/autodj/programacion/:id
router.delete("/programacion/:id", (req, res) => {
  const p = programacionRepo.eliminar(Number(req.params.id));
  if (!p) return res.status(404).json({ mensaje: "Bloque no encontrado." });
  res.json({ mensaje: "Bloque eliminado.", programa: p });
});

// GET /api/autodj/inserciones  (reglas de cuñas: jingles / publicidad)
router.get("/inserciones", (req, res) => {
  res.json(insercionesRepo.listar());
});

// PUT /api/autodj/inserciones/:id  { activa?, cadaMin?, nombre? }
router.put("/inserciones/:id", (req, res) => {
  const i = insercionesRepo.actualizar(Number(req.params.id), req.body || {});
  if (!i) return res.status(404).json({ mensaje: "Inserción no encontrada." });
  res.json(i);
});

export default router;
