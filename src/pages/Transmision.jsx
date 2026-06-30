import { RadioTower } from "lucide-react";
import { MezcladorProvider } from "../context/MezcladorContext";
import OnAir from "../components/transmision/OnAir";
import PanelMezclador from "../components/transmision/PanelMezclador";
import PanelReproductor from "../components/transmision/PanelReproductor";
import PanelMicrofonos from "../components/transmision/PanelMicrofonos";
import PanelCola from "../components/transmision/PanelCola";
import PanelReloj from "../components/transmision/PanelReloj";
import PanelClima from "../components/transmision/PanelClima";
import PanelAudifonos from "../components/transmision/PanelAudifonos";
import PanelMensajes from "../components/transmision/PanelMensajes";
import PanelSoundboard from "../components/transmision/PanelSoundboard";

export default function Transmision() {
  return (
    <MezcladorProvider>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
              <RadioTower className="text-brand-500" size={24} /> Transmisión
            </h1>
            <p className="text-sm text-muted">Cabina en vivo: reproductor, AutoDJ, mensajes, clima y efectos.</p>
          </div>
          <OnAir />
        </div>

        {/* Mezclador DJ en vivo (centro de la cabina) */}
        <PanelMezclador />

        {/* Fila 1: (Micrófonos + Audífonos) · Cola · (Reproductor + Hora/Clima + Mensajes) */}
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* Izquierda */}
          <div className="flex flex-col gap-5">
            <PanelMicrofonos />
            <PanelAudifonos />
          </div>

          {/* Centro */}
          <PanelCola />

          {/* Derecha */}
          <div className="flex flex-col gap-5">
            <PanelReproductor />
            <div className="grid grid-cols-2 gap-5">
              <PanelReloj />
              <PanelClima />
            </div>
            <PanelMensajes />
          </div>
        </div>

        {/* Fila 2: Soundboard a todo el ancho */}
        <PanelSoundboard />
      </div>
    </MezcladorProvider>
  );
}
