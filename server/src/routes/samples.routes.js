import { Router } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { samplesRepo } from "../db/repos.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../../data/uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp3";
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB por archivo
  fileFilter: (req, file, cb) => {
    if (/^audio\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Solo se permiten archivos de audio."));
  },
});

const router = Router();

// GET /api/samples
router.get("/", (req, res) => {
  res.json(samplesRepo.listar());
});

// POST /api/samples  (multipart: campo "archivo" + nombre, categoria, color)
router.post("/", upload.single("archivo"), (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: "Falta el archivo de audio." });
  const { nombre, categoria, color } = req.body || {};
  const sample = samplesRepo.agregar({
    nombre: nombre || req.file.originalname,
    categoria,
    color,
    archivo: req.file.filename,
    url: `/uploads/${req.file.filename}`,
  });
  res.status(201).json(sample);
});

// DELETE /api/samples/:id
router.delete("/:id", async (req, res) => {
  const eliminado = samplesRepo.eliminar(Number(req.params.id));
  if (!eliminado) return res.status(404).json({ mensaje: "Sample no encontrado." });
  // Borrar el archivo físico (si falla, no es crítico).
  try {
    await unlink(path.join(UPLOADS_DIR, path.basename(eliminado.url)));
  } catch {
    /* noop */
  }
  res.json({ mensaje: "Sample eliminado.", sample: eliminado });
});

export default router;
