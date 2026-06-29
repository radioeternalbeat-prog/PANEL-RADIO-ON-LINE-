import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Headphones,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Settings2,
  Share2,
  Signal,
  Square,
  TrendingUp,
  Users,
  Wifi,
} from "lucide-react";
import { api } from "../api/client";
import { useRealtime } from "../hooks/useRealtime";
import { usePlayer } from "../context/PlayerContext";
import ModalEstacion from "../components/estaciones/ModalEstacion";
import ModalCompartir from "../components/estaciones/ModalCompartir";

function Estado({ estado }) {
  const map = {
    online: { txt: "En línea", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    offline: { txt: "Detenida", cls: "bg-surface2 text-muted", dot: "bg-slate-400" },
    error: { txt: "Error", cls: "bg-red-500/15 text-red-600 dark:text-red-400", dot: "bg-red-500" },
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
          <p className="text-sm text-muted">{etiqueta}</p>
          <p className="mt-1 font-display text-2xl font-bold text-fg">{valor}</p>
          {detalle && <p className="mt-1 text-xs text-muted">{detalle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [estaciones, setEstaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [accionando, setAccionando] = useState(null);
  const [modalEstacion, setModalEstacion] = useState(null); // { estacion } | { } (crear)
  const [compartir, setCompartir] = useState(null); // estacion a compartir
  const { reproducir, estacionActual, reproduciendo, alternar } = usePlayer();
  const { datos: realtime, conectado } = useRealtime();

  async function cargar() {
    try {
      setError("");
      const data = await api.estaciones();
      setEstaciones(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const estacionesVivo = useMemo(() => {
    if (!realtime?.estaciones) return estaciones;
    const porId = Object.fromEntries(realtime.estaciones.map((e) => [e.id, e]));
    return estaciones.map((e) => ({ ...e, ...(porId[e.id] || {}) }));
  }, [estaciones, realtime]);

  async function toggleEstado(est) {
    setAccionando(est.id);
    try {
      const actualizada =
        est.estado === "online"
          ? await api.detenerEstacion(est.id)
          : await api.iniciarEstacion(est.id);
      setEstaciones((prev) => prev.map((e) => (e.id === est.id ? actualizada : e)));
    } catch (err) {
      setError(err.message);
    } finally {
      setAccionando(null);
    }
  }

  function onGuardado(est) {
    setEstaciones((prev) => {
      const existe = prev.some((x) => x.id === est.id);
      return existe ? prev.map((x) => (x.id === est.id ? est : x)) : [...prev, est];
    });
    setModalEstacion(null);
  }

  function onEliminado(id) {
    setEstaciones((prev) => prev.filter((x) => x.id !== id));
    setModalEstacion(null);
  }

  const totalOyentes = estacionesVivo.reduce((a, e) => a + e.oyentesActuales, 0);
  const enLinea = estacionesVivo.filter((e) => e.estado === "online").length;
  const picoTotal = estacionesVivo.reduce((a, e) => a + e.picoOyentes, 0);

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Estaciones</h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            Resumen y control de tus transmisiones.
            <span
              className={`badge ${conectado ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-surface2 text-muted"}`}
              title="Conexión de datos en vivo"
            >
              <Wifi size={12} /> {conectado ? "En vivo" : "Sin conexión"}
            </span>
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModalEstacion({})}>
          <Plus size={18} /> Nueva estación
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Radio} etiqueta="Estaciones activas" valor={`${enLinea}/${estacionesVivo.length}`} detalle="En transmisión" color="bg-brand-500/15 text-brand-500" />
        <KpiCard icon={Headphones} etiqueta="Oyentes ahora" valor={totalOyentes} detalle="En todas las estaciones" color="bg-emerald-500/15 text-emerald-500" />
        <KpiCard icon={TrendingUp} etiqueta="Pico de oyentes" valor={picoTotal} detalle="Máximo histórico" color="bg-amber-500/15 text-amber-500" />
        <KpiCard icon={Signal} etiqueta="Estado del servidor" valor="Operativo" detalle="Icecast 2.4.4" color="bg-accent-500/15 text-accent-500" />
      </div>

      {/* Tarjetas de estación */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {estacionesVivo.map((e) => {
          const esActual = estacionActual?.id === e.id;
          const sonando = esActual && reproduciendo;
          const ocupado = accionando === e.id;
          return (
            <div key={e.id} className="card flex flex-col overflow-hidden transition hover:shadow-glow">
              <div className="flex items-start justify-between gap-3 border-b border-line p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-grad text-white">
                    <Radio size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-fg">{e.nombre}</h3>
                    <p className="text-xs text-muted">
                      {e.formato} · {e.bitrate} kbps
                    </p>
                  </div>
                </div>
                <Estado estado={e.estado} />
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center gap-2 rounded-lg bg-surface2 px-3 py-2">
                  <Music2 size={16} className="shrink-0 text-brand-500" />
                  <p className="truncate text-sm text-muted">{e.cancionActual}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted">
                      <Users size={14} />
                    </div>
                    <p className="mt-0.5 text-lg font-bold text-fg">{e.oyentesActuales}</p>
                    <p className="text-[11px] text-muted">Oyentes</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted">
                      <TrendingUp size={14} />
                    </div>
                    <p className="mt-0.5 text-lg font-bold text-fg">{e.picoOyentes}</p>
                    <p className="text-[11px] text-muted">Pico</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted">
                      <Activity size={14} />
                    </div>
                    <p className="mt-0.5 text-lg font-bold text-fg">{e.oyentesMaximos}</p>
                    <p className="text-[11px] text-muted">Límite</p>
                  </div>
                </div>

                {/* Barra de capacidad */}
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted">
                    <span>Capacidad</span>
                    <span>{Math.round((e.oyentesActuales / e.oyentesMaximos) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-brand-grad transition-all duration-500"
                      style={{ width: `${Math.min(100, (e.oyentesActuales / e.oyentesMaximos) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted">
                  <span className="font-medium text-fg">Uptime:</span> {e.uptime} ·{" "}
                  <span className="font-medium text-fg">Montaje:</span> {e.montaje}
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-line p-4">
                {e.estado === "online" ? (
                  <button onClick={() => toggleEstado(e)} disabled={ocupado} className="btn-danger flex-1">
                    {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />} Detener
                  </button>
                ) : (
                  <button onClick={() => toggleEstado(e)} disabled={ocupado} className="btn-success flex-1">
                    {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Iniciar
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
                <button className="btn-ghost" title="Compartir" onClick={() => setCompartir(e)}>
                  <Share2 size={16} />
                </button>
                <button className="btn-ghost" title="Configurar" onClick={() => setModalEstacion({ estacion: e })}>
                  <Settings2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalEstacion && (
        <ModalEstacion
          estacion={modalEstacion.estacion}
          onCerrar={() => setModalEstacion(null)}
          onGuardado={onGuardado}
          onEliminado={onEliminado}
        />
      )}
      {compartir && <ModalCompartir estacion={compartir} onCerrar={() => setCompartir(null)} />}
    </div>
  );
}
