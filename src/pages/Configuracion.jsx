import { useState } from "react";
import { Copy, Save, Server, Sliders, Users } from "lucide-react";
import { bitratesSoportados, estaciones, formatosSoportados } from "../data/mockData";

function Campo({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function Configuracion() {
  const e = estaciones[0];
  const [cfg, setCfg] = useState({
    nombre: e.nombre,
    host: e.host,
    puerto: e.puerto,
    montaje: e.montaje,
    formato: e.formato,
    bitrate: e.bitrate,
    oyentesMaximos: e.oyentesMaximos,
    autodj: e.autodj,
    publica: true,
    genero: "Variada",
    descripcion: "La mejor música 24/7",
  });
  const [guardado, setGuardado] = useState(false);

  function set(campo, valor) {
    setCfg((c) => ({ ...c, [campo]: valor }));
    setGuardado(false);
  }

  function guardar(ev) {
    ev.preventDefault();
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  }

  const urlStream = `http://${cfg.host}:${cfg.puerto}${cfg.montaje}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Configuración</h1>
        <p className="text-sm text-muted">Ajustes del servidor de streaming y la estación.</p>
      </div>

      <form onSubmit={guardar} className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server size={18} className="text-brand-500" />
              <h2 className="font-semibold text-fg">Datos del servidor</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nombre de la estación">
                <input className="input" value={cfg.nombre} onChange={(ev) => set("nombre", ev.target.value)} />
              </Campo>
              <Campo label="Género">
                <input className="input" value={cfg.genero} onChange={(ev) => set("genero", ev.target.value)} />
              </Campo>
              <Campo label="Host">
                <input className="input" value={cfg.host} onChange={(ev) => set("host", ev.target.value)} />
              </Campo>
              <Campo label="Puerto">
                <input type="number" className="input" value={cfg.puerto} onChange={(ev) => set("puerto", ev.target.value)} />
              </Campo>
              <Campo label="Punto de montaje">
                <input className="input" value={cfg.montaje} onChange={(ev) => set("montaje", ev.target.value)} />
              </Campo>
              <Campo label="Oyentes máximos">
                <input type="number" className="input" value={cfg.oyentesMaximos} onChange={(ev) => set("oyentesMaximos", ev.target.value)} />
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Descripción">
                  <textarea className="input min-h-[80px] resize-y" value={cfg.descripcion} onChange={(ev) => set("descripcion", ev.target.value)} />
                </Campo>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sliders size={18} className="text-brand-500" />
              <h2 className="font-semibold text-fg">Calidad de audio</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Formato">
                <select className="input" value={cfg.formato} onChange={(ev) => set("formato", ev.target.value)}>
                  {formatosSoportados.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Bitrate (kbps)">
                <select className="input" value={cfg.bitrate} onChange={(ev) => set("bitrate", Number(ev.target.value))}>
                  {bitratesSoportados.map((b) => (
                    <option key={b} value={b}>{b} kbps</option>
                  ))}
                </select>
              </Campo>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-lg bg-surface2 px-4 py-3">
                <span className="text-sm font-medium text-fg">Activar AutoDJ</span>
                <input type="checkbox" className="h-5 w-9 cursor-pointer accent-brand-500" checked={cfg.autodj} onChange={(ev) => set("autodj", ev.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-lg bg-surface2 px-4 py-3">
                <span className="text-sm font-medium text-fg">Listar en directorios públicos</span>
                <input type="checkbox" className="h-5 w-9 cursor-pointer accent-brand-500" checked={cfg.publica} onChange={(ev) => set("publica", ev.target.checked)} />
              </label>
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-fg">URL del stream</h2>
            <div className="flex items-center gap-2 rounded-lg bg-[#121214] p-3">
              <code className="flex-1 truncate text-xs text-brand-300">{urlStream}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(urlStream)} className="text-slate-400 hover:text-white">
                <Copy size={16} />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">Comparte esta URL para que los oyentes sintonicen tu radio.</p>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users size={18} className="text-brand-500" />
              <h2 className="font-semibold text-fg">Credenciales</h2>
            </div>
            <div className="space-y-3">
              <Campo label="Usuario fuente (DJ)">
                <input className="input" defaultValue="source" />
              </Campo>
              <Campo label="Contraseña fuente">
                <input type="password" className="input" defaultValue="hackme123" />
              </Campo>
              <Campo label="Contraseña admin">
                <input type="password" className="input" defaultValue="admin123" />
              </Campo>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5">
            <Save size={18} /> Guardar cambios
          </button>
          {guardado && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Configuración guardada correctamente
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
