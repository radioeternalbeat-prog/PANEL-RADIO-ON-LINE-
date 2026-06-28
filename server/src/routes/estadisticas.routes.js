import { Router } from "express";
import {
  anchoBandaPorDia,
  estaciones,
  oyentesPorHora,
  oyentesPorPais,
} from "../data/store.js";

const router = Router();

// GET /api/estadisticas/resumen
router.get("/resumen", (req, res) => {
  const totalOyentes = estaciones.reduce((a, e) => a + e.oyentesActuales, 0);
  const enLinea = estaciones.filter((e) => e.estado === "online").length;
  const picoTotal = estaciones.reduce((a, e) => a + e.picoOyentes, 0);
  const totalGb = anchoBandaPorDia.reduce((a, d) => a + d.gb, 0);
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

// GET /api/estadisticas/oyentes-por-hora
router.get("/oyentes-por-hora", (req, res) => {
  res.json(oyentesPorHora);
});

// GET /api/estadisticas/oyentes-por-pais
router.get("/oyentes-por-pais", (req, res) => {
  res.json(oyentesPorPais);
});

// GET /api/estadisticas/ancho-banda
router.get("/ancho-banda", (req, res) => {
  res.json(anchoBandaPorDia);
});

export default router;
