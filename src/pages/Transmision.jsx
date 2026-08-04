import { RadioTower } from "lucide-react";
import { MezcladorProvider } from "../context/MezcladorContext";
import PanelConexion from "../components/transmision/PanelConexion";

export default function Transmision() {
  return (
    <MezcladorProvider>
      <div className="space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
            <RadioTower className="text-brand-500" size={24} /> Transmisión
          </h1>
          <p className="text-sm text-muted">Conexión y configuración del servidor de streaming.</p>
        </div>

        {/* Conexión al servidor de streaming (Icecast) */}
        <PanelConexion />
      </div>
    </MezcladorProvider>
  );
}
