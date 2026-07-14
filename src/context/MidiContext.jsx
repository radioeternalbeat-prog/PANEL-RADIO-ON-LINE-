import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { buscarControl, claveMensaje } from "../midi/controlesMidi";

// --- Contexto "ligero": lo usan los controles del mezclador/paneles para
// registrarse como objetivo de un control MIDI. Su valor NUNCA cambia de
// identidad, así que suscribirse a él no provoca renders de más aunque el
// usuario mueva un fader 30 veces por segundo (la respuesta táctil se
// resuelve llamando directamente al callback, sin pasar por estado de React).
const MidiRegistroContext = createContext({ registrarControl: () => () => {} });

// --- Contexto "rico": estado de dispositivos, perfiles y modo de
// aprendizaje. Lo usa el panel de gestión de mapeos (Configuración).
const MidiContext = createContext(null);

const SOPORTADO = typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;

function clasificarMensaje(data) {
  const status = data[0];
  const nibble = status & 0xf0;
  const canal = status & 0x0f;
  if (nibble === 0x90) {
    // Note On (velocidad 0 equivale a Note Off en muchos controladores).
    return data[2] > 0
      ? { tipo: "note", canal, dato1: data[1], dato2: data[2] }
      : { tipo: "noteoff", canal, dato1: data[1], dato2: 0 };
  }
  if (nibble === 0x80) return { tipo: "noteoff", canal, dato1: data[1], dato2: 0 };
  if (nibble === 0xb0) return { tipo: "cc", canal, dato1: data[1], dato2: data[2] };
  if (nibble === 0xe0) {
    // Pitch bend: 14 bits (jog wheels / faders motorizados de algunos controladores).
    return { tipo: "pitchbend", canal, dato1: 0, dato2: (data[2] << 7) | data[1] };
  }
  return null;
}

function normalizar(msg) {
  if (msg.tipo === "pitchbend") return msg.dato2 / 16383;
  return msg.dato2 / 127; // cc o note
}

