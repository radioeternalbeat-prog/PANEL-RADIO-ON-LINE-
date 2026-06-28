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
  Search,
  Sun,
  Wind,
} from "lucide-react";

// Mapeo de códigos WMO de Open-Meteo a descripción + icono.
function interpretar(code) {
  if (code === 0) return { txt: "Despejado", Icon: Sun };
  if ([1, 2].includes(code)) return { txt: "Parcialmente nublado", Icon: Cloud };
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
      const { latitude, longitude, name, country, admin1 } = g.results[0];
      const f = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
      ).then((r) => r.json());
      setClima(f.current);
      setLugar(`${name}${admin1 ? ", " + admin1 : ""} · ${country}`);
      localStorage.setItem(CIUDAD_KEY, nombre);
    } catch (e) {
      setError(e.message || "No se pudo obtener el clima.");
      setClima(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(ciudad);
    const t = setInterval(() => cargar(ciudad), 10 * 60 * 1000); // refresca cada 10 min
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudad]);

  function buscar(e) {
    e.preventDefault();
    if (entrada.trim()) {
      setCiudad(entrada.trim());
      setEntrada("");
    }
  }

  const info = clima ? interpretar(clima.weather_code) : null;
  const Icono = info?.Icon || Cloud;

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="mb-3 flex items-center gap-2 text-muted">
        <MapPin size={16} className="text-brand-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">Clima</h3>
      </div>

      <form onSubmit={buscar} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input py-1.5 pl-8 text-sm"
            placeholder="Cambiar ciudad..."
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
          />
        </div>
      </form>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {cargando ? (
          <Loader2 className="animate-spin text-brand-500" size={28} />
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <>
            <Icono size={48} className="text-brand-500" />
            <div className="mt-2 font-display text-4xl font-extrabold text-fg">
              {Math.round(clima.temperature_2m)}°C
            </div>
            <p className="text-sm text-fg">{info.txt}</p>
            <p className="mt-0.5 text-xs text-muted">{lugar}</p>
            <div className="mt-3 flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Droplets size={13} /> {clima.relative_humidity_2m}%
              </span>
              <span className="flex items-center gap-1">
                <Wind size={13} /> {Math.round(clima.wind_speed_10m)} km/h
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
