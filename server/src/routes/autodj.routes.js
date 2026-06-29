import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { pistasRepo, playlistsRepo, programacionRepo } from "../db/repos.js";
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

// GET /api/autodj/programacion
router.get("/programacion", (req, res) => {
  res.json(programacionRepo.listar());
});

export default router;
