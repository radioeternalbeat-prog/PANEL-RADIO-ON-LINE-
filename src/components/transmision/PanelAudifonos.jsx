import { useEffect } from "react";
import { Headphones, Volume2 } from "lucide-react";
import { useMezclador } from "../../context/MezcladorContext";

const SOPORTA_SINK = typeof Audio !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

export default function PanelAudifonos() {
  const {
    cue,
    alternarCue,
    monitorVol,
    setMonitorVol,
    mezcla,
    setMezcla,
    salidaId,
    setSalidaId,
    salidas,
    refrescarSalidas,
    prepararAudio,
  } = useMezclador();

  useEffect(() => {
    refrescarSalidas();
    navigator.mediaDevices?.addEventListener?.("devicechange", refrescarSalidas);
    return () =>
      navigator.mediaDevices?.removeEventListener?.("devicechange", refrescarSalidas);
  }, [refrescarSalidas]);

  const algunCue = cue.A || cue.B;

  return (
    <div className="card flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <Headphones size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Audífonos (monitor)</h3>
        </div>
        <span className={`badge ${algunCue ? "bg-brand-500/15 text-brand-500" : "bg-surface2 text-muted"}`}>
          {algunCue ? "Monitoreando" : "En silencio"}
        </span>
      </div>

      {/* CUE por deck */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {["A", "B"].map((id) => (
          <button
            key={id}
            onClick={() => alternarCue(id)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition ${
              cue[id]
                ? "border-brand-500 bg-brand-500/15 text-brand-500"
                : "border-line bg-surface2 text-muted hover:text-fg"
            }`}
          >
            <Headphones size={20} />
            <span className="text-xs font-bold">CUE {id}</span>
          </button>
        ))}
      </div>

      {/* Volumen del monitor */}
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
          <Volume2 size={13} /> Volumen del monitor
          <span className="ml-auto tabular-nums">{Math.round(monitorVol * 100)}%</span>
        </div>
        <input
          type="range" min="0" max="1" step="0.01" value={monitorVol}
          onChange={(e) => setMonitorVol(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500"
        />
      </div>

      {/* Mezcla CUE / MIX */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase text-muted">
          <span className={mezcla < 0.5 ? "text-brand-500" : ""}>Cue</span>
          <span>Mezcla</span>
          <span className={mezcla > 0.5 ? "text-brand-500" : ""}>Mix</span>
        </div>
        <input
          type="range" min="0" max="1" step="0.01" value={mezcla}
          onChange={(e) => setMezcla(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500"
        />
      </div>

      {/* Salida de audio (audífonos) */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase text-muted">
          Salida de audio
        </label>
        <select
          value={salidaId}
          onChange={(e) => {
            prepararAudio();
            setSalidaId(e.target.value);
          }}
          disabled={!SOPORTA_SINK}
          className="input py-1.5 text-sm"
        >
          <option value="">Salida predeterminada del sistema</option>
          {salidas.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              {d.label || `Salida ${i + 1}`}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[11px] text-muted">
          {SOPORTA_SINK
            ? "Elige tus audífonos aquí y deja el mix principal en la salida del sistema para monitorear sin que salga al aire."
            : "Tu navegador no permite elegir salida; el monitor sonará por la salida predeterminada (usa Chrome/Edge para separar audífonos)."}
        </p>
      </div>
    </div>
  );
}
