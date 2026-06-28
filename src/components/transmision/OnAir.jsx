import { useEffect, useRef } from "react";
import { Power, Radio } from "lucide-react";
import { nivelMaximo } from "../../audio/nivelBus";
import { useOnAir } from "../../context/OnAirContext";

const NUM_BARRAS = 7;

export default function OnAir() {
  const { enVivo, setEnVivo } = useOnAir();
  const barrasRef = useRef([]);
  const enVivoRef = useRef(enVivo);
  enVivoRef.current = enVivo;

  // Anima las barras del ecualizador con el nivel de audio real (+ leve oscilación).
  useEffect(() => {
    let raf;
    function loop(t) {
      const activo = enVivoRef.current;
      const nivel = nivelMaximo(); // 0..1
      for (let i = 0; i < barrasRef.current.length; i++) {
        const el = barrasRef.current[i];
        if (!el) continue;
        if (!activo) {
          el.style.height = "12%";
          continue;
        }
        // Oscilación base para que "respire" aunque haya silencio.
        const fase = t / 220 + i * 0.7;
        const base = 18 + Math.sin(fase) * 10;
        const reactivo = Math.min(100, nivel * 320 * (0.6 + 0.7 * Math.abs(Math.sin(i + fase))));
        el.style.height = `${Math.max(base, reactivo)}%`;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <button
      onClick={() => setEnVivo((v) => !v)}
      title={enVivo ? "Cortar transmisión (OFF AIR)" : "Salir al aire (ON AIR)"}
      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border px-5 py-3 transition sm:w-auto ${
        enVivo
          ? "border-red-500/60 bg-gradient-to-r from-red-600/20 to-red-500/5 shadow-[0_0_25px_-6px_rgba(239,68,68,0.7)]"
          : "border-line bg-surface2 hover:border-brand-500/50"
      }`}
    >
      {/* Indicador / botón de encendido */}
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
          enVivo ? "bg-red-500 text-white" : "bg-surface text-muted group-hover:text-fg"
        }`}
      >
        {enVivo && <span className="absolute left-5 h-11 w-11 animate-ping rounded-full bg-red-500/30" />}
        {enVivo ? <Radio size={20} /> : <Power size={20} />}
      </span>

      {/* Texto de estado */}
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
          {enVivo ? "En transmisión" : "Fuera del aire"}
        </span>
        <span
          className={`font-display text-xl font-extrabold tracking-tight ${
            enVivo ? "text-red-500" : "text-muted"
          }`}
        >
          {enVivo ? "ON AIR" : "OFF AIR"}
        </span>
      </span>

      {/* Ecualizador reactivo */}
      <span className="ml-2 flex h-9 items-end gap-1">
        {Array.from({ length: NUM_BARRAS }).map((_, i) => (
          <span
            key={i}
            ref={(el) => (barrasRef.current[i] = el)}
            className={`w-1.5 rounded-full ${enVivo ? "bg-red-500" : "bg-line"}`}
            style={{ height: "12%" }}
          />
        ))}
      </span>
    </button>
  );
}
