import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { usePlayer } from "./PlayerContext";
import { bloqueActivo } from "../utils/programacion";

const AutomatizacionContext = createContext(null);
const LS_KEY = "piloto_auto";

// Motor de automatización (piloto automático) del AutoDJ:
//  - Cambia automáticamente de playlist según el bloque horario vigente.
//  - Inserta cuñas (jingles cada 30 min, publicidad cada hora) las 24 h.
// Todo con opción de control manual desde la UI.
export function AutomatizacionProvider({ children }) {
  const { autenticado } = useAuth();
  const { reproducirLista, reproducirPista, insertarSiguiente, cola, indiceCola } = usePlayer();

  const [auto, setAuto] = useState(() => localStorage.getItem(LS_KEY) === "1");
  const [inserciones, setInserciones] = useState([]);
  const [programacion, setProgramacion] = useState([]);
  const [ahora, setAhora] = useState(new Date());
  const [ultimaCuña, setUltimaCuña] = useState(null); // { nombre, tipo, hora }

  // Refs para el motor (evitan re-suscripciones).
  const autoRef = useRef(auto);
  const insercionesRef = useRef(inserciones);
  const programacionRef = useRef(programacion);
  const colaRef = useRef(cola);
  const indiceRef = useRef(indiceCola);
  autoRef.current = auto;
  insercionesRef.current = inserciones;
  programacionRef.current = programacion;
  colaRef.current = cola;
  indiceRef.current = indiceCola;

  const ultimoBloque = useRef(null);
  const ultimoSlot = useRef({}); // { insercionId: slotIndex }
  const cachePistas = useRef(new Map()); // playlistId -> { pistas, ts }

  // Carga datos al autenticarse.
  function recargar() {
    if (!autenticado) return;
    Promise.all([api.inserciones(), api.programacion()])
      .then(([i, p]) => {
        setInserciones(i);
        setProgramacion(p);
      })
      .catch(() => {});
  }

  useEffect(() => {
    recargar();
  }, [autenticado]);

  // Pistas reproducibles de una playlist (con caché de 60 s).
  async function pistasReproducibles(playlistId) {
    if (!playlistId) return [];
    const c = cachePistas.current.get(playlistId);
    if (c && Date.now() - c.ts < 60000) return c.pistas;
    try {
      const pistas = (await api.pistasDePlaylist(playlistId)).filter((p) => p.previewUrl);
      cachePistas.current.set(playlistId, { pistas, ts: Date.now() });
      return pistas;
    } catch {
      return [];
    }
  }

  function aleatoria(pistas) {
    return pistas.length ? pistas[Math.floor(Math.random() * pistas.length)] : null;
  }

  // Carga la playlist de un bloque (manual o automático).
  async function emitirPlaylistId(playlistId) {
    const pistas = await pistasReproducibles(playlistId);
    if (pistas.length) {
      reproducirLista(pistas, 0);
      return pistas.length;
    }
    return 0;
  }

  // Reproduce/inserta una cuña concreta ahora mismo (botón manual "Probar").
  async function reproducirInsercion(insercion) {
    const pistas = await pistasReproducibles(insercion.playlistId);
    const pista = aleatoria(pistas);
    if (!pista) return false;
    insertarSiguiente(pista);
    setUltimaCuña({ nombre: insercion.nombre, tipo: insercion.tipo, hora: new Date() });
    return true;
  }

  async function toggleInsercionActiva(insercion) {
    const i = await api.actualizarInsercion(insercion.id, { activa: !insercion.activa });
    setInserciones((prev) => prev.map((x) => (x.id === i.id ? i : x)));
  }

  async function cambiarCadaMin(insercion, cadaMin) {
    const i = await api.actualizarInsercion(insercion.id, { cadaMin });
    setInserciones((prev) => prev.map((x) => (x.id === i.id ? i : x)));
    // Reinicia el slot para que respete la nueva frecuencia.
    delete ultimoSlot.current[insercion.id];
  }

  // Activa el piloto automático (gesto del usuario => permite reproducir audio).
  async function activarAuto() {
    localStorage.setItem(LS_KEY, "1");
    setAuto(true);
    autoRef.current = true;
    // Inicializa baselines para no disparar cuñas de inmediato.
    const min = new Date().getHours() * 60 + new Date().getMinutes();
    for (const ins of insercionesRef.current) {
      ultimoSlot.current[ins.id] = Math.floor(min / ins.cadaMin);
    }
    // Arranca con la playlist del bloque vigente, si existe.
    const bloque = bloqueActivo(programacionRef.current, new Date());
    if (bloque?.playlistId) {
      ultimoBloque.current = bloque.id;
      await emitirPlaylistId(bloque.playlistId);
    }
  }

  function desactivarAuto() {
    localStorage.setItem(LS_KEY, "0");
    setAuto(false);
    autoRef.current = false;
  }

  // Motor: corre cada 15 s.
  useEffect(() => {
    async function tick() {
      const now = new Date();
      setAhora(now);
      if (!autoRef.current) return;

      // 1) Sincroniza la playlist con el bloque horario vigente.
      const bloque = bloqueActivo(programacionRef.current, now);
      if (bloque?.playlistId && bloque.id !== ultimoBloque.current) {
        ultimoBloque.current = bloque.id;
        await emitirPlaylistId(bloque.playlistId);
      }

      // 2) Inserta cuñas según su frecuencia (solo si hay música sonando).
      const hayMusica = colaRef.current.length > 0 && indiceRef.current >= 0;
      if (!hayMusica) return;
      const minutosDelDia = now.getHours() * 60 + now.getMinutes();
      for (const ins of insercionesRef.current) {
        if (!ins.activa || !ins.cadaMin) continue;
        const slot = Math.floor(minutosDelDia / ins.cadaMin);
        const prev = ultimoSlot.current[ins.id];
        if (prev === undefined) {
          ultimoSlot.current[ins.id] = slot;
          continue;
        }
        if (slot !== prev) {
          ultimoSlot.current[ins.id] = slot;
          const pistas = await pistasReproducibles(ins.playlistId);
          const pista = aleatoria(pistas);
          if (pista) {
            insertarSiguiente(pista);
            setUltimaCuña({ nombre: ins.nombre, tipo: ins.tipo, hora: new Date() });
          }
        }
      }
    }
    const id = setInterval(tick, 15000);
    tick();
    return () => clearInterval(id);
  }, []);

  const programaAlAire = bloqueActivo(programacion, ahora);

  const value = useMemo(
    () => ({
      auto,
      activarAuto,
      desactivarAuto,
      inserciones,
      programacion,
      programaAlAire,
      ultimaCuña,
      recargar,
      emitirPlaylistId,
      reproducirInsercion,
      toggleInsercionActiva,
      cambiarCadaMin,
    }),
    [auto, inserciones, programacion, programaAlAire, ultimaCuña]
  );

  return (
    <AutomatizacionContext.Provider value={value}>{children}</AutomatizacionContext.Provider>
  );
}

export function useAutomatizacion() {
  const ctx = useContext(AutomatizacionContext);
  if (!ctx) throw new Error("useAutomatizacion debe usarse dentro de AutomatizacionProvider");
  return ctx;
}
