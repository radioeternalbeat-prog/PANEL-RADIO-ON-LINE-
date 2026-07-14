// Catálogo central de "controles mapeables": cada entrada describe un control
// del panel que puede recibir eventos de un controlador MIDI físico.
//
// - id: identificador único y estable (se guarda en la base de datos, así que
//   nunca debe cambiarse una vez publicado; si un control se retira, se puede
//   dejar de usar pero no reciclar el id).
// - etiqueta: nombre visible en la UI de mapeo.
// - grupo: agrupa visualmente los controles (Deck A, Deck B, Mezclador, ...).
// - tipo:
//     "absoluto"  -> valor continuo 0..1 (fader/knob motorizado o no).
//                    Ideal para volumen, EQ, filtro, tempo, crossfader.
//                    También soporta encoders relativos (infinitos): el
//                    motor detecta o permite marcar manualmente un control
//                    absoluto como "relativo" y acumula un valor virtual.
//     "trigger"   -> botón/pad que dispara una acción puntual (play, cue,
//                    hotcue, tap, siguiente, etc.). Reacciona a Note On o CC>0.
//     "toggle"    -> botón que alterna entre dos estados (mic, CUE A/B, tema).
export const GRUPOS_MIDI = {
  GENERAL: "General / Navegación",
  DECK_A: "Deck A",
  DECK_B: "Deck B",
  MEZCLADOR: "Mezclador",
  AUDIFONOS: "Audífonos (monitor)",
  REPRODUCTOR: "Reproductor / AutoDJ",
  AUTODJ: "AutoDJ (biblioteca)",
  SOUNDBOARD: "Soundboard",
};

function controlesDeck(id, grupo) {
  return [
    { id: `deck.${id}.play`, etiqueta: "Play / Pausa", grupo, tipo: "trigger" },
    { id: `deck.${id}.cue`, etiqueta: "Cue (volver al inicio)", grupo, tipo: "trigger" },
    { id: `deck.${id}.vol`, etiqueta: "Volumen", grupo, tipo: "absoluto" },
    { id: `deck.${id}.high`, etiqueta: "EQ Agudos (Hi)", grupo, tipo: "absoluto" },
    { id: `deck.${id}.mid`, etiqueta: "EQ Medios (Mid)", grupo, tipo: "absoluto" },
    { id: `deck.${id}.low`, etiqueta: "EQ Graves (Low)", grupo, tipo: "absoluto" },
    { id: `deck.${id}.eqReset`, etiqueta: "Reset EQ (Hi/Mid/Low a 0)", grupo, tipo: "trigger" },
    { id: `deck.${id}.filtro`, etiqueta: "Filtro DJ (LP/HP)", grupo, tipo: "absoluto" },
    { id: `deck.${id}.filtroReset`, etiqueta: "Reset filtro", grupo, tipo: "trigger" },
    { id: `deck.${id}.tempo`, etiqueta: "Tempo (pitch)", grupo, tipo: "absoluto" },
    { id: `deck.${id}.tempoReset`, etiqueta: "Reset tempo (0%)", grupo, tipo: "trigger" },
    { id: `deck.${id}.tap`, etiqueta: "Tap tempo", grupo, tipo: "trigger" },
    { id: `deck.${id}.sync`, etiqueta: "Sync BPM", grupo, tipo: "trigger" },
    { id: `deck.${id}.hotcue1`, etiqueta: "Hot Cue 1", grupo, tipo: "trigger" },
    { id: `deck.${id}.hotcue2`, etiqueta: "Hot Cue 2", grupo, tipo: "trigger" },
    { id: `deck.${id}.hotcue3`, etiqueta: "Hot Cue 3", grupo, tipo: "trigger" },
    { id: `deck.${id}.loop1`, etiqueta: "Loop 1 beat", grupo, tipo: "trigger" },
    { id: `deck.${id}.loop2`, etiqueta: "Loop 2 beats", grupo, tipo: "trigger" },
    { id: `deck.${id}.loop4`, etiqueta: "Loop 4 beats", grupo, tipo: "trigger" },
    { id: `deck.${id}.salirLoop`, etiqueta: "Salir del loop", grupo, tipo: "trigger" },
  ];
}

