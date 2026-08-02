import { useEffect, useState } from "react";
import { Check, Crown, Loader2, Radio, Rocket, Star, Zap } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const ICONOS_PLAN = {
  starter: Radio,
  pro: Rocket,
  enterprise: Crown,
  lifetime: Star,
};

function iconoPorCodigo(codigo) {
  if (codigo?.includes("starter")) return ICONOS_PLAN.starter;
  if (codigo?.includes("pro")) return ICONOS_PLAN.pro;
  if (codigo?.includes("enterprise")) return ICONOS_PLAN.enterprise;
  if (codigo?.includes("lifetime")) return ICONOS_PLAN.lifetime;
  return Zap;
}

function formatPrecio(precio, moneda) {
  if (moneda === "CLP") return `$${Number(precio).toLocaleString("es-CL")}`;
  return `${moneda} ${precio}`;
}

export default function Planes() {
  const { usuario } = useAuth();
  const [planes, setPlanes] = useState([]);
  const [miLicencia, setMiLicencia] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [comprando, setComprando] = useState(null); // planId que se está comprando
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargar() {
      try {
        const [p, lic] = await Promise.all([
          fetchPlanes(),
          usuario ? fetchMiLicencia() : Promise.resolve(null),
        ]);
        setPlanes(p);
        setMiLicencia(lic);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [usuario]);

  async function fetchPlanes() {
    const resp = await fetch(`${resolverApiUrl()}/licencias/planes`);
    if (!resp.ok) throw new Error("No se pudieron cargar los planes.");
    return resp.json();
  }

  async function fetchMiLicencia() {
    try {
      return await api.miLicencia();
    } catch {
      return null;
    }
  }

  async function comprar(planId) {
    setComprando(planId);
    setError(null);
    try {
      const resp = await api.crearPreferencia(planId);
      // Redirigir a Mercado Pago
      if (resp.initPoint) {
        window.location.href = resp.initPoint;
      } else if (resp.sandboxInitPoint) {
        window.location.href = resp.sandboxInitPoint;
      } else {
        setError("No se pudo obtener el enlace de pago.");
      }
    } catch (err) {
      setError(err.message || "Error al iniciar el pago.");
    } finally {
      setComprando(null);
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  // Separar oferta lanzamiento, mensuales, anuales y lifetime
  const ofertaLanzamiento = planes.filter((p) => p.codigo?.includes("lanzamiento"));
  const mensuales = planes.filter((p) => p.codigo?.includes("mensual"));
  const anuales = planes.filter((p) => p.codigo?.includes("anual"));
  const lifetime = planes.filter((p) => p.codigo === "lifetime");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-fg">Planes y Licencias</h1>
        <p className="mt-2 text-muted">
          Elige el plan que mejor se adapte a tu radio. Todos incluyen todas las funciones.
        </p>
      </div>

      {/* Estado actual de la licencia */}
      {miLicencia && (
        <div className={`mx-auto max-w-2xl rounded-xl border p-4 text-center ${
          miLicencia.licenciaActiva
            ? "border-emerald-500/30 bg-emerald-500/10"
            : miLicencia.enTrial
              ? "border-brand-500/30 bg-brand-500/10"
              : "border-red-500/30 bg-red-500/10"
        }`}>
          {miLicencia.licenciaActiva && !miLicencia.licenciaExpirada && (
            <p className="text-sm font-medium text-emerald-400">
              <Check size={16} className="mr-1 inline" />
              Licencia activa — {miLicencia.diasRestantes} días restantes
              {miLicencia.plan && ` (${miLicencia.plan.nombre})`}
            </p>
          )}
          {miLicencia.enTrial && (
            <p className="text-sm font-medium text-brand-400">
              <Zap size={16} className="mr-1 inline" />
              Período de prueba — Te quedan {miLicencia.diasRestantes} días gratis
            </p>
          )}
          {miLicencia.trialExpirado && !miLicencia.licenciaActiva && (
            <p className="text-sm font-medium text-red-400">
              Tu prueba gratuita ha expirado. Adquiere una licencia para continuar.
            </p>
          )}
          {miLicencia.licenciaExpirada && (
            <p className="text-sm font-medium text-red-400">
              Tu licencia ha expirado. Renueva para seguir usando el panel.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mx-auto max-w-2xl rounded-lg bg-red-500/10 px-4 py-3 text-center text-sm text-red-500">
          {error}
        </p>
      )}

      {/* OFERTA DE LANZAMIENTO — DESTACADA */}
      {ofertaLanzamiento.length > 0 && (
        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-surface to-brand-500/10 p-8 shadow-2xl shadow-amber-500/10">
            {/* Badge */}
            <div className="absolute -right-8 top-6 rotate-45 bg-amber-500 px-10 py-1 text-xs font-bold text-black shadow">
              LIMITADA
            </div>

            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className="flex-1 text-center md:text-left">
                <span className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                  Oferta de Lanzamiento
                </span>
                <h2 className="mt-3 text-2xl font-bold text-fg">
                  Acceso FULL para siempre
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Pago único. Sin suscripciones. Sin renovaciones. Todas las funciones incluidas: 5 estaciones, 1000 oyentes, 5GB de almacenamiento.
                </p>
                <ul className="mt-4 space-y-1 text-sm text-fg">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-400" /> 5 estaciones simultáneas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-400" /> Hasta 1000 oyentes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-400" /> AutoDJ + iTunes + MIDI
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-400" /> Actualizaciones incluidas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-400" /> Soporte prioritario
                  </li>
                </ul>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <span className="text-sm text-muted line-through">$95.000 CLP</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold text-amber-400">$30</span>
                    <span className="text-lg font-medium text-muted">USD</span>
                  </div>
                  <p className="text-xs text-muted">Pago único para siempre</p>
                </div>
                <button
                  onClick={() => comprar(ofertaLanzamiento[0].id)}
                  disabled={comprando === ofertaLanzamiento[0].id}
                  className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/30 transition hover:bg-amber-400 hover:shadow-amber-400/40 disabled:opacity-50"
                >
                  {comprando === ofertaLanzamiento[0].id ? (
                    <Loader2 size={18} className="mx-auto animate-spin" />
                  ) : (
                    "Comprar ahora — $30 USD"
                  )}
                </button>
                <p className="text-xs text-muted">Oferta por tiempo limitado</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Planes mensuales */}
      {mensuales.length > 0 && (
        <>
          <h2 className="text-center text-lg font-semibold text-fg">Planes Mensuales</h2>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {mensuales.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                comprando={comprando}
                onComprar={comprar}
                destacado={plan.codigo?.includes("pro")}
              />
            ))}
          </div>
        </>
      )}

      {/* Planes anuales */}
      {anuales.length > 0 && (
        <>
          <h2 className="text-center text-lg font-semibold text-fg">
            Planes Anuales <span className="text-sm font-normal text-emerald-400">— Ahorra 2 meses</span>
          </h2>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {anuales.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                comprando={comprando}
                onComprar={comprar}
                destacado={plan.codigo?.includes("pro")}
              />
            ))}
          </div>
        </>
      )}

      {/* Lifetime */}
      {lifetime.length > 0 && (
        <>
          <h2 className="text-center text-lg font-semibold text-fg">Pago Unico</h2>
          <div className="mx-auto max-w-md">
            {lifetime.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                comprando={comprando}
                onComprar={comprar}
                destacado
              />
            ))}
          </div>
        </>
      )}

      {/* Info Mercado Pago */}
      <p className="text-center text-xs text-muted">
        Pagos procesados de forma segura por Mercado Pago. Aceptamos tarjetas, transferencia y más.
      </p>
    </div>
  );
}

