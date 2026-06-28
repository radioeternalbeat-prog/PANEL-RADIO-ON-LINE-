import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function RutaProtegida({ children }) {
  const { autenticado, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
