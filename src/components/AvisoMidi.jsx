import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Piano, X } from "lucide-react";
import { useMidi } from "../context/MidiContext";

// Notificaciones flotantes de "plug-and-play" MIDI, visibles en cualquier
// pantalla (montado en Layout): avisan cuando se conecta un controlador
// nuevo (ofreciendo crear un perfil con un clic) o cuando se activa
// automáticamente un perfil ya guardado para ese dispositivo.
export default function AvisoMidi() {
  const {
    sugerenciaDispositivo,
    crearPerfilParaSugerencia,
    descartarSugerencia,
    avisoConexion,
    descartarAvisoConexion,
  } = useMidi();
  const navigate = useNavigate();

  useEffect(() => {
    if (!avisoConexion) return;
    const t = setTimeout(descartarAvisoConexion, 5000);
    return () => clearTimeout(t);
  }, [avisoConexion, descartarAvisoConexion]);

  if (!sugerenciaDispositivo && !avisoConexion) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex w-[min(360px,90vw)] flex-col gap-2">
      {sugerenciaDispositivo && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-500/40 bg-surface p-4 shadow-glow">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-500">
            <Piano size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Controlador MIDI detectado</p>
            <p className="mt-0.5 text-xs text-muted">
              Se conectó <strong className="text-fg">{sugerenciaDispositivo.nombre}</strong>. ¿Creamos un
              perfil de mapeo para él?
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={crearPerfilParaSugerencia} className="btn-primary px-3 py-1.5 text-xs">
                Crear perfil
              </button>
              <button
                onClick={() => {
                  descartarSugerencia();
                  navigate("/configuracion");
                }}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Ir a Configuración
              </button>
            </div>
          </div>
          <button onClick={descartarSugerencia} className="text-muted hover:text-fg">
            <X size={16} />
          </button>
        </div>
      )}

      {avisoConexion && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-surface p-3 shadow-glow">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
            <Piano size={15} />
          </div>
          <p className="min-w-0 flex-1 text-xs text-fg">
            <strong>{avisoConexion.nombre}</strong> conectado
            {avisoConexion.nuevo ? " · perfil creado y activado" : " · perfil activado"}
          </p>
          <button onClick={descartarAvisoConexion} className="text-muted hover:text-fg">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
