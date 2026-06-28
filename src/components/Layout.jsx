import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Menu,
  Moon,
  RadioTower,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { cuenta } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import MiniReproductor from "./MiniReproductor";

const navItems = [
  { to: "/", label: "Estaciones", icon: LayoutDashboard, end: true },
  { to: "/transmision", label: "Transmisión", icon: RadioTower },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/autodj", label: "AutoDJ", icon: ListMusic },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

function BotonTema() {
  const { esOscuro, alternarTema } = useTheme();
  return (
    <button
      onClick={alternarTema}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface2 text-muted transition hover:text-fg"
      title={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label="Cambiar tema"
    >
      {esOscuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

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
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-line bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <img
            src="/logo-icon.svg"
            alt="Eternal Beat Medios"
            className="h-10 w-10"
          />
          <div className="leading-tight">
            <p className="font-display text-sm font-extrabold tracking-tight text-fg">ETERNAL BEAT</p>
            <p className="bg-brand-grad bg-clip-text text-[11px] font-bold tracking-[0.2em] text-transparent">MEDIOS</p>
          </div>
          <button
            onClick={() => setAbierto(false)}
            className="ml-auto text-muted lg:hidden"
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
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-muted hover:bg-surface2 hover:text-fg"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-3 bottom-4">
          <div className="rounded-xl border border-line bg-surface2 p-3">
            <p className="text-xs text-muted">Plan actual</p>
            <p className="text-sm font-semibold text-fg">{persona.plan}</p>
            <button
              onClick={salir}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-fg transition hover:bg-brand-600 hover:text-white"
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay móvil */}
      {abierto && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-4 lg:px-6">
          <button
            onClick={() => setAbierto(true)}
            className="text-muted lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Buscar estación, canción o cliente..." />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <BotonTema />
            <button className="relative rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-400" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-grad text-sm font-bold text-white">
                {persona.nombre.charAt(0)}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-fg">{persona.nombre}</p>
                <p className="text-xs text-muted">{persona.rol}</p>
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
