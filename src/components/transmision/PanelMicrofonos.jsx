import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useMezclador } from "../../context/MezcladorContext";

const NUM_MICS = 4;

export default function PanelMicrofonos() {
  const { obtenerNodos } = useMezclador();
  const [micros, setMicros] = useState(
    Array.from({ length: NUM_MICS }, () => ({ activo: false, deviceId: "", vol: 0.9 }))
  );
  const [dispositivos, setDispositivos] = useState([]);

  // Nodos de audio por micrófono: { stream, source, gain, analyser }
  const micsRef = useRef(Array.from({ length: NUM_MICS }, () => null));
  const nivelRefs = useRef(Array.from({ length: NUM_MICS }, () => null));

  // --- Dispositivos ---
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
      // Apagar todos los micrófonos al desmontar.
      micsRef.current.forEach((m) => m?.stream?.getTracks().forEach((t) => t.stop()));
    };
  }, []);

  // --- Medidores de nivel + ducking ---
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
      // Ducking: si alguien habla, baja la música (duckGain del mezclador).
      const g = obtenerNodosSilencioso();
      if (g?.duckGain) {
        const objetivo = maxNivel > 0.04 ? 0.25 : 1;
        g.duckGain.gain.setTargetAtTime(objetivo, g.ctx.currentTime, 0.08);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Obtiene los nodos solo si el grafo ya existe (sin forzar su creación en el rAF).
  const grafoCacheRef = useRef(null);
  function obtenerNodosSilencioso() {
    if (grafoCacheRef.current) return grafoCacheRef.current;
    return null;
  }

  async function encender(i, deviceId) {
    const g = obtenerNodos(); // asegura/crea el grafo del mezclador
    if (!g) return;
    grafoCacheRef.current = g;
    // Cerrar anterior
    const prev = micsRef.current[i];
    if (prev) {
      prev.stream?.getTracks().forEach((t) => t.stop());
      try { prev.source.disconnect(); prev.gain.disconnect(); } catch { /* noop */ }
    }
    const constraints = { audio: deviceId ? { deviceId: { exact: deviceId } } : true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const source = g.ctx.createMediaStreamSource(stream);
    const gain = g.ctx.createGain();
    gain.gain.value = micros[i].vol;
    const analyser = g.ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(gain);
    gain.connect(g.masterGain); // al aire (entra en la mezcla principal)
    source.connect(analyser); // medición + ducking
    micsRef.current[i] = { stream, source, gain, analyser };
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
        await encender(i, micros[i].deviceId);
      } catch {
        setMicros((arr) => arr.map((m, j) => (j === i ? { ...m, activo: false } : m)));
        alert("No se pudo acceder al micrófono.");
      }
    } else {
      apagar(i);
    }
  }

  async function cambiarDispositivo(i, deviceId) {
    setMicros((arr) => arr.map((m, j) => (j === i ? { ...m, deviceId } : m)));
    if (micros[i].activo) {
      try { await encender(i, deviceId); } catch { /* noop */ }
    }
  }

  function cambiarVol(i, vol) {
    setMicros((arr) => arr.map((m, j) => (j === i ? { ...m, vol } : m)));
    const m = micsRef.current[i];
    if (m) m.gain.gain.value = vol;
  }

  const activos = micros.filter((m) => m.activo).length;

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <Mic size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Micrófonos</h3>
        </div>
        <span className={`badge ${activos ? "bg-red-500/15 text-red-500" : "bg-surface2 text-muted"}`}>
          {activos ? `${activos} al aire` : "En silencio"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {micros.map((m, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface2 p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggle(i)}
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  m.activo
                    ? "border-red-500 bg-red-500/15 text-red-500"
                    : "border-line bg-surface text-muted hover:border-brand-500/50 hover:text-fg"
                }`}
                title={m.activo ? "Apagar micrófono" : "Encender micrófono"}
              >
                {m.activo && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />}
                {m.activo ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase text-brand-500">Mic {i + 1}</p>
                {/* Nivel */}
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    ref={(el) => (nivelRefs.current[i] = el)}
                    className="h-full rounded-full bg-red-500 transition-[width] duration-75"
                    style={{ width: "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Volumen */}
            <div className="mt-3 flex items-center gap-2">
              <Volume2 size={13} className="text-muted" />
              <input
                type="range" min="0" max="1" step="0.01" value={m.vol}
                onChange={(e) => cambiarVol(i, Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-brand-500"
              />
              <span className="w-8 text-right text-[10px] tabular-nums text-muted">
                {Math.round(m.vol * 100)}
              </span>
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
        Los micrófonos entran en la mezcla al aire y bajan la música automáticamente al hablar
        (ducking). Usa <span className="font-semibold text-fg">audífonos</span> para evitar acoples.
      </p>
    </div>
  );
}
