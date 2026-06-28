import { RadioTower } from "lucide-react";
import PanelMezclador from "../components/transmision/PanelMezclador";
import PanelReproductor from "../components/transmision/PanelReproductor";
import PanelCola from "../components/transmision/PanelCola";
import PanelReloj from "../components/transmision/PanelReloj";
import PanelClima from "../components/transmision/PanelClima";
import PanelMensajes from "../components/transmision/PanelMensajes";
import PanelSoundboard from "../components/transmision/PanelSoundboard";

export default function Transmision() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
            <RadioTower className="text-brand-500" size={24} /> Transmisión
          </h1>
          <p className="text-sm text-muted">Cabina en vivo: reproductor, AutoDJ, mensajes, clima y efectos.</p>
        </div>
      </div>

      {/* Mezclador DJ en vivo (centro de la cabina) */}
      <PanelMezclador />

      {/* Fila 1: Reproductor · Cola · (Reloj + Clima) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <PanelReproductor />
        <PanelCola />
        <div className="grid grid-rows-2 gap-5">
          <PanelReloj />
          <PanelClima />
        </div>
      </div>

      {/* Fila 2: Soundboard (ancho) · Mensajes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PanelSoundboard />
        </div>
        <PanelMensajes />
      </div>
    </div>
  );
}
