import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Music3, Play, Plus, Trash2, Upload, Zap } from "lucide-react";
import { api, subirSample, urlRecurso } from "../../api/client";
import { useMidiTarget } from "../../context/MidiContext";

const PADS_MIDI = 9;

const CATEGORIAS = [
  { id: "jingle", label: "Jingle", Icon: Music3 },
  { id: "efecto", label: "Efecto", Icon: Zap },
  { id: "voz", label: "Voz", Icon: Mic },
];

const COLOR_CAT = {
  jingle: "from-brand-500 to-brand-700",
  efecto: "from-amber-500 to-orange-600",
  voz: "from-cyan-500 to-sky-600",
};

export default function PanelSoundboard() {
  const [samples, setSamples] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [categoria, setCategoria] = useState("jingle");
  const [sonando, setSonando] = useState(null);
  const inputFile = useRef(null);
  const audios = useRef({}); // id -> HTMLAudioElement

  async function cargar() {
    try {
      setSamples(await api.samples());
    } catch {
      /* noop */
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    return () => {
      Object.values(audios.current).forEach((a) => a.pause());
    };
  }, []);

  async function onArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setSubiendo(true);
    try {
      const nombre = archivo.name.replace(/\.[^.]+$/, "");
      await subirSample({ archivo, nombre, categoria });
      await cargar();
    } catch (err) {
      alert(err.message || "No se pudo subir el audio.");
    } finally {
      setSubiendo(false);
    }
  }

  function disparar(s) {
    let audio = audios.current[s.id];
    if (!audio) {
      audio = new Audio(urlRecurso(s.url));
      audio.addEventListener("ended", () => setSonando((p) => (p === s.id ? null : p)));
      audios.current[s.id] = audio;
    }
    audio.currentTime = 0;
    audio.play().then(() => setSonando(s.id)).catch(() => {});
  }

  function detener(s) {
    const audio = audios.current[s.id];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setSonando((p) => (p === s.id ? null : p));
  }

  function detenerTodos() {
    Object.values(audios.current).forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    setSonando(null);
  }

  async function eliminar(s) {
    detener(s);
    setSamples((prev) => prev.filter((x) => x.id !== s.id));
    try {
      await api.eliminarSample(s.id);
    } catch {
      cargar();
    }
  }

  // --- Mapeo MIDI: hasta 9 pads fijos por posición (igual que un
  // controlador con grid de pads). Se declara un número fijo de hooks
  // (las reglas de Hooks no permiten un número variable) y cada uno
  // dispara el sample que ocupe esa posición en el momento de pulsar.
  for (let i = 0; i < PADS_MIDI; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMidiTarget(`soundboard.pad${i + 1}`, () => {
      const s = samples[i];
      if (s) disparar(s);
    });
  }
  useMidiTarget("soundboard.detenerTodos", () => detenerTodos());
  // "Pánico" global también silencia el soundboard cuando este panel está montado.
  useMidiTarget("global.panico", () => detenerTodos());

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <Zap size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Soundboard</h3>
        </div>
        <input ref={inputFile} type="file" accept="audio/*" className="hidden" onChange={onArchivo} />
        <button
          onClick={() => inputFile.current?.click()}
          className="btn-primary px-3 py-1.5 text-xs"
          disabled={subiendo}
        >
          {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Subir
        </button>
      </div>

      {/* Selector de categoría para la próxima subida */}
      <div className="mb-3 flex gap-1">
        {CATEGORIAS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setCategoria(id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
              categoria === id ? "bg-brand-600 text-white" : "bg-surface2 text-muted hover:text-fg"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Grilla de pads */}
      <div className="flex-1 overflow-y-auto">
        {cargando ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="animate-spin text-brand-500" size={22} />
          </div>
        ) : samples.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-muted">
            <Plus size={28} />
            <p className="text-sm">Sube jingles, efectos o voces para dispararlos al aire.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {samples.map((s) => {
              const activo = sonando === s.id;
              return (
                <div key={s.id} className="group relative">
                  <button
                    onClick={() => (activo ? detener(s) : disparar(s))}
                    className={`flex h-20 w-full flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br ${
                      COLOR_CAT[s.categoria] || COLOR_CAT.efecto
                    } p-2 text-white shadow-sm transition active:scale-95 ${
                      activo ? "ring-2 ring-white/70" : ""
                    }`}
                    title={s.nombre}
                  >
                    <Play size={18} className={activo ? "animate-pulse" : ""} />
                    <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight">
                      {s.nombre}
                    </span>
                  </button>
                  <button
                    onClick={() => eliminar(s)}
                    className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                    title="Eliminar"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
