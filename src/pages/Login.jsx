import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Radio, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        {/* Panel lateral promocional */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white md:flex">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Radio size={22} />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold">PANEL RADIO</p>
              <p className="text-xs text-brand-200">ONLINE</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold leading-snug">
              Tu radio, bajo control total.
            </h2>
            <p className="mt-3 text-sm text-brand-100">
              Gestiona estaciones, oyentes, AutoDJ y estadísticas en tiempo real desde un
              solo lugar.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-brand-100">
              <li>• Streaming Icecast / SHOUTcast</li>
              <li>• AutoDJ con playlists y horarios</li>
              <li>• Estadísticas de oyentes en vivo</li>
            </ul>
          </div>
          <p className="text-xs text-brand-200">© {new Date().getFullYear()} Panel Radio Online</p>
        </div>

        {/* Formulario */}
        <div className="p-8 sm:p-10">
          <div className="mb-8 md:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Radio size={22} />
              </div>
              <p className="font-extrabold text-slate-800">PANEL RADIO ONLINE</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-500">Accede a tu panel de control.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="label">Usuario</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {verClave ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-brand-600" />
                Recordarme
              </label>
              <a href="#" className="font-medium text-brand-600 hover:underline">
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

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo: usuario <span className="font-semibold text-slate-500">admin</span> · contraseña{" "}
            <span className="font-semibold text-slate-500">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
