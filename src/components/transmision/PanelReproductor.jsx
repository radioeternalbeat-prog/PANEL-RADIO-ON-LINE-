import { Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { useMidiTarget } from "../../context/MidiContext";

function fmt(s) {
  if (!s || !Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

export default function PanelReproductor() {
  const {
    medioActual,
    reproduciendo,
    alternar,
    siguiente,
    anterior,
    progreso,
    buscar,
    volumen,
    setVolumen,
    cola,
    indiceCola,
    detener,
    setModoAuto,
  } = usePlayer();

  // --- Mapeo MIDI: transporte del reproductor principal (AutoDJ/estación).
  useMidiTarget("reproductor.playPause", () => alternar());
  useMidiTarget("reproductor.detener", () => detener());
  useMidiTarget("reproductor.siguiente", () => siguiente());
  useMidiTarget("reproductor.anterior", () => anterior());
  useMidiTarget("reproductor.avanzar10", () => buscar((progreso.actual || 0) + 10));
  useMidiTarget("reproductor.retroceder10", () => buscar(Math.max(0, (progreso.actual || 0) - 10)));
  useMidiTarget("reproductor.volumen", (v) => setVolumen(v));
  useMidiTarget("reproductor.modoAuto", () => setModoAuto((a) => !a));

  return (
    <div className="card p-4">
      {/* Encabezado */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Reproductor</h3>
        {reproduciendo ? (
          <span className="badge bg-red-500/15 text-red-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> AL AIRE
          </span>
        ) : (
          <span className="badge bg-surface2 text-muted">En pausa</span>
        )}
      </div>

      {/* Carátula + título (compacto, horizontal) */}
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface2">
          {medioActual?.artwork ? (
            <img src={medioActual.artwork} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-grad text-white">
              <Music2 size={24} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">
            {medioActual?.titulo || "Sin reproducción"}
          </p>
          <p className="truncate text-xs text-muted">
            {medioActual?.subtitulo || "Carga la biblioteca para empezar"}
          </p>
        </div>
        {/* Controles compactos */}
        <div className="flex items-center gap-2">
          <button
            onClick={anterior}
            disabled={indiceCola <= 0}
            className="text-muted transition hover:text-fg disabled:opacity-40"
            title="Anterior"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={alternar}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow transition hover:bg-brand-500"
          >
            {reproduciendo ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <button
            onClick={siguiente}
            disabled={indiceCola >= cola.length - 1}
            className="text-muted transition hover:text-fg disabled:opacity-40"
            title="Siguiente"
          >
            <SkipForward size={18} />
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-3">
        <input
          type="range"
          min="0"
          max={progreso.total || 0}
          value={progreso.actual || 0}
          onChange={(e) => buscar(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500"
        />
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
          <span>{fmt(progreso.actual)}</span>
          <span>{fmt(progreso.total)}</span>
        </div>
      </div>

      {/* Volumen */}
      <div className="mt-2 flex items-center gap-2">
        <Volume2 size={15} className="text-muted" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volumen}
          onChange={(e) => setVolumen(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-brand-500"
        />
      </div>
    </div>
  );
}
