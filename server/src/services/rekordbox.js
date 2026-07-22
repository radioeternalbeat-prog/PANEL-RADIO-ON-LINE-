// Servicio de integración con Rekordbox (Pioneer DJ).
//
// Rekordbox 6/7 guarda su base de datos (master.db) cifrada con SQLCipher,
// por lo que no se puede leer directamente sin desencriptarla. La forma
// soportada y estable de traer la biblioteca es exportarla a XML desde la
// propia app:
//
//   Rekordbox > Archivo (File) > Biblioteca (Library) > Exportar colección
//   en formato xml (Export Collection in xml format)
//
// Ese archivo es un plist/XML simple con nodos <COLLECTION><TRACK .../></COLLECTION>.
// Este módulo lo parsea y normaliza cada TRACK al formato de nuestra biblioteca.

import { XMLParser } from "fast-xml-parser";
import { segundosADuracion } from "../utils.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => name === "TRACK" || name === "NODE",
});

// Rekordbox codifica la ruta como URI: "file://localhost/Users/tu/Music/cancion.mp3"
// (en Windows: "file://localhost/C:/Users/tu/Music/cancion.mp3").
function decodificarRuta(location) {
  if (!location) return null;
  try {
    let ruta = decodeURIComponent(location.replace(/^file:\/\/(localhost)?/, ""));
    // En Windows, Rekordbox antepone una barra antes de la letra de unidad: "/C:/...".
    if (/^\/[A-Za-z]:\//.test(ruta)) ruta = ruta.slice(1);
    return ruta;
  } catch {
    return location;
  }
}

// Normaliza un nodo <TRACK> del XML de Rekordbox a nuestro formato de pista.
function normalizarTrack(t) {
  if (!t || !t.Name) return null;
  // DJ Play Count / TotalTime en Rekordbox está en SEGUNDOS (a diferencia de iTunes, que usa ms).
  const duracionSeg = Number(t.TotalTime) || 0;
  return {
    titulo: t.Name,
    artista: t.Artist || "Desconocido",
    album: t.Album || "",
    genero: t.Genre || "Sin género",
    duracion: segundosADuracion(duracionSeg),
    bpm: t.AverageBpm ? Number(t.AverageBpm) : null,
    tonalidad: t.Tonality || null,
    rating: t.Rating != null ? Number(t.Rating) : null,
    rekordboxId: t.TrackID ? String(t.TrackID) : null,
    ruta: decodificarRuta(t.Location),
    fuente: "rekordbox",
  };
}

// Parsea el contenido de un XML de "Export Collection" de Rekordbox
// y devuelve la lista de pistas normalizadas.
export function parsearRekordboxXml(xml) {
  let data;
  try {
    data = parser.parse(xml);
  } catch {
    throw new Error("El archivo no es un XML válido.");
  }

  const dj = data?.DJ_PLAYLISTS;
  const coleccion = dj?.COLLECTION;
  if (!coleccion) {
    throw new Error(
      "No se encontró la sección COLLECTION. Exporta desde Rekordbox: Archivo > Biblioteca > Exportar colección en formato xml."
    );
  }

  const tracks = Array.isArray(coleccion.TRACK)
    ? coleccion.TRACK
    : coleccion.TRACK
      ? [coleccion.TRACK]
      : [];

  return tracks.map(normalizarTrack).filter(Boolean);
}
