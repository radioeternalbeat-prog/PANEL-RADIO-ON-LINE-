import { useEffect, useState } from "react";
import { Check, Headphones, Loader2, Music2, Radio, Share2 } from "lucide-react";
import { api } from "../api/client";
import ReproductorCaster from "../components/ReproductorCaster";

// Página PÚBLICA de radio para los oyentes (no requiere iniciar sesión).
// Muestra marca, reproductor en vivo, estado "al aire", "ahora suena" y oyentes.
export default function RadioPublica() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function cargar() {
    try {
      setDatos(await api.radioPublica());
      setError("");
    } catch (err) {
      setError(err.message || "No se pudo cargar la radio.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000); // refresca oyentes / ahora suena
    return () => clearInterval(t);
  }, []);

  function compartir() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: datos?.nombre || "Radio", url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      });
    }
  }

  const enVivo = datos?.enVivo;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#101014] text-white">
      {/* Fondo con resplandor de marca */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent-500/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col items-center px-5 py-10">
        {/* Logo */}
        <img
          src="/logo-horizontal-light.png"
          alt="Eternal Beat"
          className="h-12 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        {cargando ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="animate-spin text-brand-500" size={36} />
          </div>
        ) : error ? (
          <div className="mt-20 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center">
            <Radio className="mx-auto mb-3 text-brand-500" size={32} />
            <p className="text-white/80">{error}</p>
          </div>
        ) : (
          <div className="mt-8 w-full">
            {/* Estado al aire */}
            <div className="mb-4 flex items-center justify-center">
              <span
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${
                  enVivo ? "bg-brand-grad text-white shadow-glow" : "bg-white/10 text-white/60"
                }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  {enVivo && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                      enVivo ? "bg-white" : "bg-white/50"
                    }`}
                  />
                </span>
                {enVivo ? "Al aire" : "Fuera del aire"}
              </span>
            </div>

            {/* Nombre */}
            <h1 className="text-center font-display text-4xl font-extrabold tracking-tight">
              {datos.nombre}
            </h1>
            <p className="mt-1 text-center text-sm text-white/50">
              {datos.formato} · {datos.bitrate} kbps · Eternal Beat Medios
            </p>

            {/* Ahora suena */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-grad">
                <Music2 size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Ahora suena
                </p>
                <p className="truncate font-semibold">
                  {datos.cancionActual && datos.cancionActual !== "—"
                    ? datos.cancionActual
                    : enVivo
                      ? "Transmisión en vivo"
                      : "Sin emisión"}
                </p>
              </div>
            </div>

            {/* Reproductor en vivo */}
            {datos.embedToken && datos.embedCanal ? (
              <div className="mt-4">
                <ReproductorCaster
                  publicToken={datos.embedToken}
                  channelId={datos.embedCanal}
                  theme="dark"
                  minHeight={120}
                />
              </div>
            ) : datos.streamUrl ? (
              <audio controls preload="none" className="mt-4 w-full">
                <source src={datos.streamUrl} type="audio/mpeg" />
              </audio>
            ) : null}

            {/* Métricas + compartir */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <Headphones size={16} className="mx-auto text-brand-500" />
                <p className="mt-1 font-display text-xl font-bold leading-none">{datos.oyentes}</p>
                <p className="mt-1 text-[10px] text-white/40">Oyentes</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <Radio size={16} className="mx-auto text-brand-500" />
                <p className="mt-1 font-display text-xl font-bold leading-none">{datos.pico}</p>
                <p className="mt-1 text-[10px] text-white/40">Pico</p>
              </div>
              <button
                onClick={compartir}
                className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
              >
                {copiado ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Share2 size={16} className="text-brand-500" />
                )}
                <p className="mt-1 text-[10px] text-white/50">{copiado ? "¡Copiado!" : "Compartir"}</p>
              </button>
            </div>
          </div>
        )}

        <div className="mt-auto pt-10 text-center text-xs text-white/30">
          Powered by <span className="font-semibold text-white/50">Eternal Beat Medios</span>
        </div>
      </div>
    </div>
  );
}
