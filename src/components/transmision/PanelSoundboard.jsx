import { useEffect, useRef, useState } from "react";
import { AudioLines, Loader2, Music3, Pause, Play, Plus, Trash2, Zap } from "lucide-react";
import { api, subirSample, urlRecurso } from "../../api/client";

const SLOTS = 6;

const CATEGORIAS = [
  { id: "jingle", label: "Jingles", Icon: Music3, grad: "from-brand-500 to-brand-700" },
  { id: "efecto", label: "Efectos", Icon: Zap, grad: "from-amber-500 to-orange-600" },
  { id: "voz", label: "Samples", Icon: AudioLines, grad: "from-cyan-500 to-sky-600" },
];

export default function PanelSoundboard() {
  const [samples, setSamples] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(null); // `${cat}-${slot}`
  const [sonando, setSonando] = useState(null); // id del sample
  const inputFile = useRef(null);
  const pendienteRef = useRef(null); // { categoria, slot }
  const audios = useRef({}); // id -> Audio

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
    return () => Object.values(audios.current).forEach((a) => a.pause());
  }, []);

  function buscarSample(categoria, slot) {
    return samples.find((s) => s.categoria === categoria && (s.slot ?? 0) === slot);
  }

  function pedirArchivo(categoria, slot) {
    pendienteRef.current = { categoria, slot };
    inputFile.current?.click();
  }

  async function onArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    const dest = pendienteRef.current;
    if (!archivo || !dest) return;
    const clave = `${dest.categoria}-${dest.slot}`;
    setSubiendo(clave);
    try {
      const nombre = archivo.name.replace(/\.[^.]+$/, "");
      await subirSample({ archivo, nombre, categoria: dest.categoria, slot: dest.slot });
      await cargar();
    } catch (err) {
      alert(err.message || "No se pudo subir el audio.");
    } finally {
      setSubiendo(null);
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

  async function eliminar(s) {
    detener(s);
    setSamples((prev) => prev.filter((x) => x.id !== s.id));
    try {
      await api.eliminarSample(s.id);
    } catch {
      cargar();
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-muted">
        <Zap size={16} className="text-brand-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">Soundboard</h3>
      </div>

      <input ref={inputFile} type="file" accept="audio/*" className="hidden" onChange={onArchivo} />

      {cargando ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="animate-spin text-brand-500" size={22} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {CATEGORIAS.map((cat) => (
            <div key={cat.id}>
              <div className="mb-2 flex items-center gap-2">
                <cat.Icon size={14} className="text-brand-500" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-fg">{cat.label}</h4>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
                {Array.from({ length: SLOTS }).map((_, slot) => {
                  const s = buscarSample(cat.id, slot);
                  const clave = `${cat.id}-${slot}`;
                  const cargandoCaja = subiendo === clave;
                  const activo = s && sonando === s.id;

                  if (cargandoCaja) {
                    return (
                      <div key={slot} className="flex aspect-square items-center justify-center rounded-xl border border-line bg-surface2">
                        <Loader2 size={18} className="animate-spin text-brand-500" />
                      </div>
                    );
                  }

                  if (!s) {
                    // Caja vacía: cargar un sonido
                    return (
                      <button
                        key={slot}
                        onClick={() => pedirArchivo(cat.id, slot)}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-surface2 text-muted transition hover:border-brand-500/60 hover:text-brand-500"
                        title="Cargar sonido"
                      >
                        <Plus size={18} />
                        <span className="text-[9px]">Cargar</span>
                      </button>
                    );
                  }

                  // Caja con sonido
                  return (
                    <div key={slot} className="group relative">
                      <button
                        onClick={() => (activo ? detener(s) : disparar(s))}
                        className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br ${cat.grad} p-1 text-white shadow-sm transition active:scale-95 ${
                          activo ? "ring-2 ring-white/70" : ""
                        }`}
                        title={s.nombre}
                      >
                        {activo ? <Pause size={16} /> : <Play size={16} />}
                        <span className="line-clamp-2 px-0.5 text-center text-[9px] font-semibold leading-tight">
                          {s.nombre}
                        </span>
                      </button>
                      <button
                        onClick={() => eliminar(s)}
                        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                        title="Vaciar caja"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted">
        6 cajas por categoría. Pulsa <span className="font-semibold text-fg">+ Cargar</span> en una caja
        vacía para asignarle un sonido independiente; tócala para dispararlo al aire.
      </p>
    </div>
  );
}
