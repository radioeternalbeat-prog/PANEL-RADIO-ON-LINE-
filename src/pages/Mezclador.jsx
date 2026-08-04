import { Disc3 } from "lucide-react";
import { MezcladorProvider } from "../context/MezcladorContext";
import PanelMezclador from "../components/transmision/PanelMezclador";
import PanelCola from "../components/transmision/PanelCola";
import PanelAudifonos from "../components/transmision/PanelAudifonos";
import PanelSoundboard from "../components/transmision/PanelSoundboard";

export default function Mezclador() {
  return (
    <MezcladorProvider>
      <div className="space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
            <Disc3 className="text-brand-500" size={24} /> Mezclador DJ
          </h1>
          <p className="text-sm text-muted">Decks, crossfader, EQ, efectos, cola de reproducción y soundboard.</p>
        </div>

        {/* Mezclador DJ en vivo (centro de la cabina) */}
        <PanelMezclador />

        {/* Cola de reproducción + Audífonos */}
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
          <PanelCola />
          <PanelAudifonos />
        </div>

        {/* Soundboard a todo el ancho */}
        <PanelSoundboard />
      </div>
    </MezcladorProvider>
  );
}
