import { Pause, Play, Radio, Volume2, X } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export default function MiniReproductor() {
  const { estacionActual, reproduciendo, alternar, detener, volumen, setVolumen } = usePlayer();

  if (!estacionActual) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(680px,92vw)] -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Radio size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{estacionActual.nombre}</p>
          <p className="truncate text-xs text-slate-500">
            {reproduciendo ? estacionActual.cancionActual : "En pausa"}
          </p>
        </div>

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
