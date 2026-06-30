import { useState } from "react";
import { Loader2, Radio, Save, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { bitratesSoportados, formatosSoportados } from "../../data/mockData";

function Campo({ label, children, ancho }) {
  return (
    <div className={ancho || ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function ModalEstacion({ estacion, onCerrar, onGuardado, onEliminado }) {
  const edicion = !!estacion;
  const [f, setF] = useState({
    nombre: estacion?.nombre || "",
    host: estacion?.host || "stream.eternalbeat.online",
    puerto: estacion?.puerto || 8000,
    montaje: estacion?.montaje || "/stream",
    streamUrl: estacion?.streamUrl || "",
    embedToken: estacion?.embedToken || "",
    embedCanal: estacion?.embedCanal || "",
    formato: estacion?.formato || "MP3",
    bitrate: estacion?.bitrate || 128,
    oyentesMaximos: estacion?.oyentesMaximos || 250,
    autodj: estacion?.autodj ?? true,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const set = (campo) => (v) => setF((s) => ({ ...s, [campo]: v }));

  async function guardar(e) {
    e.preventDefault();
    setError("");
    if (!f.nombre.trim()) {
      setError("El nombre de la estación es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      const datos = {
        nombre: f.nombre.trim(),
        host: f.host.trim(),
        puerto: Number(f.puerto) || 8000,
        montaje: f.montaje.startsWith("/") ? f.montaje : `/${f.montaje}`,
        streamUrl: f.streamUrl.trim(),
        embedToken: f.embedToken.trim(),
        embedCanal: f.embedCanal.trim(),
        formato: f.formato,
        bitrate: Number(f.bitrate),
        oyentesMaximos: Number(f.oyentesMaximos) || 100,
        autodj: f.autodj,
      };
      const resultado = edicion
        ? await api.actualizarEstacion(estacion.id, datos)
        : await api.crearEstacion(datos);
      onGuardado(resultado);
    } catch (err) {
      setError(err.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    setEliminando(true);
    try {
      await api.eliminarEstacion(estacion.id);
      onEliminado(estacion.id);
    } catch (err) {
      setError(err.message || "No se pudo eliminar.");
      setEliminando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={guardar} className="my-8 w-full max-w-2xl rounded-2xl border border-line bg-surface shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-grad text-white">
              <Radio size={18} />
            </div>
            <h2 className="font-semibold text-fg">{edicion ? "Editar estación" : "Nueva estación"}</h2>
          </div>
          <button type="button" onClick={onCerrar} className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo label="Nombre de la estación" ancho="sm:col-span-2">
            <input className="input" value={f.nombre} onChange={(e) => set("nombre")(e.target.value)} placeholder="Mi Radio FM" />
          </Campo>
          <Campo label="Host">
            <input className="input" value={f.host} onChange={(e) => set("host")(e.target.value)} />
          </Campo>
          <Campo label="Puerto">
            <input type="number" className="input" value={f.puerto} onChange={(e) => set("puerto")(e.target.value)} />
          </Campo>
          <Campo label="Punto de montaje">
            <input className="input" value={f.montaje} onChange={(e) => set("montaje")(e.target.value)} placeholder="/stream" />
          </Campo>
          <Campo label="Oyentes máximos">
            <input type="number" className="input" value={f.oyentesMaximos} onChange={(e) => set("oyentesMaximos")(e.target.value)} />
          </Campo>
          <Campo label="Formato">
            <select className="input" value={f.formato} onChange={(e) => set("formato")(e.target.value)}>
              {formatosSoportados.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Campo>
          <Campo label="Bitrate (kbps)">
            <select className="input" value={f.bitrate} onChange={(e) => set("bitrate")(Number(e.target.value))}>
              {bitratesSoportados.map((x) => <option key={x} value={x}>{x} kbps</option>)}
            </select>
          </Campo>
          <Campo label="URL pública del stream (para oyentes)" ancho="sm:col-span-2">
            <input
              className="input"
              value={f.streamUrl}
              onChange={(e) => set("streamUrl")(e.target.value)}
              placeholder="https://sapircast.caster.fm:13721/D6md9"
            />
            <p className="mt-1 text-[11px] text-muted">
              Usa HTTPS para que suene dentro del panel. Si la dejas vacía, se arma con host:puerto/montaje.
            </p>
          </Campo>
          <Campo label="Reproductor Caster.fm — Public Token" >
            <input
              className="input"
              value={f.embedToken}
              onChange={(e) => set("embedToken")(e.target.value)}
              placeholder="54a0c09f-..."
            />
          </Campo>
          <Campo label="Reproductor Caster.fm — Channel ID">
            <input
              className="input"
              value={f.embedCanal}
              onChange={(e) => set("embedCanal")(e.target.value)}
              placeholder="a224c145-..."
            />
          </Campo>
          <p className="-mt-1 text-[11px] text-muted sm:col-span-2">
            Opcional: si pones el token y canal del widget de Caster.fm, el botón "Escuchar" usará su
            reproductor oficial (necesario en el plan gratuito).
          </p>
          <label className="flex items-center justify-between rounded-lg bg-surface2 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-medium text-fg">Activar AutoDJ en esta estación</span>
            <input type="checkbox" className="h-5 w-9 cursor-pointer accent-brand-500" checked={f.autodj} onChange={(e) => set("autodj")(e.target.checked)} />
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500 sm:col-span-2">{error}</p>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between gap-2 border-t border-line p-4">
          <div>
            {edicion && (
              confirmar ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">¿Eliminar?</span>
                  <button type="button" onClick={eliminar} disabled={eliminando} className="btn-danger px-3 py-1.5 text-xs">
                    {eliminando ? <Loader2 size={14} className="animate-spin" /> : "Sí, eliminar"}
                  </button>
                  <button type="button" onClick={() => setConfirmar(false)} className="btn-ghost px-3 py-1.5 text-xs">No</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmar(true)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-500/10">
                  <Trash2 size={16} /> Eliminar
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {edicion ? "Guardar cambios" : "Crear estación"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
