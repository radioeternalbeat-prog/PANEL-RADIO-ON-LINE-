import { useState } from "react";
import { AlertCircle, CalendarClock, Check, ListMusic, X } from "lucide-react";
import { api } from "../api/client";
import { DIAS, expandirDias } from "../utils/programacion";

// Modal para crear o editar un bloque de programación horaria
// y enlazarlo a una playlist real.
export default function ModalPrograma({ programa, playlists = [], onCerrar, onGuardado }) {
  const editando = !!programa?.id;
  const [nombre, setNombre] = useState(programa?.nombre || "");
  const [inicio, setInicio] = useState(programa?.inicio || "06:00");
  const [fin, setFin] = useState(programa?.fin || "10:00");
  const [playlistId, setPlaylistId] = useState(programa?.playlistId || "");
  const [dias, setDias] = useState(() => expandirDias(programa?.dias || "L,M,X,J,V"));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function toggleDia(codigo) {
    setDias((prev) => {
      const n = new Set(prev);
      n.has(codigo) ? n.delete(codigo) : n.add(codigo);
      return n;
    });
  }

  async function guardar() {
    if (!nombre.trim()) return setError("Escribe un nombre para el bloque.");
    if (!playlistId) return setError("Selecciona la playlist que sonará en este horario.");
    if (dias.size === 0) return setError("Selecciona al menos un día.");
    // Conserva el orden de la semana al serializar.
    const diasStr = DIAS.filter((d) => dias.has(d.codigo)).map((d) => d.codigo).join(",");
    const datos = { nombre: nombre.trim(), inicio, fin, playlistId: Number(playlistId), dias: diasStr };
    setGuardando(true);
    setError("");
    try {
      if (editando) await api.actualizarPrograma(programa.id, datos);
      else await api.crearPrograma(datos);
      onGuardado?.();
      onCerrar();
    } catch (err) {
      setError(err.message || "No se pudo guardar el bloque.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-grad text-white">
              <CalendarClock size={22} />
            </div>
            <div>
              <h2 className="font-bold text-fg">{editando ? "Editar bloque" : "Nuevo bloque horario"}</h2>
              <p className="text-xs text-muted">Asocia una playlist a una franja de tiempo</p>
            </div>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Nombre del bloque</label>
            <input
              className="input"
              placeholder="Ej. Mañanas Activas"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Inicio</label>
              <input type="time" className="input" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Fin</label>
              <input type="time" className="input" value={fin} onChange={(e) => setFin(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted">
              <ListMusic size={13} /> Playlist en este horario
            </label>
            <select className="input" value={playlistId} onChange={(e) => setPlaylistId(e.target.value)}>
              <option value="">— Selecciona una playlist —</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.pistas} pistas)
                </option>
              ))}
            </select>
            {playlists.length === 0 && (
              <p className="mt-1 text-xs text-amber-500">
                No hay playlists todavía. Crea una en la pestaña «Playlists».
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Días de emisión</label>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => {
                const activo = dias.has(d.codigo);
                return (
                  <button
                    key={d.codigo}
                    type="button"
                    onClick={() => toggleDia(d.codigo)}
                    className={`h-10 w-12 rounded-lg text-sm font-semibold transition ${
                      activo
                        ? "bg-brand-600 text-white shadow"
                        : "bg-surface2 text-muted hover:text-fg"
                    }`}
                  >
                    {d.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line p-4">
          <button onClick={onCerrar} className="btn-ghost">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="btn-primary">
            <Check size={16} /> {editando ? "Guardar cambios" : "Crear bloque"}
          </button>
        </div>
      </div>
    </div>
  );
}
