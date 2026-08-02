import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  Crown,
  DollarSign,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../api/client";

export default function Superadmin() {
  const [clientes, setClientes] = useState([]);
  const [stats, setStats] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [accion, setAccion] = useState(null); // { tipo, clienteId }
  const [planSeleccionado, setPlanSeleccionado] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    try {
      const [c, s, p] = await Promise.all([
        api.adminClientes(),
        api.adminEstadisticas(),
        api.adminPlanes(),
      ]);
      setClientes(c);
      setStats(s);
      setPlanes(p);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }

  async function ejecutarAccion(tipo, clienteId, datos = {}) {
    setAccion({ tipo, clienteId });
    try {
      switch (tipo) {
        case "activar":
          await api.adminActivarLicencia(clienteId, datos);
          break;
        case "desactivar":
          await api.adminDesactivarLicencia(clienteId);
          break;
        case "suspender":
          await api.adminSuspender(clienteId);
          break;
        case "reactivar":
          await api.adminReactivar(clienteId);
          break;
        case "eliminar":
          if (!confirm("¿Eliminar este cliente y todos sus datos? Esta acción es irreversible.")) return;
          await api.adminEliminarCliente(clienteId);
          break;
      }
      await cargarDatos();
    } catch (err) {
      alert(err.message || "Error al ejecutar la acción.");
    } finally {
      setAccion(null);
    }
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.usuario?.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Panel de Administración</h1>
        <p className="text-sm text-muted">Gestiona clientes, licencias y pagos de la plataforma.</p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Users} label="Total clientes" value={stats.total} />
          <StatCard icon={UserCheck} label="Con licencia" value={stats.conLicencia} color="emerald" />
          <StatCard icon={Play} label="En trial" value={stats.enTrial} color="brand" />
          <StatCard icon={AlertTriangle} label="Expirados" value={stats.expirados} color="red" />
          <StatCard icon={DollarSign} label="Ingresos" value={formatCLP(stats.ingresosTotales)} color="emerald" />
        </div>
      )}

      {/* Buscar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, email o usuario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Tabla de clientes */}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface2">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Licencia</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Días rest.</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Registro</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => (
              <tr key={c.id} className="border-b border-line/50 hover:bg-surface2/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-fg">{c.nombre}</p>
                    <p className="text-xs text-muted">{c.email}</p>
                    <p className="text-xs text-muted">@{c.usuario}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={c.estado} />
                </td>
                <td className="px-4 py-3">
                  <LicenciaBadge cliente={c} />
                </td>
                <td className="px-4 py-3 font-mono text-fg">
                  {c.diasRestantes > 0 ? c.diasRestantes : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {new Date(c.creado).toLocaleDateString("es-CL")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Activar licencia */}
                    {!c.licenciaActiva && c.rol !== "superadmin" && (
                      <AccionDropdown
                        planes={planes}
                        onActivar={(planId) => ejecutarAccion("activar", c.id, { planId })}
                        cargando={accion?.clienteId === c.id && accion?.tipo === "activar"}
                      />
                    )}
                    {/* Desactivar */}
                    {c.licenciaActiva && c.rol !== "superadmin" && (
                      <button
                        onClick={() => ejecutarAccion("desactivar", c.id)}
                        className="rounded p-1.5 text-amber-400 hover:bg-amber-500/10"
                        title="Desactivar licencia"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                    {/* Suspender / Reactivar */}
                    {c.estado === "activo" && c.rol !== "superadmin" && (
                      <button
                        onClick={() => ejecutarAccion("suspender", c.id)}
                        className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                        title="Suspender cuenta"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                    {c.estado === "suspendido" && (
                      <button
                        onClick={() => ejecutarAccion("reactivar", c.id)}
                        className="rounded p-1.5 text-emerald-400 hover:bg-emerald-500/10"
                        title="Reactivar cuenta"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {/* Eliminar */}
                    {c.rol !== "superadmin" && (
                      <button
                        onClick={() => ejecutarAccion("eliminar", c.id)}
                        className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                        title="Eliminar cliente"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No se encontraron clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Componentes auxiliares ----

function StatCard({ icon: Icon, label, value, color = "brand" }) {
  const colores = {
    brand: "text-brand-400 bg-brand-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    red: "text-red-400 bg-red-500/10",
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`rounded-lg p-2 ${colores[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-bold text-fg">{value}</p>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  if (estado === "activo") return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">Activo</span>;
  if (estado === "suspendido") return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">Suspendido</span>;
  return <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-400">{estado}</span>;
}

function LicenciaBadge({ cliente }) {
  if (cliente.rol === "superadmin") return <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">Superadmin</span>;
  if (cliente.licenciaActiva && !cliente.licenciaExpirada) return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">Licenciado</span>;
  if (cliente.enTrial) return <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-400">Trial</span>;
  return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">Expirado</span>;
}

function AccionDropdown({ planes, onActivar, cargando }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
        title="Activar licencia"
      >
        {cargando ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        <ChevronDown size={12} />
      </button>
      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-line bg-surface py-1 shadow-xl">
          <p className="px-3 py-1 text-xs font-medium text-muted">Activar plan:</p>
          {planes.map((p) => (
            <button
              key={p.id}
              onClick={() => { onActivar(p.id); setAbierto(false); }}
              className="w-full px-3 py-1.5 text-left text-xs text-fg hover:bg-surface2"
            >
              {p.nombre} ({p.duracionDias}d)
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatCLP(n) {
  if (!n) return "$0";
  return `$${Number(n).toLocaleString("es-CL")}`;
}
