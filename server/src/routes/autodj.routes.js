import { Router } from "express";
import { pistasRepo, playlistsRepo, programacionRepo } from "../db/repos.js";

const router = Router();

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

// GET /api/autodj/playlists
router.get("/playlists", (req, res) => {
  res.json(playlistsRepo.listar());
});

// GET /api/autodj/programacion
router.get("/programacion", (req, res) => {
  res.json(programacionRepo.listar());
});

export default router;