export function MidiProvider({ children }) {
  const { usuario } = useAuth();

  // ---------- Registro de controles (parte "ligera") ----------
  const registroRef = useRef(new Map()); // controlId -> callback

  const registrarControl = useCallback((controlId, callback) => {
    registroRef.current.set(controlId, callback);
    return () => {
      if (registroRef.current.get(controlId) === callback) {
        registroRef.current.delete(controlId);
      }
    };
  }, []);

  const registroApi = useMemo(() => ({ registrarControl }), [registrarControl]);

  // ---------- Estado "rico" (dispositivos, perfiles, aprendizaje) ----------
  const [soportado] = useState(SOPORTADO);
  const [accesoListo, setAccesoListo] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState("");
  const [dispositivos, setDispositivos] = useState([]); // [{id, nombre, fabricante, estado}]
  const [modoAprendizaje, setModoAprendizaje] = useState(null); // controlId en espera, o null
  const [ultimaSenal, setUltimaSenal] = useState(null); // { ts, tipo, canal, dato1 } (throttled)

  const [perfiles, setPerfiles] = useState([]);
  const [perfilActivoId, setPerfilActivoId] = useState(null);
  const [mapeoActual, setMapeoActual] = useState([]); // [{controlId, mensajeTipo, canal, dato1, invertido}]
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);

  const accesoRef = useRef(null);
  const mapeoActualRef = useRef(mapeoActual);
  mapeoActualRef.current = mapeoActual;
  const modoAprendizajeRef = useRef(modoAprendizaje);
  modoAprendizajeRef.current = modoAprendizaje;
  const timeoutAprendizajeRef = useRef(null);
  const ultimaSenalTsRef = useRef(0);

  // ---------- Carga de perfiles desde el backend (por usuario) ----------
  const cargarPerfiles = useCallback(async () => {
    if (!usuario) return;
    setCargandoPerfiles(true);
    try {
      const lista = await api.midiMapeos();
      setPerfiles(lista);
      const activo = lista.find((p) => p.activo) || lista[0] || null;
      setPerfilActivoId(activo?.id ?? null);
      setMapeoActual(activo?.mapeo ?? []);
    } catch {
      /* sin conexión o sin sesión: se puede reintentar más tarde */
    } finally {
      setCargandoPerfiles(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) cargarPerfiles();
    else {
      setPerfiles([]);
      setPerfilActivoId(null);
      setMapeoActual([]);
    }
  }, [usuario, cargarPerfiles]);

  // ---------- Aplicar un mensaje MIDI entrante ----------
  const aplicarMensaje = useCallback((msg) => {
    // Throttle de la señal visible en la UI (~15 actualizaciones/seg como máximo).
    const ahora = performance.now();
    if (ahora - ultimaSenalTsRef.current > 65) {
      ultimaSenalTsRef.current = ahora;
      setUltimaSenal({ ts: Date.now(), ...msg });
    }

    // Modo aprendizaje: la próxima señal válida se asigna al control en espera.
    const enEspera = modoAprendizajeRef.current;
    if (enEspera) {
      const entrada = {
        controlId: enEspera,
        mensajeTipo: msg.tipo,
        canal: msg.canal,
        dato1: msg.dato1,
        invertido: false,
      };
      setMapeoActual((prev) => {
        const clave = claveMensaje(msg);
        const limpio = prev.filter(
          (a) => a.controlId !== enEspera && claveMensaje(a) !== clave
        );
        return [...limpio, entrada];
      });
      setModoAprendizaje(null);
      clearTimeout(timeoutAprendizajeRef.current);
      return;
    }

    // Enrutamiento normal: buscar si esta señal está asignada a algún control.
    const clave = claveMensaje(msg);
    const asignacion = mapeoActualRef.current.find((a) => claveMensaje(a) === clave);
    if (!asignacion) return;

    const control = buscarControl(asignacion.controlId);
    if (!control) return;
    const callback = registroRef.current.get(asignacion.controlId);
    if (!callback) return;

    if (control.tipo === "absoluto") {
      let valor = normalizar(msg);
      if (asignacion.invertido) valor = 1 - valor;
      callback(valor);
    } else {
      // "trigger" y "toggle": disparan solo al presionar (dato2 > 0), nunca al soltar.
      if (msg.dato2 > 0) callback();
    }
  }, []);

  // ---------- Web MIDI: acceso, dispositivos y escucha ----------
  useEffect(() => {
    if (!soportado) return;
    let activo = true;

    function refrescarDispositivos(acceso) {
      const lista = [];
      for (const input of acceso.inputs.values()) {
        lista.push({
          id: input.id,
          nombre: input.name || "Controlador MIDI",
          fabricante: input.manufacturer || "",
          estado: input.state,
        });
      }
      if (activo) setDispositivos(lista);
    }

    function onMidiMessage(evento) {
      const msg = clasificarMensaje(evento.data);
      if (msg) aplicarMensaje(msg);
    }

    function conectarEntradas(acceso) {
      for (const input of acceso.inputs.values()) {
        input.onmidimessage = onMidiMessage;
      }
    }

    navigator
      .requestMIDIAccess({ sysex: false })
      .then((acceso) => {
        if (!activo) return;
        accesoRef.current = acceso;
        setAccesoListo(true);
        refrescarDispositivos(acceso);
        conectarEntradas(acceso);
        acceso.onstatechange = () => {
          refrescarDispositivos(acceso);
          conectarEntradas(acceso);
        };
      })
      .catch(() => {
        if (activo) setErrorAcceso("No se pudo acceder a los dispositivos MIDI del sistema.");
      });

    return () => {
      activo = false;
      const acceso = accesoRef.current;
      if (acceso) {
        for (const input of acceso.inputs.values()) input.onmidimessage = null;
        acceso.onstatechange = null;
      }
    };
  }, [soportado, aplicarMensaje]);

  // ---------- Persistencia del perfil activo ----------
  const guardarMapeo = useCallback(
    async (nuevoMapeo) => {
      setMapeoActual(nuevoMapeo);
      if (perfilActivoId) {
        try {
          await api.actualizarMidiMapeo(perfilActivoId, { mapeo: nuevoMapeo });
          setPerfiles((prev) =>
            prev.map((p) => (p.id === perfilActivoId ? { ...p, mapeo: nuevoMapeo } : p))
          );
        } catch {
          /* si falla el guardado remoto, el mapeo sigue activo en esta sesión */
        }
        return;
      }
      // Sin perfil aún: se crea uno por defecto para poder guardar la asignación.
      try {
        const creado = await api.crearMidiMapeo({
          nombre: "Mi controlador",
          mapeo: nuevoMapeo,
          activo: true,
        });
        setPerfiles((prev) => [creado, ...prev]);
        setPerfilActivoId(creado.id);
      } catch {
        /* noop: el mapeo queda en memoria para esta sesión */
      }
    },
    [perfilActivoId]
  );

  // Cuando el modo aprendizaje captura una señal, mapeoActual cambia vía
  // setMapeoActual directo (para respuesta inmediata en la UI); este efecto
  // se encarga de persistirlo en el backend.
  const mapeoPersistidoRef = useRef(mapeoActual);
  useEffect(() => {
    if (mapeoActual === mapeoPersistidoRef.current) return;
    mapeoPersistidoRef.current = mapeoActual;
    guardarMapeo(mapeoActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapeoActual]);

  // ---------- Acciones de aprendizaje ----------
  const iniciarAprendizaje = useCallback((controlId) => {
    setModoAprendizaje(controlId);
    clearTimeout(timeoutAprendizajeRef.current);
    timeoutAprendizajeRef.current = setTimeout(() => {
      setModoAprendizaje((actual) => (actual === controlId ? null : actual));
    }, 9000);
  }, []);

  const cancelarAprendizaje = useCallback(() => {
    clearTimeout(timeoutAprendizajeRef.current);
    setModoAprendizaje(null);
  }, []);

  const quitarAsignacion = useCallback((controlId) => {
    setMapeoActual((prev) => prev.filter((a) => a.controlId !== controlId));
  }, []);

  const invertirAsignacion = useCallback((controlId) => {
    setMapeoActual((prev) =>
      prev.map((a) => (a.controlId === controlId ? { ...a, invertido: !a.invertido } : a))
    );
  }, []);

  const limpiarMapeo = useCallback(() => setMapeoActual([]), []);

  // ---------- Gestión de perfiles ----------
  const crearPerfil = useCallback(async (nombre, dispositivo) => {
    const creado = await api.crearMidiMapeo({
      nombre: nombre?.trim() || "Nuevo perfil",
      dispositivo,
      mapeo: [],
      activo: true,
    });
    setPerfiles((prev) => [creado, ...prev.map((p) => ({ ...p, activo: false }))]);
    setPerfilActivoId(creado.id);
    mapeoPersistidoRef.current = [];
    setMapeoActual([]);
    return creado;
  }, []);

  const seleccionarPerfil = useCallback(
    async (id) => {
      const perfil = perfiles.find((p) => p.id === id);
      if (!perfil) return;
      mapeoPersistidoRef.current = perfil.mapeo;
      setPerfilActivoId(id);
      setMapeoActual(perfil.mapeo);
      setPerfiles((prev) => prev.map((p) => ({ ...p, activo: p.id === id })));
      try {
        await api.activarMidiMapeo(id);
      } catch {
        /* noop */
      }
    },
    [perfiles]
  );

  const renombrarPerfil = useCallback(async (id, nombre) => {
    const actualizado = await api.actualizarMidiMapeo(id, { nombre });
    setPerfiles((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
  }, []);

  const eliminarPerfil = useCallback(
    async (id) => {
      await api.eliminarMidiMapeo(id);
      setPerfiles((prev) => {
        const restantes = prev.filter((p) => p.id !== id);
        if (perfilActivoId === id) {
          const siguiente = restantes[0] || null;
          mapeoPersistidoRef.current = siguiente?.mapeo ?? [];
          setPerfilActivoId(siguiente?.id ?? null);
          setMapeoActual(siguiente?.mapeo ?? []);
        }
        return restantes;
      });
    },
    [perfilActivoId]
  );

  // ---------- Exportar / importar (archivo tipo perfil, formato propio) ----------
  const exportarPerfil = useCallback(() => {
    const perfil = perfiles.find((p) => p.id === perfilActivoId);
    const datos = {
      formato: "panel-radio-online-midimap",
      version: 1,
      nombre: perfil?.nombre || "Mi controlador",
      dispositivo: perfil?.dispositivo || "",
      mapeo: mapeoActual,
    };
    return JSON.stringify(datos, null, 2);
  }, [perfiles, perfilActivoId, mapeoActual]);

  const importarPerfil = useCallback(async (texto) => {
    const datos = JSON.parse(texto);
    if (!Array.isArray(datos.mapeo)) throw new Error("Archivo de mapeo inválido.");
    const creado = await api.crearMidiMapeo({
      nombre: datos.nombre || "Perfil importado",
      dispositivo: datos.dispositivo,
      mapeo: datos.mapeo,
      activo: true,
    });
    setPerfiles((prev) => [creado, ...prev.map((p) => ({ ...p, activo: false }))]);
    setPerfilActivoId(creado.id);
    mapeoPersistidoRef.current = creado.mapeo;
    setMapeoActual(creado.mapeo);
    return creado;
  }, []);

  const value = useMemo(
    () => ({
      soportado,
      accesoListo,
      errorAcceso,
      dispositivos,
      modoAprendizaje,
      ultimaSenal,
      iniciarAprendizaje,
      cancelarAprendizaje,
      quitarAsignacion,
      invertirAsignacion,
      limpiarMapeo,
      mapeoActual,
      perfiles,
      perfilActivoId,
      cargandoPerfiles,
      crearPerfil,
      seleccionarPerfil,
      renombrarPerfil,
      eliminarPerfil,
      exportarPerfil,
      importarPerfil,
      recargarPerfiles: cargarPerfiles,
    }),
    [
      soportado,
      accesoListo,
      errorAcceso,
      dispositivos,
      modoAprendizaje,
      ultimaSenal,
      iniciarAprendizaje,
      cancelarAprendizaje,
      quitarAsignacion,
      invertirAsignacion,
      limpiarMapeo,
      mapeoActual,
      perfiles,
      perfilActivoId,
      cargandoPerfiles,
      crearPerfil,
      seleccionarPerfil,
      renombrarPerfil,
      eliminarPerfil,
      exportarPerfil,
      importarPerfil,
      cargarPerfiles,
    ]
  );

  return (
    <MidiRegistroContext.Provider value={registroApi}>
      <MidiContext.Provider value={value}>{children}</MidiContext.Provider>
    </MidiRegistroContext.Provider>
  );
}

// Hook "rico": usado por el panel de gestión de mapeos.
export function useMidi() {
  const ctx = useContext(MidiContext);
  if (!ctx) throw new Error("useMidi debe usarse dentro de MidiProvider");
  return ctx;
}

// Hook ligero: cualquier control del panel lo usa para "enchufarse" al
// sistema de mapeo MIDI sin preocuparse de perfiles ni de la Web MIDI API.
// - controlId: uno de los ids definidos en src/midi/controlesMidi.js
// - callback: función a invocar cuando llega la señal mapeada
//   - controles "absoluto": recibe un valor normalizado 0..1
//   - controles "trigger"/"toggle": se invoca sin argumentos
export function useMidiTarget(controlId, callback) {
  const { registrarControl } = useContext(MidiRegistroContext);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return registrarControl(controlId, (...args) => callbackRef.current?.(...args));
  }, [registrarControl, controlId]);
}
