import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  api,
  configurarSesionExpirada,
  getToken,
  setToken,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al montar: si hay token guardado, recuperar el perfil.
  useEffect(() => {
    configurarSesionExpirada(() => setUsuario(null));

    const token = getToken();
    if (!token) {
      setCargando(false);
      return;
    }
    api
      .perfil()
      .then((u) => setUsuario(u))
      .catch(() => setToken(null))
      .finally(() => setCargando(false));
  }, []);

  async function iniciarSesion(nombreUsuario, clave) {
    const { token, usuario: u } = await api.login(nombreUsuario, clave);
    setToken(token);
    setUsuario(u);
    return u;
  }

  function cerrarSesion() {
    setToken(null);
    setUsuario(null);
  }

  const value = useMemo(
    () => ({ usuario, cargando, autenticado: !!usuario, iniciarSesion, cerrarSesion }),
    [usuario, cargando]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
