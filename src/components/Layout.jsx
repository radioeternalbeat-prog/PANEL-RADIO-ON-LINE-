import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Menu,
  Radio,
  Search,
  Settings,
  X,
} from "lucide-react";
import { cuenta } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import MiniReproductor from "./MiniReproductor";

const navItems = [
  { to: "/", label: "Estaciones", icon: LayoutDashboard, end: true },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/autodj", label: "AutoDJ", icon: ListMusic },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

export default function Layout() {
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const { usuario, cerrarSesion } = useAuth();
  const persona = usuario || cuenta;

  function salir() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-ink-900 text-slate-300 transition-transform duration-200 lg:static lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Radio size={20} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight text-white">PANEL RADIO</p>
            <p className="text-[11px] font-medium text-brand-300">ONLINE</p>
          </div>
          <button
            onClick={() => setAbierto(false)}
            className="ml-auto text-slate-400 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-3 bottom-4">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-slate-400">Plan actual</p>
            <p className="text-sm font-semibold text-white">{persona.plan}</p>
            <button
              onClick={salir}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay móvil */}
      {abierto && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            onClick={() => setAbierto(true)}
            className="text-slate-600 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar estación, canción o cliente..." />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {persona.nombre.charAt(0)}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-slate-800">{persona.nombre}</p>
                <p className="text-xs text-slate-500">{persona.rol}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-28 lg:p-6">
          <Outlet />
        </main>
      </div>

      <MiniReproductor />
    </div>
  );
}
