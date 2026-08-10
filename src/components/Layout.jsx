import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CreditCard,
  Crown,
  Disc3,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Menu,
  Moon,
  Radio,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { cuenta } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useOnAir } from "../context/OnAirContext";
import { usePlayer } from "../context/PlayerContext";
import { useMidiTarget } from "../context/MidiContext";
import { MezcladorProvider } from "../context/MezcladorContext";
import MiniReproductor from "./MiniReproductor";
import AvisoMidi from "./AvisoMidi";
import Mezclador from "../pages/Mezclador";
import Transmision from "../pages/Transmision";

const navItems = [
  { to: "/", label: "Estaciones", icon: LayoutDashboard, end: true },
  { to: "/transmision", label: "Transmisión", icon: RadioTower },
  { to: "/mezclador", label: "Mezclador DJ", icon: Disc3 },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/autodj", label: "Biblioteca y AutoDJ", icon: ListMusic },
  { to: "/planes", label: "Planes y Licencia", icon: CreditCard },
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
  const { alternarTema } = useTheme();
  const { enVivo, alternar: alternarOnAir } = useOnAir();
  const { detener: detenerReproductor } = usePlayer();
  const persona = usuario || cuenta;
  const location = useLocation();
  const enMezclador = location.pathname === "/mezclador";
  const enTransmision = location.pathname === "/transmision";

  function salir() {
    cerrarSesion();
    navigate("/login");
  }

  // --- Mapeo MIDI global: disponible en cualquier pantalla porque Layout
  // envuelve todas las rutas autenticadas (ver App.jsx). Ideal para asignar
  // a botones fijos de un controlador (ej. los botones "Browse"/"Shift"
  // de un DDJ) sin depender de qué panel esté abierto en ese momento.
  useMidiTarget("global.navEstaciones", () => navigate("/"));
  useMidiTarget("global.navTransmision", () => navigate("/transmision"));
  useMidiTarget("global.navMezclador", () => navigate("/mezclador"));
  useMidiTarget("global.navEstadisticas", () => navigate("/estadisticas"));
  useMidiTarget("global.navAutodj", () => navigate("/autodj"));
  useMidiTarget("global.navConfiguracion", () => navigate("/configuracion"));
  useMidiTarget("global.tema", () => alternarTema());
  useMidiTarget("global.onair", () => alternarOnAir());
  // Pánico: corta el reproductor principal. Los paneles de Transmisión
  // (Mezclador/Soundboard) escuchan la MISMA señal "global.panico" cuando
  // están montados, así que si estás en cabina también corta decks y pads.
  useMidiTarget("global.panico", () => detenerReproductor());

  return (
    <MezcladorProvider>
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
          {/* Link de Admin solo para superadmin */}
          {persona?.rol === "superadmin" || persona?.rol === "Administrador" ? (
            <NavLink
              to="/admin"
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                }`
              }
            >
              <ShieldCheck size={18} />
              Admin Clientes
            </NavLink>
          ) : null}
        </nav>

        {/* Banner de licencia / trial */}
        {persona && persona.rol !== "superadmin" && persona.rol !== "Administrador" && (
          <div className="mx-3 mb-2">
            {persona.trialExpirado && !persona.licenciaActiva ? (
              <NavLink
                to="/planes"
                className="block rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-medium text-red-400 hover:bg-red-500/20 transition"
              >
                Tu prueba gratuita expiró. Compra una licencia para continuar.
              </NavLink>
            ) : persona.enTrial ? (
              <NavLink
                to="/planes"
                className="block rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-center text-xs font-medium text-brand-400 hover:bg-brand-500/20 transition"
              >
                Trial: {persona.diasRestantes || "?"} días restantes
              </NavLink>
            ) : null}
          </div>
        )}

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

          {/* Logo y nombre de la radio del usuario */}
          {persona?.nombreRadio && (
            <div className="hidden items-center gap-2 md:flex">
              {persona.logoUrl && (
                <img
                  src={persona.logoUrl}
                  alt={persona.nombreRadio}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              )}
              <span className="text-sm font-bold text-fg">{persona.nombreRadio}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {enVivo && (
              <button
                onClick={() => navigate("/transmision")}
                className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-500"
                title="Estás al aire — ir a Transmisión"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <Radio size={13} className="hidden sm:inline" />
                AL AIRE
              </button>
            )}
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
          {/* Mezclador siempre montado (oculto cuando no está activo) para
              que el Web Audio y los decks no se pierdan al navegar */}
          <div style={{ display: enMezclador ? "block" : "none" }}>
            <Mezclador />
          </div>
          {/* Transmisión siempre montada para no perder la conexión al servidor */}
          <div style={{ display: enTransmision ? "block" : "none" }}>
            <Transmision />
          </div>
          {/* Resto de páginas via router */}
          {!enMezclador && !enTransmision && <Outlet />}
        </main>
      </div>

      <MiniReproductor />
      <AvisoMidi />
    </div>
    </MezcladorProvider>
  );
}
