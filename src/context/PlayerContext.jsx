import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { reportarNivel } from "../audio/nivelBus";
import { urlRecurso } from "../api/client";

const PlayerContext = createContext(null);

// Estructura del medio en reproducción:
// { tipo: "estacion" | "pista", id, titulo, subtitulo, artwork, url }
export function PlayerProvider({ children }) {
  const [medioActual, setMedioActual] = useState(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [volumen, setVolumen] = useState(0.8);
  const [error, setError] = useState("");
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });

  // Cola de reproducción (AutoDJ).
  const [cola, setCola] = useState([]); // array de pistas
  const [indiceCola, setIndiceCola] = useState(-1);
  const [modoAuto, setModoAuto] = useState(true); // avanzar automáticamente al terminar

  const audioRef = useRef(null);
  // Refs para que los listeners de audio lean valores actuales sin re-suscribirse.
  const colaRef = useRef(cola);
  const indiceRef = useRef(indiceCola);
  const autoRef = useRef(modoAuto);
  colaRef.current = cola;
  indiceRef.current = indiceCola;
  autoRef.current = modoAuto;

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";
  }

  // Análisis de nivel (Web Audio) para visualizaciones reactivas (ON AIR).
  const analisisRef = useRef({ ctx: null, source: null, analyser: null });
  function asegurarAnalisis() {
    const a = analisisRef.current;
    if (a.ctx || !audioRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analisisRef.current = { ctx, source, analyser };
    } catch {
      /* si falla, el audio se reproduce normalmente sin análisis */
    }
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volumen;
  }, [volumen]);

  // Eventos del audio: progreso, fin de pista (auto-avance) y errores.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () =>
      setProgreso({ actual: audio.currentTime || 0, total: audio.duration || 0 });
    const onLoaded = () =>
      setProgreso({ actual: 0, total: audio.duration || 0 });
    const onEnded = () => {
      // Si hay cola y modo automático, pasar a la siguiente pista.
      const c = colaRef.current;
      const i = indiceRef.current;
      if (autoRef.current && c.length && i < c.length - 1) {
        reproducirIndice(i + 1);
      } else {
        setReproduciendo(false);
      }
    };
    const onError = () => {
      setError("No se pudo reproducir el audio.");
      setReproduciendo(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  function pistaAMedio(pista) {
    return {
      tipo: "pista",
      id: pista.id ?? pista.itunesId,
      titulo: pista.titulo,
      subtitulo: pista.artista,
      artwork: pista.artwork || null,
      url: pista.previewUrl ? urlRecurso(pista.previewUrl) : null,
    };
  }

  function reproducirMedio(medio) {
    const audio = audioRef.current;
    setError("");
    setMedioActual(medio);
    setProgreso({ actual: 0, total: 0 });

    if (!audio) return;
    if (medio.url) {
      asegurarAnalisis();
      if (analisisRef.current.ctx?.state === "suspended") {
        analisisRef.current.ctx.resume();
      }
      audio.src = medio.url;
      audio
        .play()
        .then(() => setReproduciendo(true))
        .catch(() => {
          setError("No se pudo reproducir (sin audio disponible).");
          setReproduciendo(false);
        });
    } else {
      audio.removeAttribute("src");
      setReproduciendo(true);
    }
  }

  // Reporta el nivel del reproductor al bus compartido (para visualizaciones).
  useEffect(() => {
    let raf;
    const buf = new Uint8Array(128);
    function loop() {
      const an = analisisRef.current.analyser;
      if (an) {
        an.getByteTimeDomainData(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          s += v * v;
        }
        reportarNivel("player", Math.sqrt(s / buf.length));
      } else {
        reportarNivel("player", 0);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Reproducir una posición concreta de la cola.
  function reproducirIndice(i) {
    const c = colaRef.current;
    if (i < 0 || i >= c.length) return;
    setIndiceCola(i);
    indiceRef.current = i;
    reproducirMedio(pistaAMedio(c[i]));
  }

  // Reproducir una estación (usa su stream si está disponible).
  function reproducir(estacion) {
    setCola([]);
    setIndiceCola(-1);
    reproducirMedio({
      tipo: "estacion",
      id: estacion.id,
      titulo: estacion.nombre,
      subtitulo: estacion.cancionActual,
      artwork: null,
      url: estacion.streamUrl || null,
    });
  }

  // Reproducir una pista suelta (también la deja como cola de 1).
  function reproducirPista(pista) {
    setCola([pista]);
    setIndiceCola(0);
    colaRef.current = [pista];
    indiceRef.current = 0;
    reproducirMedio(pistaAMedio(pista));
  }

  // Cargar una lista completa en la cola y empezar desde 'inicio'.
  function reproducirLista(pistas, inicio = 0) {
    if (!pistas?.length) return;
    setCola(pistas);
    colaRef.current = pistas;
    reproducirIndice(inicio);
  }

  // Añadir una pista al final de la cola.
  function encolar(pista) {
    setCola((c) => [...c, pista]);
  }

  // Insertar una pista justo DESPUÉS de la que suena (para cuñas: jingles/publicidad).
  // Si no hay nada reproduciéndose, la reproduce de inmediato.
  function insertarSiguiente(pista) {
    const c = colaRef.current;
    const i = indiceRef.current;
    if (!c.length || i < 0) {
      reproducirPista(pista);
      return;
    }
    const nueva = [...c];
    nueva.splice(i + 1, 0, pista);
    setCola(nueva);
    colaRef.current = nueva;
  }

  function quitarDeCola(indice) {
    setCola((c) => c.filter((_, i) => i !== indice));
    setIndiceCola((i) => (indice < i ? i - 1 : i));
  }

  function siguiente() {
    if (indiceRef.current < colaRef.current.length - 1) reproducirIndice(indiceRef.current + 1);
  }
  function anterior() {
    if (indiceRef.current > 0) reproducirIndice(indiceRef.current - 1);
  }

  function alternar() {
    const audio = audioRef.current;
    if (reproduciendo) {
      audio?.pause();
      setReproduciendo(false);
    } else if (audio?.src) {
      audio.play().then(() => setReproduciendo(true)).catch(() => {});
    } else if (colaRef.current.length) {
      reproducirIndice(indiceRef.current >= 0 ? indiceRef.current : 0);
    } else {
      setReproduciendo(true);
    }
  }

  function buscar(segundos) {
    const audio = audioRef.current;
    if (audio && Number.isFinite(segundos)) audio.currentTime = segundos;
  }

  function detener() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    setReproduciendo(false);
    setMedioActual(null);
    setProgreso({ actual: 0, total: 0 });
  }

  const value = useMemo(
    () => ({
      medioActual,
      estacionActual: medioActual?.tipo === "estacion" ? medioActual : null,
      reproduciendo,
      volumen,
      setVolumen,
      error,
      progreso,
      cola,
      indiceCola,
      modoAuto,
      setModoAuto,
      reproducir,
      reproducirPista,
      reproducirLista,
      reproducirIndice,
      encolar,
      insertarSiguiente,
      quitarDeCola,
      siguiente,
      anterior,
      alternar,
      buscar,
      detener,
      audioRef,
    }),
    [medioActual, reproduciendo, volumen, error, progreso, cola, indiceCola, modoAuto]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer debe usarse dentro de PlayerProvider");
  return ctx;
}
