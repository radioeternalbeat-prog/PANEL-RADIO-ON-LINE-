import { Music2, Pause, Play, Radio, Sparkles, Volume2, X } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useAutomatizacion } from "../context/AutomatizacionContext";

// Mini ecualizador que retoma el motivo visual del cartel ON AIR.
function MiniEq({ activo }) {
  return (
    <span className="flex h-3.5 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${activo ? "bg-white animate-eq" : "bg-current opacity-40"}`}
          style={activo ? { animationDelay: `${i * 0.18}s` } : { height: "35%" }}
        />
      ))}
    </span>
  );
}

// Interruptor de piloto automático, coherente con el diseño del panel.
// variant="bar"  -> compacto, dentro de la barra del reproductor.
// variant="pill" -> destacado, píldora flotante cuando no hay nada sonando.
function BotonAuto({ variant = "bar" }) {
  const { auto, activarAuto, desactivarAuto } = useAutomatizacion();
  const onClick = () => (auto ? desactivarAuto() : activarAuto());
  const titulo = auto
    ? "Piloto automático activo · clic para pasar a manual"
    : "Activar piloto automático";

  const base =
    "group relative flex shrink-0 items-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-brand-500/40";
  const estado = auto
    ? "border-transparent bg-brand-grad text-white shadow-glow"
    : "border-line bg-surface2 text-muted hover:border-brand-500/50 hover:text-fg";

  if (variant === "pill") {
    return (
      <button onClick={onClick} title={titulo} className={`${base} ${estado} gap-3 py-1.5 pl-1.5 pr-4`}>
        <span
          className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
            auto ? "bg-white/20" : "bg-surface text-muted group-hover:text-fg"
          }`}
        >
          {auto && (
            <span className="absolute inset-0 animate-ping rounded-full bg-white/25" />
          )}
          <Sparkles size={17} />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span
            className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${
              auto ? "text-white/80" : "text-muted"
            }`}
          >
            Piloto
          </span>
          <span className="font-display text-sm font-extrabold tracking-tight">
            {auto ? "AUTO" : "MANUAL"}
          </span>
        </span>
        <MiniEq activo={auto} />
      </button>
    );
  }

  // Variante compacta para la barra del reproductor.
  return (
    <button
      onClick={onClick}
      title={titulo}
      className={`${base} ${estado} hidden gap-2 px-3 py-1.5 sm:flex`}
    >
      <span className="relative flex items-center">
        {auto && <span className="absolute -left-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-white/60" />}
        <Sparkles size={14} />
      </span>
      <span className="font-display text-xs font-extrabold tracking-wide">
        {auto ? "AUTO" : "MANUAL"}
      </span>
      <MiniEq activo={auto} />
    </button>
  );
}

export default function MiniReproductor() {
  const { medioActual, reproduciendo, alternar, detener, volumen, setVolumen, error } =
    usePlayer();

  // Cuando no hay nada sonando: píldora flotante solo con el piloto automático.
  if (!medioActual) {
    return (
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
        <BotonAuto variant="pill" />
      </div>
    );
  }

  const esPista = medioActual.tipo === "pista";

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(720px,92vw)] -translate-x-1/2">
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

        <BotonAuto />

        {esPista && (
          <span className="hidden rounded-full border border-line bg-surface2 px-2 py-0.5 text-[10px] font-semibold text-muted lg:inline">
            Preview 30s · iTunes
          </span>
        )}

        <button
          onClick={alternar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-500"
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface2 hover:text-fg"
          aria-label="Cerrar reproductor"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
