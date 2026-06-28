// Bus de nivel de audio compartido.
// Cada fuente (reproductor, mezclador) reporta su nivel RMS (0..1) y los
// componentes visuales (ej. cartel ON AIR) leen el máximo para reaccionar.

const niveles = {};

export function reportarNivel(fuente, valor) {
  niveles[fuente] = valor || 0;
}

export function nivelMaximo() {
  let m = 0;
  for (const k in niveles) if (niveles[k] > m) m = niveles[k];
  return m;
}
