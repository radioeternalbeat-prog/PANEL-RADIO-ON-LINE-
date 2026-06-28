import { useState } from "react";
import {
  Activity,
  Headphones,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Settings2,
  Signal,
  Square,
  TrendingUp,
  Users,
} from "lucide-react";
import { estaciones as estacionesIniciales } from "../data/mockData";
import { usePlayer } from "../context/PlayerContext";

function Estado({ estado }) {
  const map = {
    online: { txt: "En línea", cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
    offline: { txt: "Detenida", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
    error: { txt: "Error", cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
  };
  const s = map[estado] || map.offline;
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${estado === "online" ? "animate-pulse" : ""}`} />
      {s.txt}
    </span>
  );
}

function KpiCard({ icon: Icon, etiqueta, valor, detalle, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{etiqueta}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{valor}</p>
          {detalle && <p className="mt-1 text-xs text-slate-400">{detalle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [estaciones, setEstaciones] = useState(estacionesIniciales);
  const { reproducir, estacionActual, reproduciendo, alternar } = usePlayer();

  function toggleEstado(id) {
    setEstaciones((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              estado: e.estado === "online" ? "offline" : "online",
              oyentesActuales: e.estado === "online" ? 0 : e.picoOyentes - 30,
              uptime: e.estado === "online" ? "—" : "0d 0h 1m",
            }
          : e
      )
    );
  }

  const totalOyentes = estaciones.reduce((a, e) => a + e.oyentesActuales, 0);
  const enLinea = estaciones.filter((e) => e.estado === "online").length;
  const picoTotal = estaciones.reduce((a, e) => a + e.picoOyentes, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estaciones</h1>
          <p className="text-sm text-slate-500">Resumen y control de tus transmisiones.</p>
        </div>
        <button className="btn-primary">
          <Plus size={18} /> Nueva estación
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Radio} etiqueta="Estaciones activas" valor={`${enLinea}/${estaciones.length}`} detalle="En transmisión" color="bg-brand-100 text-brand-700" />
        <KpiCard icon={Headphones} etiqueta="Oyentes ahora" valor={totalOyentes} detalle="En todas las estaciones" color="bg-emerald-100 text-emerald-700" />
        <KpiCard icon={TrendingUp} etiqueta="Pico de oyentes" valor={picoTotal} detalle="Máximo histórico" color="bg-amber-100 text-amber-700" />
        <KpiCard icon={Signal} etiqueta="Estado del servidor" valor="Operativo" detalle="Icecast 2.4.4" color="bg-violet-100 text-violet-700" />
      </div>

      {/* Tarjetas de estación */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {estaciones.map((e) => {
          const esActual = estacionActual?.id === e.id;
          const sonando = esActual && reproduciendo;
          return (
            <div key={e.id} className="card flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                    <Radio size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{e.nombre}</h3>
                    <p className="text-xs text-slate-400">
                      {e.formato} · {e.bitrate} kbps
                    </p>
                  </div>
                </div>
                <Estado estado={e.estado} />
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <Music2 size={16} className="shrink-0 text-brand-500" />
                  <p className="truncate text-sm text-slate-600">{e.cancionActual}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-slate-400">
                      <Users size={14} />
                    </div>
                    <p className="mt-0.5 text-lg font-bold text-slate-800">{e.oyentesActuales}</p>
                    <p className="text-[11px] text-slate-400">Oyentes</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-slate-400">
                      <TrendingUp size={14} />
                    </div>
                    <p className="mt-0.5 text-lg font-bold text-slate-800">{e.picoOyentes}</p>
                    <p className="text-[11px] text-slate-400">Pico</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-slate-400">
                      <Activity size={14} />
                    </div>
                    <p className="mt-0.5 text-lg font-bold text-slate-800">{e.oyentesMaximos}</p>
                    <p className="text-[11px] text-slate-400">Límite</p>
                  </div>
                </div>

                {/* Barra de capacidad */}
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                    <span>Capacidad</span>
                    <span>{Math.round((e.oyentesActuales / e.oyentesMaximos) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.min(100, (e.oyentesActuales / e.oyentesMaximos) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  <span className="font-medium text-slate-500">Uptime:</span> {e.uptime} ·{" "}
                  <span className="font-medium text-slate-500">Montaje:</span> {e.montaje}
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-slate-100 p-4">
                {e.estado === "online" ? (
                  <button onClick={() => toggleEstado(e.id)} className="btn-danger flex-1">
                    <Square size={16} /> Detener
                  </button>
                ) : (
                  <button onClick={() => toggleEstado(e.id)} className="btn-success flex-1">
                    <Play size={16} /> Iniciar
                  </button>
                )}
                <button
                  onClick={() => (esActual ? alternar() : reproducir(e))}
                  disabled={e.estado !== "online"}
                  className="btn-ghost"
                  title="Escuchar"
                >
                  {sonando ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button className="btn-ghost" title="Configurar">
                  <Settings2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
