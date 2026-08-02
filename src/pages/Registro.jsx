import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Registro() {
  const navigate = useNavigate();
  const { registrar } = useAuth();
  const { esOscuro } = useTheme();

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    usuario: "",
    clave: "",
    confirmar: "",
  });
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.nombre || !form.email || !form.usuario || !form.clave) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    if (form.clave.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (form.clave !== form.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      await registrar({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || undefined,
        usuario: form.usuario,
        clave: form.clave,
      });
      navigate("/");
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#121214] p-4">
      {/* Resplandores de fondo */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
        <div className="bg-surface p-8 sm:p-10">
          <div className="mb-6 flex justify-center">
            <img
              src={esOscuro ? "/logo-horizontal-dark.png" : "/logo-horizontal-light.png"}
              alt="Panel Radio Online"
              className="h-12 object-contain"
            />
          </div>

          <h1 className="font-display text-2xl font-bold text-fg">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted">
            Registrate y obtén <span className="font-semibold text-brand-500">7 días gratis</span> con todas las funciones.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {/* Nombre */}
            <div>
              <label className="label">Nombre completo *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-9"
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Tu nombre o el de tu radio"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  className="input pl-9"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            {/* Teléfono (opcional) */}
            <div>
              <label className="label">Teléfono (opcional)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="tel"
                  className="input pl-9"
                  value={form.telefono}
                  onChange={(e) => set("telefono", e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>

            {/* Usuario */}
            <div>
              <label className="label">Usuario *</label>
              <div className="relative">
                <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-9"
                  value={form.usuario}
                  onChange={(e) => set("usuario", e.target.value)}
                  placeholder="mi_radio"
                  autoComplete="username"
                />
              </div>
              <p className="mt-1 text-xs text-muted">3-30 caracteres: letras, números, _ . -</p>
            </div>

            {/* Contraseña */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Contraseña *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type={verClave ? "text" : "password"}
                    className="input pl-9 pr-10"
                    value={form.clave}
                    onChange={(e) => set("clave", e.target.value)}
                    placeholder="Min. 6 caracteres"
                    autoComplete="new-password"
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
              <div>
                <label className="label">Confirmar *</label>
                <input
                  type="password"
                  className="input"
                  value={form.confirmar}
                  onChange={(e) => set("confirmar", e.target.value)}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={cargando}>
              {cargando ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Crear cuenta gratuita
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-medium text-brand-500 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
