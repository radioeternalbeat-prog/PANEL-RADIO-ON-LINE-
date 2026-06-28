import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

// Puente entre los paneles (Cola, Audífonos) y el Mezclador:
// - cargar pistas en los decks
// - monitoreo por audífonos (CUE/PFL) con salida de audio independiente
const MezcladorContext = createContext(null);

export function MezcladorProvider({ children }) {
  const cargadorRef = useRef(null);
  const preparadorRef = useRef(null);

  // Estado del monitor de audífonos.
  const [cue, setCue] = useState({ A: false, B: false });
  const [monitorVol, setMonitorVol] = useState(0.8);
  const [salidaId, setSalidaId] = useState(""); // dispositivo de salida (audífonos)
  const [salidas, setSalidas] = useState([]);

  const registrarCargador = useCallback((fn) => {
    cargadorRef.current = fn;
  }, []);
  const registrarPreparador = useCallback((fn) => {
    preparadorRef.current = fn;
  }, []);

  const cargarEnDeck = useCallback((id, pista) => cargadorRef.current?.(id, pista), []);
  const prepararAudio = useCallback(() => preparadorRef.current?.(), []);

  const alternarCue = useCallback(
    (id) => {
      prepararAudio(); // asegura que el motor de audio esté activo
      setCue((c) => ({ ...c, [id]: !c[id] }));
    },
    [prepararAudio]
  );

  const refrescarSalidas = useCallback(async () => {
    try {
      const lista = await navigator.mediaDevices.enumerateDevices();
      setSalidas(lista.filter((d) => d.kind === "audiooutput"));
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo(
    () => ({
      registrarCargador,
      cargarEnDeck,
      registrarPreparador,
      prepararAudio,
      cue,
      alternarCue,
      monitorVol,
      setMonitorVol,
      salidaId,
      setSalidaId,
      salidas,
      refrescarSalidas,
    }),
    [
      registrarCargador,
      cargarEnDeck,
      registrarPreparador,
      prepararAudio,
      cue,
      alternarCue,
      monitorVol,
      salidaId,
      salidas,
      refrescarSalidas,
    ]
  );

  return <MezcladorContext.Provider value={value}>{children}</MezcladorContext.Provider>;
}

export function useMezclador() {
  const ctx = useContext(MezcladorContext);
  if (!ctx) throw new Error("useMezclador debe usarse dentro de MezcladorProvider");
  return ctx;
}
