import { Music2, Pause, Play, Radio, Volume2, X } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export default function MiniReproductor() {
  const { medioActual, reproduciendo, alternar, detener, volumen, setVolumen, error } =
    usePlayer();

  if (!medioActual) return null;

  const esPista = medioActual.tipo === "pista";

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(680px,92vw)] -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-glow backdrop-blur">
        {medioActual.artwork ? (
          <img
            src={medioActual.artwork}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-grad text-white">
            {esPista ? <Music2 size={20} /> : <Radio size={20} />}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{medioActual.titulo}</p>
          <p className="truncate text-xs text-muted">
            {error
              ? error
              : reproduciendo
                ? medioActual.subtitulo || (esPista ? "Reproduciendo preview" : "En vivo")
                : "En pausa"}
          </p>
        </div>

        {esPista && (
          <span className="hidden rounded-full border border-line bg-surface2 px-2 py-0.5 text-[10px] font-semibold text-muted sm:inline">
            Preview 30s · iTunes
          </span>
        )}

        <button
          onClick={alternar}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-500"
          aria-label={reproduciendo ? "Pausar" : "Reproducir"}
        >
          {reproduciendo ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <Volume2 size={18} className="text-muted" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volumen}
            onChange={(e) => setVolumen(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer accent-brand-500"
          />
        </div>

        <button
          onClick={detener}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface2 hover:text-fg"
          aria-label="Cerrar reproductor"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
