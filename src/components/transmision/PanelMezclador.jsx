import { useEffect, useRef, useState } from "react";
import {
  Disc3,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Sliders,
  Zap,
} from "lucide-react";
import { api } from "../../api/client";
import { reportarNivel } from "../../audio/nivelBus";
import { urlRecurso } from "../../api/client";
import { useMezclador } from "../../context/MezcladorContext";
import { useMidiTarget, useMidiEtiqueta } from "../../context/MidiContext";

// Sufijos de todos los controles definidos para un deck en el catálogo MIDI
// (src/midi/controlesMidi.js -> controlesDeck). Se usan para anunciar, con
// un solo nombre de pista, la etiqueta dinámica de TODOS los controles de
// ese deck a la vez (así en el panel de mapeo ves "Play/Pausa — Blinding
// Lights" en vez de solo "Play/Pausa").
const SUFIJOS_DECK = [
  "play", "cue", "vol", "high", "mid", "low", "eqReset", "filtro", "filtroReset",
  "tempo", "tempoReset", "tap", "sync", "hotcue1", "hotcue2", "hotcue3",
  "loop1", "loop2", "loop4", "salirLoop",
];

// Crossfade de igual potencia: x=0 -> todo A, x=1 -> todo B.
function gananciasCross(x) {
  return { a: Math.cos(x * 0.5 * Math.PI), b: Math.cos((1 - x) * 0.5 * Math.PI) };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const ESTADO_DECK = {
  track: null,
  playing: false,
  vol: 0.9,
  low: 0,
  mid: 0,
  high: 0,
  filtro: 0, // -1 (lowpass) .. 0 (off) .. 1 (highpass)
  tempo: 1,
  bpm: 120,
  cues: [null, null, null],
  loop: { activo: false, inicio: 0, fin: 0, beats: 0 },
  peaks: null,
};

function aplicarFiltro(node, v) {
  if (Math.abs(v) < 0.03) {
    node.type = "allpass";
    node.frequency.value = 20000;
  } else if (v > 0) {
    node.type = "highpass";
    node.frequency.value = 20 * Math.pow(1000, v); // 20 Hz .. 20 kHz
  } else {
    node.type = "lowpass";
    node.frequency.value = 20000 * Math.pow(0.011, -v); // 20 kHz .. ~220 Hz
  }
}

export default function PanelMezclador() {
  const [biblioteca, setBiblioteca] = useState([]);
  const [deckA, setDeckA] = useState({ ...ESTADO_DECK });
  const [deckB, setDeckB] = useState({ ...ESTADO_DECK });
  const [cross, setCross] = useState(0.5);
  const [master, setMaster] = useState(0.9);
  const [listo, setListo] = useState(false);
  const masterAntesDeMuteRef = useRef(0.9);

  const grafoRef = useRef(null);
  const medAref = useRef(null);
  const medBref = useRef(null);
  const tapsRef = useRef({ A: [], B: [] });
  // Espejo del estado de cada deck para usarlo dentro del rAF (loops).
  const estadoRef = useRef({ A: deckA, B: deckB });
  estadoRef.current = { A: deckA, B: deckB };

  const setters = { A: setDeckA, B: setDeckB };

  // Permite que otros paneles (ej. Cola) carguen pistas en los decks.
  const { registrarCargador, registrarPreparador, registrarNodos, cue: cueMonitor, monitorVol, mezcla, salidaId } = useMezclador();
  const cargarRef = useRef(null);
  useEffect(() => {
    registrarCargador((id, pista) => cargarRef.current?.(id, pista));
  }, [registrarCargador]);
  // Mantener la referencia al último 'cargar' (definido más abajo, hoisted).
  cargarRef.current = (id, pista) => cargar(id, pista);

  // Registrar un "preparador" para que el panel de Audífonos pueda activar el motor.
  useEffect(() => {
    registrarPreparador(() => {
      const g = asegurarGrafo();
      if (g.ctx.state === "suspended") g.ctx.resume();
    });
  }, [registrarPreparador]);

  // Exponer los nodos de audio (ctx, masterGain, duckGain) al Panel de Micrófonos.
  useEffect(() => {
    registrarNodos(() => {
      const g = asegurarGrafo();
      if (g.ctx.state === "suspended") g.ctx.resume();
      return g;
    });
  }, [registrarNodos]);

  // Aplicar estado del monitor (CUE A/B) a los nodos.
  useEffect(() => {
    const g = grafoRef.current;
    if (!g) return;
    g.A.cueGain.gain.value = cueMonitor.A ? 1 : 0;
    g.B.cueGain.gain.value = cueMonitor.B ? 1 : 0;
  }, [cueMonitor]);

  useEffect(() => {
    const g = grafoRef.current;
    if (g?.monitorGain) g.monitorGain.gain.value = monitorVol;
  }, [monitorVol]);

  // Mezcla CUE/MIX en los audífonos.
  useEffect(() => {
    const g = grafoRef.current;
    if (!g) return;
    if (g.cueBus) g.cueBus.gain.value = 1 - mezcla;
    if (g.mixBus) g.mixBus.gain.value = mezcla;
  }, [mezcla]);

  useEffect(() => {
    const a = grafoRef.current?.monitorAudio;
    if (a && typeof a.setSinkId === "function") {
      a.setSinkId(salidaId).catch(() => {});
    }
  }, [salidaId]);

  useEffect(() => {
    api
      .biblioteca()
      .then(setBiblioteca)
      .catch(() => {});
  }, []);

  function asegurarGrafo() {
    if (grafoRef.current) return grafoRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const masterGain = ctx.createGain();
    const duckGain = ctx.createGain();
    const masterAnalyser = ctx.createAnalyser();
    masterAnalyser.fftSize = 256;
    duckGain.connect(masterGain);
    masterGain.connect(masterAnalyser);
    masterGain.connect(ctx.destination);

    // --- Bus de monitoreo (audífonos / CUE) con salida independiente ---
    const monitorGain = ctx.createGain();
    monitorGain.gain.value = 0.8;
    // Buses para mezclar CUE (decks) y MIX (master) en los audífonos.
    const cueBus = ctx.createGain();
    cueBus.gain.value = 1; // por defecto: solo CUE
    const mixBus = ctx.createGain();
    mixBus.gain.value = 0;
    cueBus.connect(monitorGain);
    mixBus.connect(monitorGain);
    masterGain.connect(mixBus); // el mix al aire también puede oírse en el monitor
    let monitorAudio = null;
    try {
      const monitorDest = ctx.createMediaStreamDestination();
      monitorGain.connect(monitorDest);
      monitorAudio = new Audio();
      monitorAudio.srcObject = monitorDest.stream;
      monitorAudio.autoplay = true;
      monitorAudio.play?.().catch(() => {});
    } catch {
      /* si no se soporta, el monitor no estará disponible */
    }

    function crearDeck() {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.preservesPitch = false;
      const source = ctx.createMediaElementSource(audio);
      const low = ctx.createBiquadFilter();
      low.type = "lowshelf";
      low.frequency.value = 250;
      const mid = ctx.createBiquadFilter();
      mid.type = "peaking";
      mid.frequency.value = 1200;
      mid.Q.value = 0.8;
      const high = ctx.createBiquadFilter();
      high.type = "highshelf";
      high.frequency.value = 4000;
      const filtro = ctx.createBiquadFilter();
      filtro.type = "allpass";
      const gain = ctx.createGain();
      const crossGain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      // CUE: toma la señal post-EQ (independiente del fader/crossfader) hacia el monitor.
      const cueGain = ctx.createGain();
      cueGain.gain.value = 0;
      source.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(filtro);
      filtro.connect(gain);
      filtro.connect(cueGain);
      cueGain.connect(cueBus);
      gain.connect(analyser);
      analyser.connect(crossGain);
      crossGain.connect(duckGain);
      return { audio, source, low, mid, high, filtro, gain, crossGain, analyser, cueGain };
    }

    grafoRef.current = {
      ctx,
      masterGain,
      duckGain,
      masterAnalyser,
      monitorGain,
      cueBus,
      mixBus,
      monitorAudio,
      A: crearDeck(),
      B: crearDeck(),
    };
    setListo(true);
    return grafoRef.current;
  }

  function aplicarDeck(id, estado) {
    const g = grafoRef.current;
    if (!g) return;
    const d = g[id];
    d.gain.gain.value = estado.vol;
    d.low.gain.value = estado.low;
    d.mid.gain.value = estado.mid;
    d.high.gain.value = estado.high;
    aplicarFiltro(d.filtro, estado.filtro);
    d.audio.playbackRate = estado.tempo;
  }

  useEffect(() => aplicarDeck("A", deckA), [deckA]);
  useEffect(() => aplicarDeck("B", deckB), [deckB]);

  useEffect(() => {
    const g = grafoRef.current;
    if (!g) return;
    const { a, b } = gananciasCross(cross);
    g.A.crossGain.gain.value = a;
    g.B.crossGain.gain.value = b;
  }, [cross]);

  useEffect(() => {
    const g = grafoRef.current;
    if (g) g.masterGain.gain.value = master;
  }, [master]);

  // --- Mapeo MIDI: crossfader, master y micrófono se controlan igual desde
  // el software que desde un controlador físico (mismo camino de estado).
  useMidiTarget("mezclador.crossfader", (v) => setCross(v));
  useMidiTarget("mezclador.crossfaderCentro", () => setCross(0.5));
  useMidiTarget("mezclador.master", (v) => setMaster(v));
  useMidiTarget("mezclador.masterMute", () => alternarMuteMaster());
  // Nota: el control MIDI "mezclador.mic" vive en PanelMicrofonos.jsx (el
  // micrófono único de esta versión pasó a ser un panel de 4 entradas con
  // mute global independiente).
  // "Pánico" global: para (y calla) ambos decks al instante desde cualquier
  // pantalla, y también libera el mute del master si estaba activo.
  useMidiTarget("global.panico", () => {
    pausarDeck("A");
    pausarDeck("B");
  });

  // Bucle principal: medidores VU, wrap de loops y ducking por micrófono.
  useEffect(() => {
    let raf;
    const buf = new Uint8Array(128);
    function rms(analyser, b) {
      analyser.getByteTimeDomainData(b);
      let s = 0;
      for (let i = 0; i < b.length; i++) {
        const v = (b[i] - 128) / 128;
        s += v * v;
      }
      return Math.sqrt(s / b.length);
    }
    function loop() {
      const g = grafoRef.current;
      if (g) {
        // Medidores + loops
        for (const [id, ref] of [["A", medAref], ["B", medBref]]) {
          const nivel = rms(g[id].analyser, buf);
          if (ref.current) ref.current.style.height = `${Math.min(100, nivel * 240)}%`;
          const est = estadoRef.current[id];
          if (est.loop.activo && g[id].audio.currentTime >= est.loop.fin) {
            g[id].audio.currentTime = est.loop.inicio;
          }
        }
        // Nivel master -> bus compartido (para el cartel ON AIR)
        if (g.masterAnalyser) reportarNivel("mixer", rms(g.masterAnalyser, buf));
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Busca un preview real en iTunes si la pista no trae audio (ej. importada de Library.xml).
  async function resolverPreview(pista) {
    if (pista.previewUrl) return pista;
    try {
      const q = `${pista.titulo} ${pista.artista || ""}`.trim();
      const { resultados } = await api.buscarItunes(q, 1);
      const r = resultados?.[0];
      if (r?.previewUrl) {
        return { ...pista, previewUrl: r.previewUrl, artwork: pista.artwork || r.artwork };
      }
    } catch {
      /* noop */
    }
    return pista;
  }

  async function cargar(id, pistaOriginal) {
    const g = asegurarGrafo();
    const d = g[id];
    // Mostrar el título de inmediato mientras se resuelve el audio.
    setters[id]((s) => ({
      ...s,
      track: pistaOriginal,
      playing: false,
      peaks: null,
      cues: [null, null, null],
      loop: { activo: false, inicio: 0, fin: 0, beats: 0 },
    }));

    const pista = await resolverPreview(pistaOriginal);
    if (!pista.previewUrl) return; // no se encontró audio reproducible

    const urlAudio = urlRecurso(pista.previewUrl);
    d.audio.src = urlAudio;
    d.audio.load();
    setters[id]((s) => ({ ...s, track: pista }));

    // Forma de onda (decodificar audio).
    try {
      const resp = await fetch(urlAudio);
      const arr = await resp.arrayBuffer();
      const audioBuf = await g.ctx.decodeAudioData(arr);
      const datos = audioBuf.getChannelData(0);
      const N = 480;
      const tam = Math.floor(datos.length / N);
      const peaks = new Array(N);
      for (let i = 0; i < N; i++) {
        let max = 0;
        for (let j = 0; j < tam; j++) {
          const v = Math.abs(datos[i * tam + j] || 0);
          if (v > max) max = v;
        }
        peaks[i] = max;
      }
      setters[id]((s) => ({ ...s, peaks }));
    } catch {
      /* sin forma de onda si falla la decodificación */
    }
  }

  async function reproducir(id) {
    const g = asegurarGrafo();
    if (g.ctx.state === "suspended") await g.ctx.resume();
    const d = g[id];
    if (!d.audio.src) return;
    if (d.audio.paused) {
      await d.audio.play().catch(() => {});
      setters[id]((s) => ({ ...s, playing: true }));
    } else {
      d.audio.pause();
      setters[id]((s) => ({ ...s, playing: false }));
    }
  }

  // Pausa forzada (usada por "Pánico"): a diferencia de reproducir(id), no
  // alterna, solo detiene si estaba sonando.
  function pausarDeck(id) {
    const d = grafoRef.current?.[id];
    if (d?.audio && !d.audio.paused) {
      d.audio.pause();
      setters[id]((s) => ({ ...s, playing: false }));
    }
  }

  function alternarMuteMaster() {
    setMaster((actual) => {
      if (actual > 0) {
        masterAntesDeMuteRef.current = actual;
        return 0;
      }
      return masterAntesDeMuteRef.current || 0.9;
    });
  }

  function cue(id) {
    const g = grafoRef.current;
    if (g?.[id]?.audio?.src) g[id].audio.currentTime = 0;
  }

  function getAudio(id) {
    return grafoRef.current?.[id]?.audio || null;
  }

  function seek(id, frac) {
    const a = getAudio(id);
    if (a && a.duration) a.currentTime = frac * a.duration;
  }

  // --- BPM / SYNC ---
  function tap(id) {
    const ahora = performance.now();
    const taps = tapsRef.current[id].filter((t) => ahora - t < 2500);
    taps.push(ahora);
    tapsRef.current[id] = taps;
    if (taps.length >= 2) {
      let suma = 0;
      for (let i = 1; i < taps.length; i++) suma += taps[i] - taps[i - 1];
      const bpm = Math.round(60000 / (suma / (taps.length - 1)));
      if (bpm >= 40 && bpm <= 250) setters[id]((s) => ({ ...s, bpm }));
    }
  }

  function sync(id) {
    const otro = id === "A" ? "B" : "A";
    const e = estadoRef.current;
    const objetivoBpm = e[otro].bpm * e[otro].tempo;
    const nuevoTempo = clamp(objetivoBpm / e[id].bpm, 0.5, 1.5);
    setters[id]((s) => ({ ...s, tempo: nuevoTempo }));
  }

  // --- Hot cues ---
  function hotCue(id, idx) {
    const a = getAudio(id);
    if (!a?.src) return;
    setters[id]((s) => {
      const cues = [...s.cues];
      if (cues[idx] == null) {
        cues[idx] = a.currentTime; // set
      } else {
        a.currentTime = cues[idx]; // jump
      }
      return { ...s, cues };
    });
  }
  function limpiarCue(id, idx) {
    setters[id]((s) => {
      const cues = [...s.cues];
      cues[idx] = null;
      return { ...s, cues };
    });
  }

  // --- Loops por beats ---
  function loopBeats(id, beats) {
    const a = getAudio(id);
    if (!a?.src) return;
    setters[id]((s) => {
      const dur = (beats * 60) / (s.bpm * s.tempo);
      const inicio = a.currentTime;
      return { ...s, loop: { activo: true, inicio, fin: inicio + dur, beats } };
    });
  }
  function salirLoop(id) {
    setters[id]((s) => ({ ...s, loop: { ...s.loop, activo: false, beats: 0 } }));
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-muted">
        <Sliders size={16} className="text-brand-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">Mezclador DJ</h3>
        {!listo && <span className="text-[11px]">· pulsa play para activar el audio</span>}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <Deck id="A" estado={deckA} setEstado={setDeckA} biblioteca={biblioteca}
          onCargar={cargar} onPlay={reproducir} onCue={cue} onSeek={seek}
          onTap={tap} onSync={sync} onHotCue={hotCue} onLimpiarCue={limpiarCue}
          onLoop={loopBeats} onSalirLoop={salirLoop} getAudio={getAudio} medRef={medAref} />

        {/* Centro */}
        <div className="flex flex-row items-center justify-center gap-6 lg:flex-col lg:px-2">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted">Master</span>
            <input type="range" min="0" max="1" step="0.01" value={master}
              onChange={(e) => setMaster(Number(e.target.value))}
              className="h-1.5 w-28 cursor-pointer accent-brand-500 lg:w-32" />
            <span className="tabular-nums text-xs text-fg">{Math.round(master * 100)}%</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted">Crossfader</span>
            <input type="range" min="0" max="1" step="0.01" value={cross}
              onChange={(e) => setCross(Number(e.target.value))}
              className="h-2 w-36 cursor-pointer accent-brand-500" />
            <div className="flex w-36 justify-between text-[11px] font-bold text-muted">
              <span className={cross < 0.45 ? "text-brand-500" : ""}>A</span>
              <span className={cross > 0.55 ? "text-brand-500" : ""}>B</span>
            </div>
          </div>
        </div>

        <Deck id="B" estado={deckB} setEstado={setDeckB} biblioteca={biblioteca}
          onCargar={cargar} onPlay={reproducir} onCue={cue} onSeek={seek}
          onTap={tap} onSync={sync} onHotCue={hotCue} onLimpiarCue={limpiarCue}
          onLoop={loopBeats} onSalirLoop={salirLoop} getAudio={getAudio} medRef={medBref} derecha />
      </div>
    </div>
  );
}

/* ---------- Forma de onda ---------- */
function Waveform({ peaks, getAudio, id, onSeek }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let raf;
    function dibujar() {
      const cv = canvasRef.current;
      if (cv && peaks) {
        const ctx = cv.getContext("2d");
        const w = cv.width;
        const h = cv.height;
        ctx.clearRect(0, 0, w, h);
        const a = getAudio(id);
        const prog = a && a.duration ? a.currentTime / a.duration : 0;
        const n = peaks.length;
        const bw = w / n;
        for (let i = 0; i < n; i++) {
          const ph = Math.max(2, peaks[i] * h * 0.95);
          const reproducido = i / n < prog;
          ctx.fillStyle = reproducido ? "#FF8000" : "rgba(148,148,160,0.45)";
          ctx.fillRect(i * bw, (h - ph) / 2, Math.max(1, bw - 0.5), ph);
        }
        // Playhead
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(prog * w, 0, 1.5, h);
      }
      raf = requestAnimationFrame(dibujar);
    }
    raf = requestAnimationFrame(dibujar);
    return () => cancelAnimationFrame(raf);
  }, [peaks, getAudio, id]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={56}
      className="h-14 w-full cursor-pointer rounded-lg bg-surface"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(id, (e.clientX - r.left) / r.width);
      }}
    />
  );
}

/* ---------- EQ / knob ---------- */
function Mini({ label, valor, min, max, step, onChange, fmt }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold uppercase text-muted">{label}</span>
      <input type="range" min={min} max={max} step={step} value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-14 cursor-pointer accent-brand-500" />
      {fmt && <span className="text-[9px] tabular-nums text-muted">{fmt(valor)}</span>}
    </div>
  );
}

