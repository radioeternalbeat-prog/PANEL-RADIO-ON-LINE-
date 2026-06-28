import { createContext, useCallback, useContext, useMemo, useRef } from "react";

// Puente entre el panel de Cola y el Mezclador: permite cargar una pista
// directamente en el deck A o B desde otros paneles.
const MezcladorContext = createContext(null);

export function MezcladorProvider({ children }) {
  const cargadorRef = useRef(null);

  const registrarCargador = useCallback((fn) => {
    cargadorRef.current = fn;
  }, []);

  const cargarEnDeck = useCallback((id, pista) => {
    return cargadorRef.current?.(id, pista);
  }, []);

  const value = useMemo(
    () => ({ registrarCargador, cargarEnDeck }),
    [registrarCargador, cargarEnDeck]
  );

  return <MezcladorContext.Provider value={value}>{children}</MezcladorContext.Provider>;
}

export function useMezclador() {
  const ctx = useContext(MezcladorContext);
  if (!ctx) throw new Error("useMezclador debe usarse dentro de MezcladorProvider");
  return ctx;
}
