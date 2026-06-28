import { Router } from "express";
import { pistasRepo } from "../db/repos.js";
import { buscarEnItunes, parsearLibraryXml } from "../services/itunes.js";

const router = Router();

// GET /api/itunes/buscar?termino=...&limite=25
router.get("/buscar", async (req, res) => {
  const termino = (req.query.termino || "").toString().trim();
  if (!termino) {
    return res.status(400).json({ mensaje: "Indica un término de búsqueda." });
  }
  const limite = Number(req.query.limite) || 25;
  try {
    const resultados = await buscarEnItunes(termino, { limite });
    res.json({ total: resultados.length, resultados });
  } catch (err) {
    res.status(502).json({ mensaje: err.message || "Error al consultar iTunes." });
  }
});

// POST /api/itunes/importar  { pistas: [ {titulo, artista, ...} ] }
// Agrega a la biblioteca del AutoDJ las pistas seleccionadas desde iTunes.
router.post("/importar", (req, res) => {
  const pistas = Array.isArray(req.body?.pistas) ? req.body.pistas : [];
  if (!pistas.length) {
    return res.status(400).json({ mensaje: "No se enviaron pistas para importar." });
  }
  const { agregadas, omitidas } = pistasRepo.agregarVarias(
    pistas.map((p) => ({ ...p, fuente: "itunes" }))
  );
  res.status(201).json({
    mensaje: `${agregadas.length} pista(s) importada(s), ${omitidas} omitida(s) por duplicado.`,
    agregadas,
    omitidas,
  });
});

// POST /api/itunes/importar-xml  { xml: "<plist>..." }
// Importa la biblioteca local exportada desde iTunes (Archivo > Biblioteca > Exportar).
router.post("/importar-xml", (req, res) => {
  const xml = req.body?.xml;
  if (!xml || typeof xml !== "string") {
    return res.status(400).json({ mensaje: "Falta el contenido del archivo XML." });
  }
  let pistas;
  try {
    pistas = parsearLibraryXml(xml);
  } catch (err) {
    return res.status(400).json({ mensaje: err.message });
  }
  if (!pistas.length) {
    return res.status(400).json({ mensaje: "El XML no contiene canciones reconocibles." });
  }
  const { agregadas, omitidas } = pistasRepo.agregarVarias(pistas);
  res.status(201).json({
    mensaje: `${agregadas.length} canción(es) importada(s) desde iTunes.`,
    totalEnArchivo: pistas.length,
    agregadas: agregadas.length,
    omitidas,
  });
});

export default router;