/* ---------- Deck ---------- */
function Deck({
  id, estado, setEstado, biblioteca, onCargar, onPlay, onCue, onSeek,
  onTap, onSync, onHotCue, onLimpiarCue, onLoop, onSalirLoop, getAudio, medRef, derecha,
}) {
  const set = (campo) => (v) => setEstado((s) => ({ ...s, [campo]: v }));

  // --- Mapeo MIDI: cada control físico llama exactamente a la misma función
  // que su equivalente en pantalla, así que el comportamiento es idéntico
  // (mismo throttling de Web Audio, mismo estado) venga de un fader real o
  // de un arrastre con el mouse.
  useMidiTarget(`deck.${id}.play`, () => onPlay(id));
  useMidiTarget(`deck.${id}.cue`, () => onCue(id));
  useMidiTarget(`deck.${id}.vol`, set("vol"));
  useMidiTarget(`deck.${id}.high`, (v) => set("high")(v * 48 - 24));
  useMidiTarget(`deck.${id}.mid`, (v) => set("mid")(v * 48 - 24));
  useMidiTarget(`deck.${id}.low`, (v) => set("low")(v * 48 - 24));
  useMidiTarget(`deck.${id}.eqReset`, () =>
    setEstado((s) => ({ ...s, high: 0, mid: 0, low: 0 }))
  );
  useMidiTarget(`deck.${id}.filtro`, (v) => set("filtro")(v * 2 - 1));
  useMidiTarget(`deck.${id}.filtroReset`, () => set("filtro")(0));
  useMidiTarget(`deck.${id}.tempo`, (v) => set("tempo")(0.5 + v));
  useMidiTarget(`deck.${id}.tempoReset`, () => set("tempo")(1));
  useMidiTarget(`deck.${id}.tap`, () => onTap(id));
  useMidiTarget(`deck.${id}.sync`, () => onSync(id));
  useMidiTarget(`deck.${id}.hotcue1`, () => onHotCue(id, 0));
  useMidiTarget(`deck.${id}.hotcue2`, () => onHotCue(id, 1));
  useMidiTarget(`deck.${id}.hotcue3`, () => onHotCue(id, 2));
  useMidiTarget(`deck.${id}.loop1`, () => onLoop(id, 1));
  useMidiTarget(`deck.${id}.loop2`, () => onLoop(id, 2));
  useMidiTarget(`deck.${id}.loop4`, () => onLoop(id, 4));
  useMidiTarget(`deck.${id}.salirLoop`, () => onSalirLoop(id));

  // --- Etiqueta dinámica: anuncia el nombre de la pista cargada en TODOS
  // los controles de este deck, para que en el panel de mapeo se vea, por
  // ejemplo, "Hot Cue 1 — Blinding Lights" en vez de solo "Hot Cue 1".
  const nombrePista = estado.track
    ? `${estado.track.titulo}${estado.track.artista ? " — " + estado.track.artista : ""}`
    : null;
  for (const sufijo of SUFIJOS_DECK) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMidiEtiqueta(`deck.${id}.${sufijo}`, nombrePista);
  }

  return (
    <div className="rounded-xl border border-line bg-surface2 p-4">
      <div className={`mb-3 flex items-center gap-2 ${derecha ? "lg:flex-row-reverse lg:text-right" : ""}`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-brand-grad text-white ${estado.playing ? "animate-spin-slow" : ""}`}>
          <Disc3 size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase text-brand-500">Deck {id}</p>
          <p className="truncate text-sm font-semibold text-fg">{estado.track?.titulo || "Sin pista"}</p>
          <p className="truncate text-[11px] text-muted">{estado.track?.artista || "Carga una canción"}</p>
        </div>
        <div className="flex h-12 w-2 items-end overflow-hidden rounded-full bg-line">
          <div ref={medRef} className="w-full rounded-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500" style={{ height: "0%" }} />
        </div>
      </div>

      <select className="input mb-3 py-1.5 text-sm" value={estado.track?.id || ""}
        onChange={(e) => {
          const p = biblioteca.find((t) => String(t.id) === e.target.value);
          if (p) onCargar(id, p);
        }}>
        <option value="">Cargar pista…</option>
        {biblioteca.map((t) => (
          <option key={t.id} value={t.id}>{t.titulo} — {t.artista}</option>
        ))}
      </select>

      {/* Forma de onda */}
      <div className="mb-3">
        <Waveform peaks={estado.peaks} getAudio={getAudio} id={id} onSeek={onSeek} />
      </div>

      {/* BPM + tap + sync */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-surface px-2 py-1">
          <input type="number" min="40" max="250" value={estado.bpm}
            onChange={(e) => set("bpm")(Number(e.target.value) || 0)}
            className="w-12 bg-transparent text-sm font-bold tabular-nums text-fg focus:outline-none" />
          <span className="text-[10px] font-semibold text-muted">BPM</span>
        </div>
        <button onClick={() => onTap(id)} className="rounded-lg bg-surface px-2 py-1.5 text-[11px] font-semibold text-muted hover:text-fg">TAP</button>
        <button onClick={() => onSync(id)} className="rounded-lg bg-brand-500/15 px-3 py-1.5 text-[11px] font-bold text-brand-500 hover:bg-brand-500/25">SYNC</button>
      </div>

      {/* EQ + Filtro DJ */}
      <div className="mb-3 flex items-center justify-around rounded-lg bg-surface p-2">
        <Mini label="Hi" valor={estado.high} min={-24} max={24} step={1} onChange={set("high")} />
        <Mini label="Mid" valor={estado.mid} min={-24} max={24} step={1} onChange={set("mid")} />
        <Mini label="Low" valor={estado.low} min={-24} max={24} step={1} onChange={set("low")} />
        <div className="h-8 w-px bg-line" />
        <Mini label="Filtro" valor={estado.filtro} min={-1} max={1} step={0.02} onChange={set("filtro")}
          fmt={(v) => (Math.abs(v) < 0.03 ? "OFF" : v > 0 ? "HP" : "LP")} />
      </div>

      {/* Hot cues */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {estado.cues.map((c, i) => (
          <div key={i} className="relative">
            <button onClick={() => onHotCue(id, i)}
              className={`w-full rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                c == null ? "bg-surface text-muted hover:text-fg" : "bg-brand-600 text-white"
              }`}>
              CUE {i + 1}
            </button>
            {c != null && (
              <button onClick={() => onLimpiarCue(id, i)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">×</button>
            )}
          </div>
        ))}
      </div>

      {/* Loops por beats */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Repeat size={14} className="text-muted" />
        {[1, 2, 4].map((b) => (
          <button key={b} onClick={() => onLoop(id, b)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
              estado.loop.activo && estado.loop.beats === b ? "bg-brand-600 text-white" : "bg-surface text-muted hover:text-fg"
            }`}>
            {b} {b === 1 ? "beat" : "beats"}
          </button>
        ))}
        <button onClick={() => onSalirLoop(id)}
          className="rounded-lg bg-surface px-2 py-1.5 text-[11px] font-semibold text-muted hover:text-fg" title="Salir del loop">
          <Zap size={13} />
        </button>
      </div>

      {/* Volumen + Tempo */}
      <div className="mb-2">
        <div className="mb-1 flex justify-between text-[11px] text-muted">
          <span>Volumen</span><span className="tabular-nums">{Math.round(estado.vol * 100)}%</span>
        </div>
        <input type="range" min="0" max="1" step="0.01" value={estado.vol}
          onChange={(e) => set("vol")(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500" />
      </div>
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-[11px] text-muted">
          <span>Tempo</span><span className="tabular-nums">{estado.tempo >= 1 ? "+" : ""}{Math.round((estado.tempo - 1) * 100)}%</span>
        </div>
        <input type="range" min="0.5" max="1.5" step="0.005" value={estado.tempo}
          onChange={(e) => set("tempo")(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500" />
      </div>

      {/* Controles */}
      <div className="flex gap-2">
        <button onClick={() => onPlay(id)} className="btn-primary flex-1 py-2">
          {estado.playing ? <Pause size={16} /> : <Play size={16} />}
          {estado.playing ? "Pausa" : "Play"}
        </button>
        <button onClick={() => onCue(id)} className="btn-ghost px-3" title="Volver al inicio">
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
