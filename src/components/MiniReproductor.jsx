import { Music2, Pause, Play, Radio, Volume2, X } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export default function MiniReproductor() {
  const { medioActual, reproduciendo, alternar, detener, volumen, setVolumen, error } =
    usePlayer();

  if (!medioActual) return null;

  const esPista = medioActual.tipo === "pista";

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(680px,92vw)] -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        {medioActual.artwork ? (
          <img
            src={medioActual.artwork}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            {esPista ? <Music2 size={20} /> : <Radio size={20} />}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{medioActual.titulo}</p>
          <p className="truncate text-xs text-slate-500">
            {error
              ? error
              : reproduciendo
                ? medioActual.subtitulo || (esPista ? "Reproduciendo preview" : "En vivo")
                : "En pausa"}
          </p>
        </div>

        {esPista && (
          <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">
            Preview 30s · iTunes
          </span>
        )}

        <button
          onClick={alternar}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"
          aria-label={reproduciendo ? "Pausar" : "Reproducir"}
        >
          {reproduciendo ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <Volume2 size={18} className="text-slate-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volumen}
            onChange={(e) => setVolumen(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer accent-brand-600"
          />
        </div>

        <button
          onClick={detener}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar reproductor"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
