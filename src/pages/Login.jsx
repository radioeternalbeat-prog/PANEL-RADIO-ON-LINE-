import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  const { esOscuro } = useTheme();
  const [usuario, setUsuario] = useState("admin");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!usuario || !clave) {
      setError("Ingresa usuario y contraseña.");
      return;
    }
    setCargando(true);
    try {
      await iniciarSesion(usuario, clave);
      navigate("/");
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#121214] p-4">
      {/* Resplandores de fondo */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl md:grid-cols-2">
        {/* Panel lateral promocional */}
        <div className="relative hidden flex-col justify-between bg-brand-grad p-8 text-white md:flex">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="Eternal Beat Medios"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white/40"
            />
            <div className="leading-tight">
              <p className="font-display font-extrabold">ETERNAL BEAT</p>
              <p className="text-xs font-bold tracking-[0.2em] text-white/80">MEDIOS</p>
            </div>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold leading-snug">
              Tu radio, al ritmo perfecto.
            </h2>
            <p className="mt-3 text-sm text-white/80">
              Gestiona estaciones, oyentes, AutoDJ y estadísticas en tiempo real desde un
              solo lugar.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/80">
              <li>• Streaming Icecast / SHOUTcast</li>
              <li>• AutoDJ con música real de iTunes</li>
              <li>• Estadísticas de oyentes en vivo</li>
            </ul>
          </div>
          <p className="text-xs text-white/70">© {new Date().getFullYear()} Eternal Beat Medios</p>
        </div>

        {/* Formulario */}
        <div className="bg-surface p-8 sm:p-10">
          <div className="mb-8 flex justify-center md:justify-start">
            <img
              src={esOscuro ? "/logo-horizontal-dark.png" : "/logo-horizontal-light.png"}
              alt="Eternal Beat Medios"
              className="h-14 object-contain"
            />
          </div>

          <h1 className="font-display text-2xl font-bold text-fg">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted">Accede a tu panel de control.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="label">Usuario</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-9"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="usuario"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={verClave ? "text" : "password"}
                  className="input pl-9 pr-10"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                >
                  {verClave ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted">
                <input type="checkbox" className="rounded border-line text-brand-600" />
                Recordarme
              </label>
              <a href="#" className="font-medium text-brand-500 hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={cargando}>
              {cargando ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Ingresando...
                </>
              ) : (
                "Entrar al panel"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Demo: usuario <span className="font-semibold text-fg">admin</span> · contraseña{" "}
            <span className="font-semibold text-fg">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