export const CONTROLES_MIDI = [
  // ---------- General / Navegación (funciona en cualquier pantalla) ----------
  { id: "global.navEstaciones", etiqueta: "Ir a Estaciones", grupo: GRUPOS_MIDI.GENERAL, tipo: "trigger" },
  { id: "global.navTransmision", etiqueta: "Ir a Transmisión", grupo: GRUPOS_MIDI.GENERAL, tipo: "trigger" },
  { id: "global.navEstadisticas", etiqueta: "Ir a Estadísticas", grupo: GRUPOS_MIDI.GENERAL, tipo: "trigger" },
  { id: "global.navAutodj", etiqueta: "Ir a AutoDJ", grupo: GRUPOS_MIDI.GENERAL, tipo: "trigger" },
  { id: "global.navConfiguracion", etiqueta: "Ir a Configuración", grupo: GRUPOS_MIDI.GENERAL, tipo: "trigger" },
  { id: "global.tema", etiqueta: "Alternar tema claro/oscuro", grupo: GRUPOS_MIDI.GENERAL, tipo: "toggle" },
  { id: "global.onair", etiqueta: "Alternar indicador AL AIRE", grupo: GRUPOS_MIDI.GENERAL, tipo: "toggle" },
  { id: "global.panico", etiqueta: "Pánico (detener todo el audio)", grupo: GRUPOS_MIDI.GENERAL, tipo: "trigger" },

  // ---------- Decks ----------
  ...controlesDeck("A", GRUPOS_MIDI.DECK_A),
  ...controlesDeck("B", GRUPOS_MIDI.DECK_B),

  // ---------- Mezclador ----------
  { id: "mezclador.crossfader", etiqueta: "Crossfader (A/B)", grupo: GRUPOS_MIDI.MEZCLADOR, tipo: "absoluto" },
  { id: "mezclador.crossfaderCentro", etiqueta: "Centrar crossfader", grupo: GRUPOS_MIDI.MEZCLADOR, tipo: "trigger" },
  { id: "mezclador.master", etiqueta: "Volumen Master", grupo: GRUPOS_MIDI.MEZCLADOR, tipo: "absoluto" },
  { id: "mezclador.masterMute", etiqueta: "Mutear/restaurar Master", grupo: GRUPOS_MIDI.MEZCLADOR, tipo: "toggle" },
  { id: "mezclador.mic", etiqueta: "Micrófono (encender/apagar)", grupo: GRUPOS_MIDI.MEZCLADOR, tipo: "toggle" },

  // ---------- Audífonos ----------
  { id: "audifonos.cueA", etiqueta: "Monitor CUE — Deck A", grupo: GRUPOS_MIDI.AUDIFONOS, tipo: "toggle" },
  { id: "audifonos.cueB", etiqueta: "Monitor CUE — Deck B", grupo: GRUPOS_MIDI.AUDIFONOS, tipo: "toggle" },
  { id: "audifonos.volumen", etiqueta: "Volumen del monitor", grupo: GRUPOS_MIDI.AUDIFONOS, tipo: "absoluto" },
  { id: "audifonos.mezcla", etiqueta: "Mezcla CUE / MIX", grupo: GRUPOS_MIDI.AUDIFONOS, tipo: "absoluto" },

  // ---------- Reproductor principal (estaciones / preview de AutoDJ) ----------
  { id: "reproductor.playPause", etiqueta: "Play / Pausa", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.detener", etiqueta: "Detener", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.siguiente", etiqueta: "Siguiente pista", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.anterior", etiqueta: "Pista anterior", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.avanzar10", etiqueta: "Avanzar 10 segundos", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.retroceder10", etiqueta: "Retroceder 10 segundos", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.volumen", etiqueta: "Volumen", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "absoluto" },
  { id: "reproductor.modoAuto", etiqueta: "Alternar avance automático", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "toggle" },

  // ---------- AutoDJ (pestañas y acciones de la página) ----------
  { id: "autodj.tabBiblioteca", etiqueta: "Pestaña: Biblioteca", grupo: GRUPOS_MIDI.AUTODJ, tipo: "trigger" },
  { id: "autodj.tabPlaylists", etiqueta: "Pestaña: Playlists", grupo: GRUPOS_MIDI.AUTODJ, tipo: "trigger" },
  { id: "autodj.tabProgramacion", etiqueta: "Pestaña: Programación", grupo: GRUPOS_MIDI.AUTODJ, tipo: "trigger" },
  { id: "autodj.buscarItunes", etiqueta: "Abrir búsqueda en iTunes", grupo: GRUPOS_MIDI.AUTODJ, tipo: "trigger" },

  // ---------- Soundboard ----------
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `soundboard.pad${i + 1}`,
    etiqueta: `Pad ${i + 1}`,
    grupo: GRUPOS_MIDI.SOUNDBOARD,
    tipo: "trigger",
  })),
  { id: "soundboard.detenerTodos", etiqueta: "Detener todos los pads", grupo: GRUPOS_MIDI.SOUNDBOARD, tipo: "trigger" },
];

export function buscarControl(id) {
  return CONTROLES_MIDI.find((c) => c.id === id) || null;
}

// Agrupa el catálogo por "grupo" preservando el orden de GRUPOS_MIDI.
// Si se pasa `filtro`, solo incluye controles cuya etiqueta, id o grupo
// coincidan (usado por el buscador del panel de mapeo).
export function controlesAgrupados(filtro = "") {
  const q = filtro.trim().toLowerCase();
  const orden = Object.values(GRUPOS_MIDI);
  const mapa = new Map(orden.map((g) => [g, []]));
  for (const c of CONTROLES_MIDI) {
    if (!mapa.has(c.grupo)) mapa.set(c.grupo, []);
    if (q && !c.etiqueta.toLowerCase().includes(q) && !c.grupo.toLowerCase().includes(q) && !c.id.includes(q)) {
      continue;
    }
    mapa.get(c.grupo).push(c);
  }
  return orden
    .map((g) => ({ grupo: g, controles: mapa.get(g) || [] }))
    .filter((g) => g.controles.length > 0 || !q);
}

// Clave única para identificar un mensaje MIDI entrante (independiente del
// valor recibido), usada tanto para el modo "Learn" como para el
// enrutamiento en tiempo real.
//
// Se llama con dos formas de objeto distintas que deben producir la MISMA
// clave para el mismo mensaje:
//   - un mensaje MIDI en vivo (clasificarMensaje): { tipo, canal, dato1, dato2 }
//   - una asignación guardada en el perfil: { controlId, mensajeTipo, canal, dato1, ... }
// Por eso se acepta `tipo` O `mensajeTipo` indistintamente.
export function claveMensaje({ tipo, mensajeTipo, canal, dato1 }) {
  return `${tipo ?? mensajeTipo}:${canal}:${dato1}`;
}
