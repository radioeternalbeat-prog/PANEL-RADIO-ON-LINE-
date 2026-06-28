import { Router } from "express";
import { biblioteca, playlists, programacion } from "../data/store.js";

const router = Router();

// GET /api/autodj/biblioteca?busqueda=texto
router.get("/biblioteca", (req, res) => {
  const q = (req.query.busqueda || "").toString().toLowerCase();
  const resultado = q
    ? biblioteca.filter(
        (t) =>
          t.titulo.toLowerCase().includes(q) || t.artista.toLowerCase().includes(q)
      )
    : biblioteca;
  res.json(resultado);
});

// DELETE /api/autodj/biblioteca/:id
router.delete("/biblioteca/:id", (req, res) => {
  const i = biblioteca.findIndex((t) => t.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ mensaje: "Pista no encontrada." });
  const [eliminada] = biblioteca.splice(i, 1);
  res.json({ mensaje: "Pista eliminada.", pista: eliminada });
});

// GET /api/autodj/playlists
router.get("/playlists", (req, res) => {
  res.json(playlists);
});

// GET /api/autodj/programacion
router.get("/programacion", (req, res) => {
  res.json(programacion);
});

export default router;