function PlanCard({ plan, comprando, onComprar, destacado }) {
  const Icono = iconoPorCodigo(plan.codigo);
  const esAnual = plan.codigo?.includes("anual");
  const esLifetime = plan.codigo?.includes("lifetime");

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        destacado
          ? "border-brand-500/50 bg-brand-500/5 shadow-lg shadow-brand-500/10"
          : "border-line bg-surface"
      }`}
    >
      {destacado && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-white">
          Popular
        </span>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${destacado ? "bg-brand-500/20" : "bg-surface2"}`}>
          <Icono size={20} className={destacado ? "text-brand-400" : "text-muted"} />
        </div>
        <h3 className="font-semibold text-fg">{plan.nombre}</h3>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-fg">{formatPrecio(plan.precio, plan.moneda)}</span>
        <span className="text-sm text-muted">
          {esLifetime ? " / una vez" : esAnual ? " / año" : " / mes"}
        </span>
      </div>

      <p className="mb-4 text-sm text-muted">{plan.descripcion}</p>

      <ul className="mb-6 flex-1 space-y-2 text-sm text-fg">
        <li className="flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          {plan.maxEstaciones} estacion{plan.maxEstaciones > 1 ? "es" : ""}
        </li>
        <li className="flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          Hasta {plan.maxOyentes} oyentes
        </li>
        <li className="flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          {plan.maxStorageMb >= 1000 ? `${plan.maxStorageMb / 1000}GB` : `${plan.maxStorageMb}MB`} almacenamiento
        </li>
        <li className="flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          AutoDJ + iTunes
        </li>
        <li className="flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          Estadísticas en vivo
        </li>
        {esLifetime && (
          <li className="flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            Actualizaciones de por vida
          </li>
        )}
      </ul>

      <button
        onClick={() => onComprar(plan.id)}
        disabled={comprando === plan.id}
        className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
          destacado
            ? "bg-brand-500 text-white hover:bg-brand-600"
            : "bg-surface2 text-fg hover:bg-surface2/80"
        } disabled:opacity-50`}
      >
        {comprando === plan.id ? (
          <Loader2 size={16} className="mx-auto animate-spin" />
        ) : (
          "Comprar ahora"
        )}
      </button>
    </div>
  );
}

// Helper para resolver la URL de la API (sin auth)
function resolverApiUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== "undefined") return `${window.location.origin}/api`;
  return "http://localhost:4000/api";
}
