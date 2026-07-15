import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Clock3,
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

// Ecualizador animado (activo cuando la estación está en línea).
function Eq({ activo }) {
  return (
    <span className="flex h-4 w-5 items-end gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${activo ? "bg-brand-500 animate-eq" : "bg-line"}`}
          style={activo ? { animationDelay: `${i * 0.18}s`, height: "25%" } : { height: "25%" }}
        />
      ))}
    </span>
  );
}

function KpiCard({ icon: Icon, etiqueta, valor, detalle, color }) {
  return (
    <div className="card p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon size={22} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{etiqueta}</p>
      <p className="font-display text-2xl font-bold text-fg">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-muted">{detalle}</p>}
    </div>
  );
}

function Stat({ icon: Icon, valor, label }) {
  return (
    <div className="rounded-xl bg-surface2 p-2 text-center">
      <Icon size={14} className="mx-auto text-muted" />
      <p className="mt-0.5 font-display text-lg font-bold leading-none text-fg">{valor}</p>
      <p className="mt-1 text-[10px] text-muted">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [estaciones, setEstaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [accionando, setAccionando] = useState(null);
  const [modalEstacion, setModalEstacion] = useState(null);
  const [compartir, setCompartir] = useState(null);
  const { reproducir, estacionActual, reproduciendo, alternar } = usePlayer();
  const { datos: realtime, conectado } = useRealtime();

  async function cargar() {
    try {
      setError("");
      setEstaciones(await api.estaciones());
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
        est.estado === "online" ? await api.detenerEstacion(est.id) : await api.iniciarEstacion(est.id);
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
  const hayReal = estacionesVivo.some((e) => e.real);
  const realEnVivo = estacionesVivo.some((e) => e.real && e.estado === "online");

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
        <KpiCard
          icon={Signal}
          etiqueta="Estado del servidor"
          valor={realEnVivo ? "En vivo" : hayReal ? "Fuera del aire" : "Operativo"}
          detalle={hayReal ? "Caster.fm · datos reales" : "Icecast 2.4.4"}
          color="bg-accent-500/15 text-accent-500"
        />
      </div>

      {/* Tarjetas de estación */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {estacionesVivo.map((e) => {
          const online = e.estado === "online";
          const esActual = estacionActual?.id === e.id;
          const sonando = esActual && reproduciendo;
          const ocupado = accionando === e.id;
          const pct = Math.min(100, Math.round((e.oyentesActuales / e.oyentesMaximos) * 100));
          const lleno = pct >= 90;
          return (
            <div
              key={e.id}
              className={`card group relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-glow ${
                online ? "ring-1 ring-brand-500/30" : ""
              }`}
            >
              {/* Resplandor superior si está en vivo */}
              {online && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-500/10 to-transparent" />
              )}

              {/* Cabecera */}
              <div className="relative flex items-center gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-grad text-white shadow-glow">
                  <Radio size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-fg">{e.nombre}</h3>
                  <p className="truncate text-xs text-muted">
                    {e.formato} · {e.bitrate} kbps · {e.montaje}
                  </p>
                </div>
                <Estado estado={e.estado} />
              </div>

              {/* Indicador de datos reales del servidor */}
              {e.real && (
                <div className="relative mx-4 -mt-1 mb-1 flex items-center gap-1.5 text-[11px] font-semibold">
                  <Wifi size={12} className={e.estado === "online" ? "text-emerald-500" : "text-muted"} />
                  <span className={e.estado === "online" ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}>
                    {e.estado === "online" ? "Datos reales en vivo" : "Servidor real · sin emisión"}
                  </span>
                </div>
              )}

              {/* Ahora suena */}
              <div className="mx-4 flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2">
                <Eq activo={online} />
                <p className="truncate text-sm text-muted">{e.cancionActual}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 p-4">
                <Stat icon={Users} valor={e.oyentesActuales} label="Oyentes" />
                <Stat icon={TrendingUp} valor={e.picoOyentes} label="Pico" />
                <Stat icon={Activity} valor={e.oyentesMaximos} label="Límite" />
              </div>

              {/* Capacidad */}
              <div className="px-4 pb-1">
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>Capacidad</span>
                  <span className={lleno ? "font-bold text-red-500" : ""}>{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      lleno ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-brand-grad"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Uptime */}
              <div className="px-4 pb-3 pt-2 text-[11px] text-muted">
                {online ? (
                  <span className="flex items-center gap-1">
                    <Clock3 size={12} className="text-emerald-500" /> En línea · {e.uptime}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock3 size={12} /> Detenida
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div className="mt-auto flex items-center gap-2 border-t border-line p-3">
                {online ? (
                  <button onClick={() => toggleEstado(e)} disabled={ocupado} className="btn-danger flex-1">
                    {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />} Detener
                  </button>
                ) : (
                  <button onClick={() => toggleEstado(e)} disabled={ocupado} className="btn-success flex-1">
                    {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Iniciar
                  </button>
                )}
                <button
                  onClick={() => {
                    if (e.embedToken && e.embedCanal) {
                      setCompartir(e);
                      return;
                    }
                    esActual ? alternar() : reproducir(e);
                  }}
                  disabled={!online}
                  className="btn-ghost px-2.5"
                  title="Escuchar"
                >
                  {sonando ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button className="btn-ghost px-2.5" title="Compartir" onClick={() => setCompartir(e)}>
                  <Share2 size={16} />
                </button>
                <button className="btn-ghost px-2.5" title="Configurar" onClick={() => setModalEstacion({ estacion: e })}>
                  <Settings2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Tarjeta para crear nueva estación */}
        <button
          onClick={() => setModalEstacion({})}
          className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-muted transition hover:border-brand-500/60 hover:text-brand-500"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface2">
            <Plus size={24} />
          </div>
          <span className="text-sm font-semibold">Nueva estación</span>
        </button>
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
