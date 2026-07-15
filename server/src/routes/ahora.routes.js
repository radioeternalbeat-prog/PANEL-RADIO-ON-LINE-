import { Router } from "express";
import { estacionesRepo, historialRepo } from "../db/repos.js";

// Reporte de "ahora suena" desde el panel (lo que se está transmitiendo).
const router = Router();

function estacionPrincipal() {
  const todas = estacionesRepo.listar();
  return (
    todas.find((e) => e.embedToken && e.embedCanal) ||
    todas.find((e) => e.estado === "online") ||
    todas[0] ||
    null
  );
}

// POST /api/ahora-suena  { titulo, artista, artwork }
router.post("/", (req, res) => {
  const { titulo, artista, artwork } = req.body || {};
  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ mensaje: "Falta el título de la canción." });
  }
  const est = estacionPrincipal();
  if (!est) return res.status(404).json({ mensaje: "No hay estaciones." });

  const texto = artista ? `${artista} — ${titulo}` : titulo;
  estacionesRepo.fijarCancion(est.id, texto);
  historialRepo.agregar({ estacionId: est.id, titulo, artista, artwork });

  res.json({ ok: true, estacionId: est.id, ahoraSuena: texto });
});

export default router;
