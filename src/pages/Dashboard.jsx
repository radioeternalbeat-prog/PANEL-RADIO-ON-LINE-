import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Clock3,
  Disc3,
  Headphones,
  History,
  Loader2,
  Lock,
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
  Volume2,
  VolumeX,
  Wifi,
} from "lucide-react";
import { api } from "../api/client";
import { useRealtime } from "../hooks/useRealtime";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import ModalEstacion from "../components/estaciones/ModalEstacion";
import ModalCompartir from "../components/estaciones/ModalCompartir";
import WizardBienvenida from "../components/WizardBienvenida";

// ---- Componentes auxiliares ----

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

// Ecualizador animado
function Eq({ activo, grande }) {
  const barras = grande ? 8 : 4;
  return (
    <span className={`flex items-end gap-0.5 ${grande ? "h-8 w-14" : "h-4 w-5"}`}>
      {Array.from({ length: barras }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full ${grande ? "w-1.5" : "w-1"} ${activo ? "bg-brand-500 animate-eq" : "bg-line"}`}
          style={activo ? { animationDelay: `${i * 0.12}s`, height: "25%" } : { height: "25%" }}
        />
      ))}
    </span>
  );
}

// Mini gráfica de oyentes (barras de los últimos N snapshots)
function MiniGrafica({ historial }) {
  const max = Math.max(1, ...historial);
  return (
    <div className="flex h-12 items-end gap-px">
      {historial.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-brand-500/60 transition-all duration-300"
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function KpiCard({ icon: Icon, etiqueta, valor, detalle, color }) {
  return (
    <div className="card p-4 transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{etiqueta}</p>
      <p className="font-display text-2xl font-bold text-fg">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-muted">{detalle}</p>}
    </div>
  );
}

// ---- Componente principal ----

export default function Dashboard() {
  const [estaciones, setEstaciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [accionando, setAccionando] = useState(null);
  const [modalEstacion, setModalEstacion] = useState(null);
  const [compartir, setCompartir] = useState(null);
  const [oyentesHistorial, setOyentesHistorial] = useState([]);
  const { reproducir, estacionActual, reproduciendo, alternar } = usePlayer();
  const { datos: realtime, conectado } = useRealtime();
  const { usuario } = useAuth();

  // Límite de estaciones según plan (por ahora 1 para starter, expandible)
  const maxEstaciones = usuario?.maxEstaciones || 1;

  async function cargar() {
    try {
      setError("");
      const est = await api.estaciones();
      setEstaciones(est);
      // Cargar historial de la primera estación
      if (est.length > 0) {
        try {
          const h = await api.historialEstacion?.(est[0].id) || [];
          setHistorial(h);
        } catch { /* endpoint puede no existir aún */ }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  // Acumular historial de oyentes para la mini gráfica (últimos 30 snapshots)
  useEffect(() => {
    if (realtime?.estaciones?.length > 0) {
      const total = realtime.estaciones.reduce((a, e) => a + (e.oyentesActuales || 0), 0);
      setOyentesHistorial((prev) => [...prev.slice(-29), total]);
    }
  }, [realtime]);

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

  const totalOyentes = estacionesVivo.reduce((a, e) => a + (e.oyentesActuales || 0), 0);
  const enLinea = estacionesVivo.filter((e) => e.estado === "online").length;
  const picoTotal = estacionesVivo.reduce((a, e) => a + (e.picoOyentes || 0), 0);
  const puedeCrear = estacionesVivo.length < maxEstaciones;

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wizard de bienvenida (solo la primera vez) */}
      <WizardBienvenida />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Mi Estación</h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            Control total de tu radio en vivo.
            <span
              className={`badge ${conectado ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-surface2 text-muted"}`}
            >
              <Wifi size={12} /> {conectado ? "En vivo" : "Sin conexión"}
            </span>
          </p>
        </div>
        {puedeCrear ? (
          <button className="btn-primary" onClick={() => setModalEstacion({})}>
            <Plus size={18} /> Nueva estación
          </button>
        ) : (
          <span className="flex items-center gap-2 rounded-lg bg-surface2 px-3 py-2 text-xs text-muted">
            <Lock size={14} /> Límite de estaciones ({estacionesVivo.length}/{maxEstaciones})
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Radio} etiqueta="Estaciones" valor={`${enLinea}/${estacionesVivo.length}`} detalle="En transmisión" color="bg-brand-500/15 text-brand-500" />
        <KpiCard icon={Headphones} etiqueta="Oyentes ahora" valor={totalOyentes} detalle="En tiempo real" color="bg-emerald-500/15 text-emerald-500" />
        <KpiCard icon={TrendingUp} etiqueta="Pico máximo" valor={picoTotal} detalle="Récord histórico" color="bg-amber-500/15 text-amber-500" />
        <KpiCard icon={Signal} etiqueta="Calidad" valor={estacionesVivo[0]?.bitrate ? `${estacionesVivo[0].bitrate} kbps` : "—"} detalle={estacionesVivo[0]?.formato || "—"} color="bg-accent-500/15 text-accent-500" />
      </div>

      {/* Estaciones */}
      {estacionesVivo.map((e) => {
        const online = e.estado === "online";
        const esActual = estacionActual?.id === e.id;
        const sonando = esActual && reproduciendo;
        const ocupado = accionando === e.id;
        const pct = Math.min(100, Math.round(((e.oyentesActuales || 0) / (e.oyentesMaximos || 100)) * 100));
        const lleno = pct >= 90;

        return (
          <div key={e.id} className="card overflow-hidden">
            {/* Cabecera de estación con gradiente */}
            <div className={`relative p-6 ${online ? "bg-gradient-to-r from-brand-600/20 via-surface to-emerald-600/10" : "bg-surface"}`}>
              {/* Glow effect */}
              {online && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent" />}

              <div className="relative flex items-start gap-4">
                {/* Avatar de estación */}
                <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-lg ${online ? "bg-brand-grad shadow-brand-500/20" : "bg-surface2"}`}>
                  <Radio size={36} className={online ? "text-white" : "text-muted"} />
                </div>

                {/* Info principal */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-fg">{e.nombre}</h2>
                    <Estado estado={e.estado} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {e.servidor || "Icecast"} · {e.formato} · {e.bitrate} kbps · {e.montaje}
                  </p>
                  {e.real && (
                    <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${online ? "text-emerald-400" : "text-muted"}`}>
                      <Wifi size={12} /> {online ? "Datos reales del servidor" : "Servidor real · sin emisión"}
                    </p>
                  )}
                  {/* Uptime */}
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                    <Clock3 size={12} className={online ? "text-emerald-500" : ""} />
                    {online ? `En línea · ${e.uptime}` : "Detenida"}
                  </p>
                </div>

                {/* Controles principales */}
                <div className="flex shrink-0 flex-col gap-2">
                  {online ? (
                    <button onClick={() => toggleEstado(e)} disabled={ocupado} className="btn-danger">
                      {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />} Detener
                    </button>
                  ) : (
                    <button onClick={() => toggleEstado(e)} disabled={ocupado} className="btn-success">
                      {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Iniciar
                    </button>
                  )}
                  <button className="btn-ghost text-xs" onClick={() => setModalEstacion({ estacion: e })}>
                    <Settings2 size={14} /> Configurar
                  </button>
                </div>
              </div>
            </div>

            {/* Ahora suena — sección destacada */}
            <div className="border-y border-line bg-surface2/50 px-6 py-4">
              <div className="flex items-center gap-4">
                {/* Artwork placeholder + ecualizador */}
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${online ? "bg-brand-500/20" : "bg-surface2"}`}>
                  {online ? (
                    <Eq activo grande />
                  ) : (
                    <Music2 size={24} className="text-muted" />
                  )}
                </div>

                {/* Track info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {online ? "Ahora suena" : "Última reproducción"}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-fg">
                    {e.cancionActual || "—"}
                  </p>
                </div>

                {/* Player integrado */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (e.embedToken && e.embedCanal) { setCompartir(e); return; }
                      esActual ? alternar() : reproducir(e);
                    }}
                    disabled={!online}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                      sonando
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                        : online
                          ? "bg-brand-500/20 text-brand-400 hover:bg-brand-500/30"
                          : "bg-surface2 text-muted"
                    }`}
                    title={sonando ? "Pausar" : "Escuchar"}
                  >
                    {sonando ? <Pause size={18} /> : <Volume2 size={18} />}
                  </button>
                  <button className="btn-ghost px-2" title="Compartir" onClick={() => setCompartir(e)}>
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Cuerpo: métricas + gráfica + historial */}
            <div className="grid gap-6 p-6 lg:grid-cols-3">
              {/* Columna 1: Métricas en vivo */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  <Activity size={14} /> Métricas en vivo
                </h3>

                {/* Oyentes */}
                <div className="rounded-xl bg-surface2 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-brand-400" />
                      <span className="text-sm text-muted">Oyentes</span>
                    </div>
                    <span className="font-display text-2xl font-bold text-fg">{e.oyentesActuales || 0}</span>
                  </div>
                  {/* Barra de capacidad */}
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] text-muted">
                      <span>Capacidad</span>
                      <span className={lleno ? "font-bold text-red-400" : ""}>{pct}% · {e.oyentesMaximos} máx</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          lleno ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-brand-grad"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pico */}
                <div className="flex items-center justify-between rounded-xl bg-surface2 p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-amber-400" />
                    <span className="text-sm text-muted">Pico máximo</span>
                  </div>
                  <span className="font-display text-lg font-bold text-fg">{e.picoOyentes || 0}</span>
                </div>

                {/* AutoDJ */}
                <div className="flex items-center justify-between rounded-xl bg-surface2 p-4">
                  <div className="flex items-center gap-2">
                    <Disc3 size={16} className={e.autodj ? "text-brand-400 animate-spin-slow" : "text-muted"} />
                    <span className="text-sm text-muted">AutoDJ</span>
                  </div>
                  <span className={`badge ${e.autodj ? "bg-brand-500/15 text-brand-400" : "bg-surface text-muted"}`}>
                    {e.autodj ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              {/* Columna 2: Gráfica de oyentes */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  <TrendingUp size={14} /> Oyentes en tiempo real
                </h3>
                <div className="rounded-xl bg-surface2 p-4">
                  {oyentesHistorial.length > 2 ? (
                    <>
                      <MiniGrafica historial={oyentesHistorial} />
                      <p className="mt-2 text-center text-[10px] text-muted">
                        Últimos {oyentesHistorial.length} snapshots (cada 3s)
                      </p>
                    </>
                  ) : (
                    <div className="flex h-16 items-center justify-center text-xs text-muted">
                      Recopilando datos...
                    </div>
                  )}
                </div>

                {/* Calidad de señal */}
                <div className="rounded-xl bg-surface2 p-4">
                  <h4 className="mb-2 text-xs font-semibold text-muted">Señal</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-fg">{e.bitrate || "—"}</p>
                      <p className="text-[10px] text-muted">kbps</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-fg">{e.formato || "—"}</p>
                      <p className="text-[10px] text-muted">Formato</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-fg">{online ? "OK" : "—"}</p>
                      <p className="text-[10px] text-muted">Estado</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna 3: Historial de reproducción */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  <History size={14} /> Historial
                </h3>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl bg-surface2 p-3">
                  {historial.length > 0 ? (
                    historial.slice(0, 15).map((h, i) => (
                      <div key={h.id || i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                          {h.artwork ? (
                            <img src={h.artwork} alt="" className="h-8 w-8 rounded-lg object-cover" />
                          ) : (
                            <Music2 size={14} className="text-brand-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-fg">{h.titulo || "—"}</p>
                          <p className="truncate text-[10px] text-muted">{h.artista || ""}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-20 items-center justify-center text-xs text-muted">
                      Sin historial aún
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Tarjeta para crear nueva estación */}
      {puedeCrear && (
        <button
          onClick={() => setModalEstacion({})}
          className="flex w-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-muted transition hover:border-brand-500/60 hover:text-brand-500 hover:bg-brand-500/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface2">
            <Plus size={24} />
          </div>
          <span className="text-sm font-semibold">Agregar nueva estación</span>
          <span className="text-xs text-muted">({estacionesVivo.length}/{maxEstaciones} usadas)</span>
        </button>
      )}

      {/* Límite alcanzado */}
      {!puedeCrear && estacionesVivo.length > 0 && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-surface2 p-4 text-sm text-muted">
          <Lock size={16} />
          <span>Has alcanzado el límite de tu plan ({maxEstaciones} estación{maxEstaciones > 1 ? "es" : ""}). </span>
          <a href="/planes" className="font-semibold text-brand-400 hover:underline">Mejorar plan</a>
        </div>
      )}

      {/* Modales */}
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
