import { Router } from "express";
import { estacionesRepo, estadisticasRepo } from "../db/repos.js";
import { oyentesPorHora } from "../live.js";

const router = Router();

// GET /api/estadisticas/resumen
router.get("/resumen", (req, res) => {
  const estaciones = estacionesRepo.listar();
  const anchoBanda = estadisticasRepo.anchoBanda();

  const totalOyentes = estaciones.reduce((a, e) => a + e.oyentesActuales, 0);
  const enLinea = estaciones.filter((e) => e.estado === "online").length;
  const picoTotal = estaciones.reduce((a, e) => a + e.picoOyentes, 0);
  const totalGb = anchoBanda.reduce((a, d) => a + d.gb, 0);
  const promedio = Math.round(
    oyentesPorHora.reduce((a, h) => a + h.oyentes, 0) / oyentesPorHora.length
  );
  const picoDia = Math.max(...oyentesPorHora.map((h) => h.oyentes));

  res.json({
    totalOyentes,
    enLinea,
    totalEstaciones: estaciones.length,
    picoTotal,
    totalGb,
    promedio,
    picoDia,
  });
});

router.get("/oyentes-por-hora", (req, res) => res.json(oyentesPorHora));
router.get("/oyentes-por-pais", (req, res) => res.json(estadisticasRepo.oyentesPorPais()));
router.get("/ancho-banda", (req, res) => res.json(estadisticasRepo.anchoBanda()));

export default router;
