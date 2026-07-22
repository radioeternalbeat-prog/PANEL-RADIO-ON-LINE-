// Utilidades compartidas.

// Convierte milisegundos a "m:ss".
export function msADuracion(ms) {
  if (!ms || Number.isNaN(ms)) return "0:00";
  const total = Math.round(ms / 1000);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, "0")}`;
}

// Convierte segundos a "m:ss" (Rekordbox expresa la duración en segundos).
export function segundosADuracion(s) {
  if (!s || Number.isNaN(s)) return "0:00";
  const total = Math.round(Number(s));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, "0")}`;
}
