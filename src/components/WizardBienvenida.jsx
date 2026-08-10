import { useState } from "react";
import { Music2, Radio, Rocket, Upload, X } from "lucide-react";

const PASOS = [
  {
    icon: Rocket,
    titulo: "Bienvenido a Panel Radio Online",
    descripcion:
      "Tu estacion de radio profesional en la nube. En pocos pasos estaras transmitiendo al mundo.",
    color: "text-brand-500 bg-brand-500/15",
  },
  {
    icon: Radio,
    titulo: "Crea tu estacion",
    descripcion:
      'Ve al Dashboard y haz clic en "Nueva estacion". Configura el nombre, servidor (Centova Cast, Icecast, AzuraCast o SHOUTcast), puerto y punto de montaje.',
    color: "text-emerald-500 bg-emerald-500/15",
  },
  {
    icon: Upload,
    titulo: "Sube tu musica",
    descripcion:
      "Abre la Biblioteca y AutoDJ para subir tus canciones (MP3, OGG, FLAC). Organiza playlists y activa el AutoDJ para transmision 24/7.",
    color: "text-amber-500 bg-amber-500/15",
  },
  {
    icon: Music2,
    titulo: "Transmite en vivo",
    descripcion:
      'Abre el Mezclador DJ, carga canciones en los decks, conecta al servidor y haz clic en "Transmitir". Tu radio ya esta al aire!',
    color: "text-accent-500 bg-accent-500/15",
  },
];

const STORAGE_KEY = "panel_wizard_completado";

export default function WizardBienvenida() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const [paso, setPaso] = useState(0);

  if (!visible) return null;

  function cerrar() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch { /* noop */ }
    setVisible(false);
  }

  function siguiente() {
    if (paso < PASOS.length - 1) {
      setPaso(paso + 1);
    } else {
      cerrar();
    }
  }

  function anterior() {
    if (paso > 0) setPaso(paso - 1);
  }

  const actual = PASOS[paso];
  const Icon = actual.icon;
  const esUltimo = paso === PASOS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden">
        {/* Boton cerrar */}
        <button
          onClick={cerrar}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-fg transition"
          aria-label="Cerrar wizard"
        >
          <X size={18} />
        </button>

        {/* Contenido */}
        <div className="flex flex-col items-center p-8 pt-10 text-center">
          {/* Icono */}
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${actual.color} mb-5`}>
            <Icon size={32} />
          </div>

          {/* Titulo */}
          <h2 className="text-xl font-bold text-fg mb-2">{actual.titulo}</h2>

          {/* Descripcion */}
          <p className="text-sm text-muted leading-relaxed max-w-sm">{actual.descripcion}</p>
        </div>

        {/* Footer con navegacion */}
        <div className="border-t border-line px-6 py-4 flex items-center justify-between">
          {/* Indicadores de paso */}
          <div className="flex gap-1.5">
            {PASOS.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === paso ? "w-6 bg-brand-500" : "w-2 bg-surface2"
                }`}
              />
            ))}
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            {paso > 0 && (
              <button
                onClick={anterior}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                Atras
              </button>
            )}
            <button
              onClick={siguiente}
              className="btn-primary text-xs px-4 py-1.5"
            >
              {esUltimo ? "Comenzar!" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
