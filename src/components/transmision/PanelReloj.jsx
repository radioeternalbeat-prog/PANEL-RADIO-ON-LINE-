import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

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
    <div className="card flex aspect-square flex-col items-center justify-center p-4 text-center">
      <div className="mb-2 flex items-center gap-1.5 text-muted">
        <Clock size={13} className="text-brand-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Hora</span>
      </div>
      <div className="font-display text-3xl font-extrabold tabular-nums leading-none text-fg">
        {hh}:{mm}
        <span className="ml-0.5 text-base text-brand-500">{ss}</span>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {DIAS[ahora.getDay()]} {ahora.getDate()} {MESES[ahora.getMonth()]}
      </p>
    </div>
  );
}
