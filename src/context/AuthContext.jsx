import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  api,
  configurarSesionExpirada,
  getToken,
  setToken,
  tenantApi,
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
    // Intentar primero como tenant, luego como admin legacy
    tenantApi
      .perfil()
      .then((u) => setUsuario(u))
      .catch(() => api.perfil().then((u) => setUsuario(u)))
      .catch(() => setToken(null))
      .finally(() => setCargando(false));
  }, []);

  // Login unificado: intenta primero como tenant, luego como admin legacy
  async function iniciarSesion(nombreUsuario, clave) {
    let tenantError = null;
    // Intento 1: login como tenant (clientes registrados)
    try {
      const { token, usuario: u } = await tenantApi.login(nombreUsuario, clave);
      setToken(token);
      setUsuario(u);
      return u;
    } catch (err) {
      tenantError = err;
    }

    // Intento 2: login como admin legacy (tabla usuarios original)
    try {
      const { token, usuario: u } = await api.login(nombreUsuario, clave);
      setToken(token);
      setUsuario(u);
      return u;
    } catch {
      // Si ambos fallaron, lanzar el error del primer intento (más relevante)
      throw tenantError || new Error("Usuario o contraseña incorrectos.");
    }
  }

  // Registro de nuevos clientes
  async function registrar({ nombre, email, telefono, usuario: usr, clave }) {
    const { token, usuario: u } = await tenantApi.registro({
      nombre,
      email,
      telefono,
      usuario: usr,
      clave,
    });
    setToken(token);
    setUsuario(u);
    return u;
  }

  function cerrarSesion() {
    setToken(null);
    setUsuario(null);
  }

  const value = useMemo(
    () => ({
      usuario,
      cargando,
      autenticado: !!usuario,
      esSuperadmin: usuario?.rol === "superadmin" || usuario?.rol === "Administrador",
      iniciarSesion,
      registrar,
      cerrarSesion,
    }),
    [usuario, cargando]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
