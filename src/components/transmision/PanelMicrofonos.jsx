import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useMezclador } from "../../context/MezcladorContext";

const NUM_MICS = 4;
const STORAGE = "prb_micros";

function microsIniciales() {
  const base = Array.from({ length: NUM_MICS }, (_, i) => ({
    nombre: `Mic ${i + 1}`,
    activo: false,
    deviceId: "",
    vol: 0.9,
    low: 0,
    mid: 0,
    high: 0,
  }));
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE) || "[]");
    return base.map((m, i) =>
      guardado[i]
        ? { ...m, nombre: guardado[i].nombre ?? m.nombre, vol: guardado[i].vol ?? m.vol, low: guardado[i].low ?? 0, mid: guardado[i].mid ?? 0, high: guardado[i].high ?? 0, deviceId: guardado[i].deviceId ?? "" }
        : m
    );
  } catch {
    return base;
  }
}

export default function PanelMicrofonos() {
  const { obtenerNodos } = useMezclador();
  const [micros, setMicros] = useState(microsIniciales);
  const [dispositivos, setDispositivos] = useState([]);
  const [silencio, setSilencio] = useState(false);

  // Nodos por micrófono: { stream, source, low, mid, high, gain, analyser }
  const micsRef = useRef(Array.from({ length: NUM_MICS }, () => null));
  const nivelRefs = useRef(Array.from({ length: NUM_MICS }, () => null));
  const grafoCacheRef = useRef(null);
  const silencioRef = useRef(silencio);
  silencioRef.current = silencio;

  // Persistir configuración (sin el estado 'activo').
  useEffect(() => {
    const guardable = micros.map(({ nombre, deviceId, vol, low, mid, high }) => ({
      nombre, deviceId, vol, low, mid, high,
    }));
    localStorage.setItem(STORAGE, JSON.stringify(guardable));
  }, [micros]);

  async function refrescarDispositivos() {
    try {
      const lista = await navigator.mediaDevices.enumerateDevices();
      setDispositivos(lista.filter((d) => d.kind === "audioinput"));
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    refrescarDispositivos();
    navigator.mediaDevices?.addEventListener?.("devicechange", refrescarDispositivos);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refrescarDispositivos);
      micsRef.current.forEach((m) => m?.stream?.getTracks().forEach((t) => t.stop()));
    };
  }, []);

  // Medidores + ducking
  useEffect(() => {
    let raf;
    const buf = new Uint8Array(256);
    function rms(an) {
      an.getByteTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        s += v * v;
      }
      return Math.sqrt(s / buf.length);
    }
    function loop() {
      let maxNivel = 0;
      for (let i = 0; i < NUM_MICS; i++) {
        const m = micsRef.current[i];
        if (m?.analyser) {
          const n = rms(m.analyser);
          if (n > maxNivel) maxNivel = n;
          if (nivelRefs.current[i]) nivelRefs.current[i].style.width = `${Math.min(100, n * 260)}%`;
        } else if (nivelRefs.current[i]) {
          nivelRefs.current[i].style.width = "0%";
        }
      }
      const g = grafoCacheRef.current;
      if (g?.duckGain) {
        const objetivo = !silencioRef.current && maxNivel > 0.04 ? 0.25 : 1;
        g.duckGain.gain.setTargetAtTime(objetivo, g.ctx.currentTime, 0.08);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function encender(i, conf) {
    const g = obtenerNodos();
    if (!g) return;
    grafoCacheRef.current = g;
    const prev = micsRef.current[i];
    if (prev) {
      prev.stream?.getTracks().forEach((t) => t.stop());
      try { prev.source.disconnect(); prev.gain.disconnect(); } catch { /* noop */ }
    }
    const constraints = { audio: conf.deviceId ? { deviceId: { exact: conf.deviceId } } : true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const source = g.ctx.createMediaStreamSource(stream);
    const low = g.ctx.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 200;
    low.gain.value = conf.low;
    const mid = g.ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1800; // presencia de voz
    mid.Q.value = 0.7;
    mid.gain.value = conf.mid;
    const high = g.ctx.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = 5000;
    high.gain.value = conf.high;
    const gain = g.ctx.createGain();
    gain.gain.value = silencioRef.current ? 0 : conf.vol;
    const analyser = g.ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(low);
    low.connect(mid);
    mid.connect(high);
    high.connect(gain);
    gain.connect(g.masterGain); // al aire
    gain.connect(analyser); // medición + ducking
    micsRef.current[i] = { stream, source, low, mid, high, gain, analyser };
    refrescarDispositivos();
  }

  function apagar(i) {
    const m = micsRef.current[i];
    if (m) {
      m.stream?.getTracks().forEach((t) => t.stop());
      try { m.source.disconnect(); m.gain.disconnect(); } catch { /* noop */ }
      micsRef.current[i] = null;
    }
    if (nivelRefs.current[i]) nivelRefs.current[i].style.width = "0%";
  }

  async function toggle(i) {
    const activo = !micros[i].activo;
    setMicros((arr) => arr.map((m, j) => (j === i ? { ...m, activo } : m)));
    if (activo) {
      try {
        await encender(i, micros[i]);
      } catch {
        setMicros((arr) => arr.map((m, j) => (j === i ? { ...m, activo: false } : m)));
        alert("No se pudo acceder al micrófono.");
      }
    } else {
      apagar(i);
    }
  }

  function actualizar(i, campo, valor) {
    setMicros((arr) => arr.map((m, j) => (j === i ? { ...m, [campo]: valor } : m)));
    const m = micsRef.current[i];
    if (!m) return;
    if (campo === "vol" && !silencioRef.current) m.gain.gain.value = valor;
    if (campo === "low") m.low.gain.value = valor;
    if (campo === "mid") m.mid.gain.value = valor;
    if (campo === "high") m.high.gain.value = valor;
  }

  async function cambiarDispositivo(i, deviceId) {
    setMicros((arr) => arr.map((m, j) => (j === i ? { ...m, deviceId } : m)));
    if (micros[i].activo) {
      try { await encender(i, { ...micros[i], deviceId }); } catch { /* noop */ }
    }
  }

  function alternarSilencio() {
    const nuevo = !silencio;
    setSilencio(nuevo);
    silencioRef.current = nuevo;
    micros.forEach((m, i) => {
      const nodo = micsRef.current[i];
      if (nodo) nodo.gain.gain.value = nuevo ? 0 : m.vol;
    });
  }

  const activos = micros.filter((m) => m.activo).length;

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <Mic size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Micrófonos</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${activos ? "bg-red-500/15 text-red-500" : "bg-surface2 text-muted"}`}>
            {activos ? `${activos} al aire` : "En silencio"}
          </span>
          <button
            onClick={alternarSilencio}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              silencio ? "bg-red-500 text-white" : "bg-surface2 text-muted hover:text-fg"
            }`}
            title="Silenciar todos los micrófonos (mute global)"
          >
            {silencio ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {silencio ? "Silenciados" : "Mute"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {micros.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl border bg-surface2 p-3 transition ${
              m.activo && !silencio ? "border-red-500/50" : "border-line"
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggle(i)}
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  m.activo
                    ? "border-red-500 bg-red-500/15 text-red-500"
                    : "border-line bg-surface text-muted hover:border-brand-500/50 hover:text-fg"
                }`}
                title={m.activo ? "Apagar" : "Encender"}
              >
                {m.activo && !silencio && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />}
                {m.activo ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <div className="min-w-0 flex-1">
                {/* Nombre editable */}
                <input
                  value={m.nombre}
                  onChange={(e) => actualizar(i, "nombre", e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-fg focus:outline-none"
                  title="Editar nombre"
                  maxLength={20}
                />
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    ref={(el) => (nivelRefs.current[i] = el)}
                    className="h-full rounded-full bg-red-500 transition-[width] duration-75"
                    style={{ width: "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* EQ de voz */}
            <div className="mt-3 flex items-center justify-around rounded-lg bg-surface p-2">
              {[
                ["Graves", "low"],
                ["Medios", "mid"],
                ["Agudos", "high"],
              ].map(([etq, campo]) => (
                <div key={campo} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold uppercase text-muted">{etq}</span>
                  <input
                    type="range" min="-18" max="18" step="1" value={m[campo]}
                    onChange={(e) => actualizar(i, campo, Number(e.target.value))}
                    className="h-1.5 w-12 cursor-pointer accent-brand-500"
                  />
                </div>
              ))}
            </div>

            {/* Volumen */}
            <div className="mt-2 flex items-center gap-2">
              <Volume2 size={13} className="text-muted" />
              <input
                type="range" min="0" max="1" step="0.01" value={m.vol}
                onChange={(e) => actualizar(i, "vol", Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-brand-500"
              />
              <span className="w-7 text-right text-[10px] tabular-nums text-muted">{Math.round(m.vol * 100)}</span>
            </div>

            {/* Dispositivo */}
            <select
              value={m.deviceId}
              onChange={(e) => cambiarDispositivo(i, e.target.value)}
              className="input mt-2 py-1 text-xs"
              title="Elegir micrófono"
            >
              <option value="">Predeterminado</option>
              {dispositivos.map((d, k) => (
                <option key={d.deviceId || k} value={d.deviceId}>
                  {d.label || `Entrada ${k + 1}`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Cada entrada sale al aire y baja la música al hablar (ducking). El nombre es editable.
        Usa <span className="font-semibold text-fg">audífonos</span> para evitar acoples.
      </p>
    </div>
  );
}
