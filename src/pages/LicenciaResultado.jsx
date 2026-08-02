import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { api } from "../api/client";

export default function LicenciaResultado({ tipo }) {
  const [searchParams] = useSearchParams();
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
  const status = searchParams.get("status") || searchParams.get("collection_status") || tipo;

  useEffect(() => {
    if (paymentId && tipo === "exito") {
      verificarPago();
    }
  }, [paymentId]);

  async function verificarPago() {
    setVerificando(true);
    try {
      const r = await api.verificarPago(paymentId);
      setResultado(r);
    } catch {
      // No es crítico — el webhook ya debería haberlo procesado
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-xl">
        {tipo === "exito" && (
          <>
            <CheckCircle2 size={64} className="mx-auto text-emerald-400" />
            <h1 className="mt-4 text-2xl font-bold text-fg">Pago exitoso</h1>
            <p className="mt-2 text-muted">
              {resultado?.mensaje || "Tu licencia ha sido activada. Ya puedes usar todas las funciones del panel."}
            </p>
            {verificando && (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
                <Loader2 size={14} className="animate-spin" /> Verificando activación...
              </p>
            )}
          </>
        )}

        {tipo === "error" && (
          <>
            <XCircle size={64} className="mx-auto text-red-400" />
            <h1 className="mt-4 text-2xl font-bold text-fg">Pago no completado</h1>
            <p className="mt-2 text-muted">
              El pago fue rechazado o cancelado. No se realizó ningún cargo. Puedes intentar nuevamente.
            </p>
          </>
        )}

        {tipo === "pendiente" && (
          <>
            <Clock size={64} className="mx-auto text-amber-400" />
            <h1 className="mt-4 text-2xl font-bold text-fg">Pago pendiente</h1>
            <p className="mt-2 text-muted">
              Tu pago está siendo procesado. La licencia se activará automáticamente cuando se confirme (puede tomar unos minutos).
            </p>
          </>
        )}

        <div className="mt-8 space-y-3">
          <Link to="/" className="btn-primary block w-full py-2.5 text-center">
            Ir al panel
          </Link>
          <Link to="/planes" className="btn-ghost block w-full py-2.5 text-center">
            Ver planes
          </Link>
        </div>
      </div>
    </div>
  );
}
