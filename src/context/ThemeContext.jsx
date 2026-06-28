import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "prb_tema";

function temaInicial() {
  if (typeof window === "undefined") return "dark";
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (guardado === "light" || guardado === "dark") return guardado;
  // Preferencia del sistema como respaldo.
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    const root = document.documentElement;
    if (tema === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(STORAGE_KEY, tema);
  }, [tema]);

  function alternarTema() {
    setTema((t) => (t === "dark" ? "light" : "dark"));
  }

  const value = useMemo(() => ({ tema, esOscuro: tema === "dark", alternarTema, setTema }), [tema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
