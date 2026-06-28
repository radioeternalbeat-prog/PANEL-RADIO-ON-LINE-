import { createContext, useContext, useMemo, useRef, useState } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [estacionActual, setEstacionActual] = useState(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [volumen, setVolumen] = useState(0.8);
  const audioRef = useRef(null);

  function reproducir(estacion) {
    // En producción: audioRef.current.src = url del stream (ej. http://host:puerto/montaje)
    setEstacionActual(estacion);
    setReproduciendo(true);
  }

  function alternar() {
    setReproduciendo((r) => !r);
  }

  function detener() {
    setReproduciendo(false);
    setEstacionActual(null);
  }

  const value = useMemo(
    () => ({
      estacionActual,
      reproduciendo,
      volumen,
      setVolumen,
      reproducir,
      alternar,
      detener,
      audioRef,
    }),
    [estacionActual, reproduciendo, volumen]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer debe usarse dentro de PlayerProvider");
  return ctx;
}
