import { RadioTower } from "lucide-react";
import { MezcladorProvider } from "../context/MezcladorContext";
import OnAir from "../components/transmision/OnAir";
import PanelConexion from "../components/transmision/PanelConexion";
import PanelMicrofonos from "../components/transmision/PanelMicrofonos";
import PanelMensajes from "../components/transmision/PanelMensajes";
import PanelReloj from "../components/transmision/PanelReloj";
import PanelClima from "../components/transmision/PanelClima";
import PanelReproductor from "../components/transmision/PanelReproductor";

export default function Transmision() {
  return (
    <MezcladorProvider>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
              <RadioTower className="text-brand-500" size={24} /> Transmisión
            </h1>
            <p className="text-sm text-muted">Conexión al servidor, micrófonos y estado al aire.</p>
          </div>
          <OnAir />
        </div>

        {/* Conexión al servidor de streaming (Icecast) */}
        <PanelConexion />

        {/* Micrófonos + Reproductor */}
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
          <PanelMicrofonos />
          <PanelReproductor />
        </div>

        {/* Mensajes + Info */}
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <PanelMensajes />
          </div>
          <div className="flex flex-col gap-5">
            <PanelReloj />
            <PanelClima />
          </div>
        </div>
      </div>
    </MezcladorProvider>
  );
}
