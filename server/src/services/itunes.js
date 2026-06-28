// Servicio de integración con iTunes.
// 1) Búsqueda en el catálogo público de Apple (iTunes Search API).
// 2) Parseo de la biblioteca local exportada (iTunes Library.xml, formato plist).

import { parse as parsePlist } from "plist";
import { msADuracion } from "../data/store.js";

const ITUNES_SEARCH = "https://itunes.apple.com/search";

// Sube la resolución de la carátula (100x100 -> 300x300).
function caratulaAlta(url) {
  return url ? url.replace("100x100bb", "300x300bb") : null;
}

// Normaliza un resultado de la iTunes Search API al formato de nuestra biblioteca.
function normalizar(r) {
  return {
    itunesId: r.trackId,
    titulo: r.trackName,
    artista: r.artistName,
    album: r.collectionName || "",
    genero: r.primaryGenreName || "Sin género",
    duracion: msADuracion(r.trackTimeMillis),
    artwork: caratulaAlta(r.artworkUrl100),
    previewUrl: r.previewUrl || null,
    enlace: r.trackViewUrl || null,
    fuente: "itunes",
  };
}

// Busca canciones en el catálogo de Apple.
export async function buscarEnItunes(termino, { limite = 25, pais = "US" } = {}) {
  const params = new URLSearchParams({
    term: termino,
    media: "music",
    entity: "song",
    limit: String(Math.min(Math.max(limite, 1), 50)),
    country: pais,
  });

  const respuesta = await fetch(`${ITUNES_SEARCH}?${params.toString()}`, {
    headers: { "User-Agent": "PanelRadioOnline/1.0" },
  });

  if (!respuesta.ok) {
    throw new Error(`iTunes respondió con estado ${respuesta.status}`);
  }

  const datos = await respuesta.json();
  return (datos.results || [])
    .filter((r) => r.kind === "song")
    .map(normalizar);
}

// Parsea el contenido de un iTunes Library.xml y devuelve las pistas normalizadas.
export function parsearLibraryXml(xml) {
  let data;
  try {
    data = parsePlist(xml);
  } catch {
    throw new Error("El archivo no es un iTunes Library.xml válido.");
  }

  const tracks = data?.Tracks;
  if (!tracks || typeof tracks !== "object") {
    throw new Error("No se encontró la sección 'Tracks' en el XML.");
  }

  const pistas = [];
  for (const key of Object.keys(tracks)) {
    const t = tracks[key];
    if (!t || !t.Name) continue;
    // Ignorar pistas que no son audio (videos, podcasts, etc.) cuando se puede detectar.
    if (t.Kind && /video/i.test(t.Kind)) continue;

    let ruta = t.Location || null;
    if (ruta) {
      try {
        ruta = decodeURIComponent(ruta.replace(/^file:\/\/(localhost)?/, ""));
      } catch {
        /* deja la ruta tal cual */
      }
    }

    pistas.push({
      titulo: t.Name,
      artista: t.Artist || "Desconocido",
      album: t.Album || "",
      genero: t.Genre || "Sin género",
      duracion: msADuracion(t["Total Time"]),
      ruta,
      fuente: "xml",
    });
  }
  return pistas;
}
