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
//     "relativo"  -> incremento/decremento (para encoders sin tope, ej. jog).
//     "trigger"   -> botón/pad que dispara una acción puntual (play, cue,
//                    hotcue, tap, siguiente, etc.). Reacciona a Note On o CC>0.
//     "toggle"    -> botón que alterna entre dos estados (mic, CUE A/B).
export const GRUPOS_MIDI = {
  DECK_A: "Deck A",
  DECK_B: "Deck B",
  MEZCLADOR: "Mezclador",
  AUDIFONOS: "Audífonos (monitor)",
  REPRODUCTOR: "Reproductor / AutoDJ",
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
    { id: `deck.${id}.filtro`, etiqueta: "Filtro DJ (LP/HP)", grupo, tipo: "absoluto" },
    { id: `deck.${id}.tempo`, etiqueta: "Tempo (pitch)", grupo, tipo: "absoluto" },
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
  ...controlesDeck("A", GRUPOS_MIDI.DECK_A),
  ...controlesDeck("B", GRUPOS_MIDI.DECK_B),

  { id: "mezclador.crossfader", etiqueta: "Crossfader (A/B)", grupo: GRUPOS_MIDI.MEZCLADOR, tipo: "absoluto" },
  { id: "mezclador.master", etiqueta: "Volumen Master", grupo: GRUPOS_MIDI.MEZCLADOR, tipo: "absoluto" },
  { id: "mezclador.mic", etiqueta: "Micrófono (encender/apagar)", grupo: GRUPOS_MIDI.MEZCLADOR, tipo: "toggle" },

  { id: "audifonos.cueA", etiqueta: "Monitor CUE — Deck A", grupo: GRUPOS_MIDI.AUDIFONOS, tipo: "toggle" },
  { id: "audifonos.cueB", etiqueta: "Monitor CUE — Deck B", grupo: GRUPOS_MIDI.AUDIFONOS, tipo: "toggle" },
  { id: "audifonos.volumen", etiqueta: "Volumen del monitor", grupo: GRUPOS_MIDI.AUDIFONOS, tipo: "absoluto" },
  { id: "audifonos.mezcla", etiqueta: "Mezcla CUE / MIX", grupo: GRUPOS_MIDI.AUDIFONOS, tipo: "absoluto" },

  { id: "reproductor.playPause", etiqueta: "Play / Pausa", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.siguiente", etiqueta: "Siguiente pista", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.anterior", etiqueta: "Pista anterior", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "trigger" },
  { id: "reproductor.volumen", etiqueta: "Volumen", grupo: GRUPOS_MIDI.REPRODUCTOR, tipo: "absoluto" },

  ...Array.from({ length: 9 }, (_, i) => ({
    id: `soundboard.pad${i + 1}`,
    etiqueta: `Pad ${i + 1}`,
    grupo: GRUPOS_MIDI.SOUNDBOARD,
    tipo: "trigger",
  })),
];

export function buscarControl(id) {
  return CONTROLES_MIDI.find((c) => c.id === id) || null;
}

// Agrupa el catálogo por "grupo" preservando el orden de GRUPOS_MIDI.
export function controlesAgrupados() {
  const orden = Object.values(GRUPOS_MIDI);
  const mapa = new Map(orden.map((g) => [g, []]));
  for (const c of CONTROLES_MIDI) {
    if (!mapa.has(c.grupo)) mapa.set(c.grupo, []);
    mapa.get(c.grupo).push(c);
  }
  return orden.map((g) => ({ grupo: g, controles: mapa.get(g) || [] }));
}

// Clave única para identificar un mensaje MIDI entrante (independiente del
// valor recibido), usada tanto para el modo "Learn" como para el
// enrutamiento en tiempo real.
export function claveMensaje({ tipo, canal, dato1 }) {
  return `${tipo}:${canal}:${dato1}`;
}
