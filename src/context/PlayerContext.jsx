import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const PlayerContext = createContext(null);

// Estructura del medio en reproducción:
// { tipo: "estacion" | "pista", id, titulo, subtitulo, artwork, url }
export function PlayerProvider({ children }) {
  const [medioActual, setMedioActual] = useState(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [volumen, setVolumen] = useState(0.8);
  const [error, setError] = useState("");
  const audioRef = useRef(null);

  // Crear el elemento de audio una sola vez.
  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
  }

  // Sincronizar volumen.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volumen;
  }, [volumen]);

  // Eventos del audio (fin de pista, errores).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setReproduciendo(false);
    const onError = () => {
      setError("No se pudo reproducir el audio.");
      setReproduciendo(false);
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  function reproducirMedio(medio) {
    const audio = audioRef.current;
    setError("");
    setMedioActual(medio);

    if (!audio) return;
    if (medio.url) {
      audio.src = medio.url;
      audio
        .play()
        .then(() => setReproduciendo(true))
        .catch(() => {
          setError("No se pudo reproducir (sin audio disponible).");
          setReproduciendo(false);
        });
    } else {
      // Sin URL de audio (ej. estación sin stream real): solo estado visual.
      audio.removeAttribute("src");
      setReproduciendo(true);
    }
  }

  // Reproducir una estación (usa su stream si está disponible).
  function reproducir(estacion) {
    reproducirMedio({
      tipo: "estacion",
      id: estacion.id,
      titulo: estacion.nombre,
      subtitulo: estacion.cancionActual,
      artwork: null,
      url: estacion.streamUrl || null,
    });
  }

  // Reproducir una pista de la biblioteca / iTunes (preview de 30s).
  function reproducirPista(pista) {
    reproducirMedio({
      tipo: "pista",
      id: pista.id ?? pista.itunesId,
      titulo: pista.titulo,
      subtitulo: pista.artista,
      artwork: pista.artwork || null,
      url: pista.previewUrl || null,
    });
  }

  function alternar() {
    const audio = audioRef.current;
    if (reproduciendo) {
      audio?.pause();
      setReproduciendo(false);
    } else {
      if (audio?.src) {
        audio.play().then(() => setReproduciendo(true)).catch(() => {});
      } else {
        setReproduciendo(true);
      }
    }
  }

  function detener() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    setReproduciendo(false);
    setMedioActual(null);
  }

  const value = useMemo(
    () => ({
      medioActual,
      // alias para compatibilidad
      estacionActual: medioActual?.tipo === "estacion" ? medioActual : null,
      reproduciendo,
      volumen,
      setVolumen,
      error,
      reproducir,
      reproducirPista,
      alternar,
      detener,
      audioRef,
    }),
    [medioActual, reproduciendo, volumen, error]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer debe usarse dentro de PlayerProvider");
  return ctx;
}
