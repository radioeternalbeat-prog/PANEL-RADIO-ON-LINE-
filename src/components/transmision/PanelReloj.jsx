import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export default function PanelReloj() {
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(ahora.getHours()).padStart(2, "0");
  const mm = String(ahora.getMinutes()).padStart(2, "0");
  const ss = String(ahora.getSeconds()).padStart(2, "0");

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="mb-3 flex items-center gap-2 text-muted">
        <Clock size={16} className="text-brand-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">Hora local</h3>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="font-display text-5xl font-extrabold tabular-nums text-fg">
          {hh}:{mm}
          <span className="ml-1 text-2xl text-brand-500">{ss}</span>
        </div>
        <p className="mt-2 text-sm capitalize text-muted">
          {DIAS[ahora.getDay()]}, {ahora.getDate()} de {MESES[ahora.getMonth()]} {ahora.getFullYear()}
        </p>
      </div>
    </div>
  );
}
