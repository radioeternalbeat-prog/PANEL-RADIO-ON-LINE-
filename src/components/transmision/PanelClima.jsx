import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Loader2,
  MapPin,
  Pencil,
  Sun,
  Wind,
} from "lucide-react";

function interpretar(code) {
  if (code === 0) return { txt: "Despejado", Icon: Sun };
  if ([1, 2].includes(code)) return { txt: "Parcial", Icon: Cloud };
  if (code === 3) return { txt: "Nublado", Icon: Cloud };
  if ([45, 48].includes(code)) return { txt: "Niebla", Icon: CloudFog };
  if ([51, 53, 55, 56, 57].includes(code)) return { txt: "Llovizna", Icon: CloudDrizzle };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { txt: "Lluvia", Icon: CloudRain };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { txt: "Nieve", Icon: CloudSnow };
  if ([95, 96, 99].includes(code)) return { txt: "Tormenta", Icon: CloudLightning };
  return { txt: "—", Icon: Cloud };
}

const CIUDAD_KEY = "prb_clima_ciudad";

export default function PanelClima() {
  const [ciudad, setCiudad] = useState(localStorage.getItem(CIUDAD_KEY) || "Caracas");
  const [editando, setEditando] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [clima, setClima] = useState(null);
  const [lugar, setLugar] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargar(nombre) {
    setCargando(true);
    setError("");
    try {
      const g = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nombre)}&count=1&language=es`
      ).then((r) => r.json());
      if (!g.results?.length) throw new Error("Ciudad no encontrada.");
      const { latitude, longitude, name } = g.results[0];
      const f = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
      ).then((r) => r.json());
      setClima(f.current);
      setLugar(name);
      localStorage.setItem(CIUDAD_KEY, nombre);
    } catch (e) {
      setError(e.message || "Error");
      setClima(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(ciudad);
    const t = setInterval(() => cargar(ciudad), 10 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudad]);

  function guardarCiudad(e) {
    e.preventDefault();
    if (entrada.trim()) {
      setCiudad(entrada.trim());
      setEntrada("");
    }
    setEditando(false);
  }

  const info = clima ? interpretar(clima.weather_code) : null;
  const Icono = info?.Icon || Cloud;

  return (
    <div className="card flex aspect-square flex-col items-center justify-center p-4 text-center">
      <div className="mb-1 flex items-center gap-1.5 text-muted">
        <MapPin size={13} className="text-brand-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Clima</span>
      </div>

      {cargando ? (
        <Loader2 className="my-3 animate-spin text-brand-500" size={22} />
      ) : error ? (
        <p className="my-3 text-xs text-red-500">{error}</p>
      ) : (
        <>
          <Icono size={32} className="text-brand-500" />
          <div className="font-display text-2xl font-extrabold leading-none text-fg">
            {Math.round(clima.temperature_2m)}°
          </div>
          <p className="text-[11px] text-fg">{info.txt}</p>
          <div className="mt-1 flex gap-2 text-[10px] text-muted">
            <span className="flex items-center gap-0.5">
              <Droplets size={11} /> {clima.relative_humidity_2m}%
            </span>
            <span className="flex items-center gap-0.5">
              <Wind size={11} /> {Math.round(clima.wind_speed_10m)}
            </span>
          </div>
        </>
      )}

      {/* Ciudad (editable) */}
      {editando ? (
        <form onSubmit={guardarCiudad} className="mt-2 w-full">
          <input
            autoFocus
            className="input py-1 text-center text-[11px]"
            placeholder="Ciudad…"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onBlur={() => setEditando(false)}
          />
        </form>
      ) : (
        <button
          onClick={() => setEditando(true)}
          className="mt-2 flex items-center gap-1 text-[11px] text-muted hover:text-brand-500"
          title="Cambiar ciudad"
        >
          <span className="max-w-[90px] truncate">{lugar || ciudad}</span>
          <Pencil size={10} />
        </button>
      )}
    </div>
  );
}
