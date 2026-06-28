import { useEffect, useRef, useState } from "react";
import { Disc3, Headphones, Loader2, Pause, Play, RotateCcw, Sliders } from "lucide-react";
import { api } from "../../api/client";

// Crossfade de igual potencia: x=0 -> todo A, x=1 -> todo B.
function gananciasCross(x) {
  return { a: Math.cos(x * 0.5 * Math.PI), b: Math.cos((1 - x) * 0.5 * Math.PI) };
}

const ESTADO_DECK = { vol: 0.9, low: 0, mid: 0, high: 0, tempo: 1, track: null, playing: false };

export default function PanelMezclador() {
  const [biblioteca, setBiblioteca] = useState([]);
  const [deckA, setDeckA] = useState({ ...ESTADO_DECK });
  const [deckB, setDeckB] = useState({ ...ESTADO_DECK });
  const [cross, setCross] = useState(0.5);
  const [master, setMaster] = useState(0.9);
  const [listo, setListo] = useState(false);

  const grafoRef = useRef(null);
  const medAref = useRef(null);
  const medBref = useRef(null);

  useEffect(() => {
    // Solo pistas reproducibles (con preview/URL de audio).
    api
      .biblioteca()
      .then((b) => setBiblioteca(b.filter((t) => t.previewUrl)))
      .catch(() => {});
  }, []);

  // Construye el grafo de audio en el primer gesto del usuario.
  function asegurarGrafo() {
    if (grafoRef.current) return grafoRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

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
      const gain = ctx.createGain();
      const crossGain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(gain);
      gain.connect(analyser);
      analyser.connect(crossGain);
      crossGain.connect(masterGain);
      return { audio, source, low, mid, high, gain, crossGain, analyser };
    }

    grafoRef.current = { ctx, masterGain, A: crearDeck(), B: crearDeck() };
    setListo(true);
    return grafoRef.current;
  }

  // Aplica valores de cada deck a los nodos.
  function aplicarDeck(id, estado) {
    const g = grafoRef.current;
    if (!g) return;
    const d = g[id];
    d.gain.gain.value = estado.vol;
    d.low.gain.value = estado.low;
    d.mid.gain.value = estado.mid;
    d.high.gain.value = estado.high;
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

  // Medidores de nivel (VU) por deck, vía DOM directo para no re-renderizar.
  useEffect(() => {
    let raf;
    const buf = new Uint8Array(128);
    function loop() {
      const g = grafoRef.current;
      if (g) {
        for (const [id, ref] of [["A", medAref], ["B", medBref]]) {
          g[id].analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          if (ref.current) ref.current.style.height = `${Math.min(100, rms * 240)}%`;
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function cargar(id, pista) {
    const g = asegurarGrafo();
    const d = g[id];
    d.audio.src = pista.previewUrl;
    d.audio.load();
    (id === "A" ? setDeckA : setDeckB)((s) => ({ ...s, track: pista, playing: false }));
  }

  async function reproducir(id) {
    const g = asegurarGrafo();
    if (g.ctx.state === "suspended") await g.ctx.resume();
    const d = g[id];
    if (!d.audio.src) return;
    const setDeck = id === "A" ? setDeckA : setDeckB;
    if (d.audio.paused) {
      await d.audio.play().catch(() => {});
      setDeck((s) => ({ ...s, playing: true }));
    } else {
      d.audio.pause();
      setDeck((s) => ({ ...s, playing: false }));
    }
  }

  function cue(id) {
    const g = asegurarGrafo();
    const d = g[id];
    if (!d.audio.src) return;
    d.audio.currentTime = 0;
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-muted">
        <Sliders size={16} className="text-brand-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">Mezclador DJ</h3>
        {!listo && <span className="text-[11px] text-muted">· pulsa play para activar el audio</span>}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <Deck
          id="A"
          estado={deckA}
          setEstado={setDeckA}
          biblioteca={biblioteca}
          onCargar={cargar}
          onPlay={reproducir}
          onCue={cue}
          medRef={medAref}
        />

        {/* Centro: master + crossfader */}
        <div className="flex flex-row items-center justify-center gap-6 lg:flex-col lg:px-2">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted">Master</span>
            <input
              type="range" min="0" max="1" step="0.01" value={master}
              onChange={(e) => setMaster(Number(e.target.value))}
              className="h-1.5 w-28 cursor-pointer accent-brand-500 lg:w-32"
            />
            <span className="tabular-nums text-xs text-fg">{Math.round(master * 100)}%</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted">Crossfader</span>
            <input
              type="range" min="0" max="1" step="0.01" value={cross}
              onChange={(e) => setCross(Number(e.target.value))}
              className="h-2 w-36 cursor-pointer accent-brand-500"
            />
            <div className="flex w-36 justify-between text-[11px] font-bold text-muted">
              <span className={cross < 0.45 ? "text-brand-500" : ""}>A</span>
              <span className={cross > 0.55 ? "text-brand-500" : ""}>B</span>
            </div>
          </div>
        </div>

        <Deck
          id="B"
          estado={deckB}
          setEstado={setDeckB}
          biblioteca={biblioteca}
          onCargar={cargar}
          onPlay={reproducir}
          onCue={cue}
          medRef={medBref}
          derecha
        />
      </div>
    </div>
  );
}

function EQ({ label, valor, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold uppercase text-muted">{label}</span>
      <input
        type="range" min="-24" max="24" step="1" value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-16 cursor-pointer accent-brand-500"
      />
    </div>
  );
}

function Deck({ id, estado, setEstado, biblioteca, onCargar, onPlay, onCue, medRef, derecha }) {
  const set = (campo) => (v) => setEstado((s) => ({ ...s, [campo]: v }));

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
        {/* Medidor de nivel */}
        <div className="flex h-12 w-2 items-end overflow-hidden rounded-full bg-line">
          <div ref={medRef} className="w-full rounded-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500" style={{ height: "0%" }} />
        </div>
      </div>

      {/* Selector de pista */}
      <select
        className="input mb-3 py-1.5 text-sm"
        value={estado.track?.id || ""}
        onChange={(e) => {
          const p = biblioteca.find((t) => String(t.id) === e.target.value);
          if (p) onCargar(id, p);
        }}
      >
        <option value="">Cargar pista…</option>
        {biblioteca.map((t) => (
          <option key={t.id} value={t.id}>
            {t.titulo} — {t.artista}
          </option>
        ))}
      </select>

      {/* EQ de 3 bandas */}
      <div className="mb-3 flex justify-around rounded-lg bg-surface p-2">
        <EQ label="Hi" valor={estado.high} onChange={set("high")} />
        <EQ label="Mid" valor={estado.mid} onChange={set("mid")} />
        <EQ label="Low" valor={estado.low} onChange={set("low")} />
      </div>

      {/* Volumen */}
      <div className="mb-2">
        <div className="mb-1 flex justify-between text-[11px] text-muted">
          <span>Volumen</span>
          <span className="tabular-nums">{Math.round(estado.vol * 100)}%</span>
        </div>
        <input
          type="range" min="0" max="1" step="0.01" value={estado.vol}
          onChange={(e) => set("vol")(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500"
        />
      </div>

      {/* Tempo / pitch */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-[11px] text-muted">
          <span>Tempo</span>
          <span className="tabular-nums">{estado.tempo > 1 ? "+" : ""}{Math.round((estado.tempo - 1) * 100)}%</span>
        </div>
        <input
          type="range" min="0.9" max="1.1" step="0.005" value={estado.tempo}
          onChange={(e) => set("tempo")(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500"
        />
      </div>

      {/* Controles */}
      <div className="flex gap-2">
        <button onClick={() => onPlay(id)} className="btn-primary flex-1 py-2">
          {estado.playing ? <Pause size={16} /> : <Play size={16} />}
          {estado.playing ? "Pausa" : "Play"}
        </button>
        <button onClick={() => onCue(id)} className="btn-ghost px-3" title="Cue (volver al inicio)">
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
