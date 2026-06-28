import { createContext, useContext, useEffect, useMemo, useState } from "react";

const OnAirContext = createContext(null);
const STORAGE = "prb_on_air";

export function OnAirProvider({ children }) {
  const [enVivo, setEnVivo] = useState(() => localStorage.getItem(STORAGE) === "1");

  useEffect(() => {
    localStorage.setItem(STORAGE, enVivo ? "1" : "0");
  }, [enVivo]);

  const value = useMemo(
    () => ({ enVivo, setEnVivo, alternar: () => setEnVivo((v) => !v) }),
    [enVivo]
  );

  return <OnAirContext.Provider value={value}>{children}</OnAirContext.Provider>;
}

export function useOnAir() {
  const ctx = useContext(OnAirContext);
  if (!ctx) throw new Error("useOnAir debe usarse dentro de OnAirProvider");
  return ctx;
}
