// Datos transitorios de "tiempo real" (no requieren persistencia):
// el historial de oyentes por hora se reconstruye en cada arranque y la rotación
// de canciones simula lo que reproduce el AutoDJ.

export const oyentesPorHora = Array.from({ length: 24 }, (_, h) => {
  const base = 60 + Math.round(80 * Math.sin((h / 24) * Math.PI * 2 - 1.5) + 80);
  return {
    hora: `${String(h).padStart(2, "0")}:00`,
    oyentes: Math.max(5, base),
  };
});

export const rotacionCanciones = {
  "rock-fm": [
    "Queen - Bohemian Rhapsody",
    "Nirvana - Smells Like Teen Spirit",
    "AC/DC - Thunderstruck",
    "Guns N' Roses - Sweet Child O' Mine",
  ],
  "latino-mix": [
    "Bad Bunny - Tití Me Preguntó",
    "Shakira - La Tortura",
    "Luis Fonsi - Despacito",
    "Karol G - Provenza",
  ],
  "jazz-lounge": ["Dave Brubeck - Take Five", "Miles Davis - So What"],
};

// Actualiza el bucket de la hora actual con el total de oyentes.
export function registrarTotalOyentes(total) {
  const horaActual = `${String(new Date().getHours()).padStart(2, "0")}:00`;
  const bucket = oyentesPorHora.find((h) => h.hora === horaActual);
  if (bucket) bucket.oyentes = total;
}
