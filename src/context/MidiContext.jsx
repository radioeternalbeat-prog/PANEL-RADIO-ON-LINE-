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
import { CONTROLES_MIDI, buscarControl, claveMensaje } from "../midi/controlesMidi";

// --- Contexto "ligero": lo usan los controles de cualquier panel para
// registrarse como objetivo de un control MIDI. Su valor NUNCA cambia de
// identidad, así que suscribirse a él no provoca renders de más aunque el
// usuario mueva un fader 30 veces por segundo (la respuesta táctil se
// resuelve llamando directamente al callback, sin pasar por estado de React).
//
// Soporta MÚLTIPLES suscriptores por control (Set de callbacks): así, un
// control "global" (navegación, pánico, tema) puede ser escuchado a la vez
// por varios componentes montados (ej. el Reproductor y el Soundboard
// reaccionan ambos a "Pánico"), y cada panel se registra/desregistra solo,
// sin pisar el registro de otro.
const MidiRegistroContext = createContext({
  registrarControl: () => () => {},
  registrarEtiqueta: () => () => {},
});

// --- Contexto "rico": estado de dispositivos, perfiles, aprendizaje,
// asistente guiado y monitor en vivo. Lo usa el panel de gestión de mapeos.
const MidiContext = createContext(null);

const SOPORTADO = typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;

// Sensibilidad base para encoders relativos (sin tope): a sensibilidad 1,
// cada "tick" de magnitud 1 mueve ~0.8% el valor virtual (~125 ticks para
// recorrer todo el rango). El usuario puede multiplicarla x0.25 .. x4.
const PASO_BASE_RELATIVO = 0.008;
const NIVELES_SENSIBILIDAD = [0.25, 0.5, 1, 2, 4];

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

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

function normalizarAbsoluto(msg) {
  if (msg.tipo === "pitchbend") return msg.dato2 / 16383;
  return msg.dato2 / 127; // cc o note
}

// Interpreta un valor de encoder relativo en formato "2's complement" (el más
// común en controladores DJ/MIDI: Traktor, Ableton, DDJ, etc.): valores
// 1..63 giran "hacia adelante" con esa magnitud, 65..127 giran "hacia atrás".
function deltaRelativo(dato2) {
  if (!dato2) return 0;
  if (dato2 < 64) return dato2;
  return -(128 - dato2);
}

export function MidiProvider({ children }) {
  const { usuario } = useAuth();

  // ---------- Registro de controles (parte "ligera", multi-suscriptor) ----------
  const registroRef = useRef(new Map()); // controlId -> Set<callback>

  const registrarControl = useCallback((controlId, callback) => {
    let set = registroRef.current.get(controlId);
    if (!set) {
      set = new Set();
      registroRef.current.set(controlId, set);
    }
    set.add(callback);
    return () => {
      set.delete(callback);
      if (set.size === 0) registroRef.current.delete(controlId);
    };
  }, []);

  // ---------- Etiquetas dinámicas (nombres reales para controles como los
  // pads del Soundboard: "Aplausos" en vez de "Pad 3"). Los componentes que
  // conocen el nombre real lo registran vía useMidiEtiqueta; el panel de
  // mapeo lo consulta con obtenerEtiqueta() para mostrarlo en vez del
  // nombre genérico del catálogo.
  const [etiquetas, setEtiquetas] = useState({}); // controlId -> texto
  const registrarEtiqueta = useCallback((controlId, texto) => {
    setEtiquetas((prev) => {
      if (texto) {
        if (prev[controlId] === texto) return prev;
        return { ...prev, [controlId]: texto };
      }
      if (!(controlId in prev)) return prev;
      const copia = { ...prev };
      delete copia[controlId];
      return copia;
    });
    return () => {
      setEtiquetas((prev) => {
        if (!(controlId in prev)) return prev;
        const copia = { ...prev };
        delete copia[controlId];
        return copia;
      });
    };
  }, []);
  const obtenerEtiqueta = useCallback((controlId) => etiquetas[controlId] || null, [etiquetas]);

  const registroApi = useMemo(
    () => ({ registrarControl, registrarEtiqueta }),
    [registrarControl, registrarEtiqueta]
  );

  // ---------- Estado "rico" (dispositivos, perfiles, aprendizaje) ----------
  const [soportado] = useState(SOPORTADO);
  const [accesoListo, setAccesoListo] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState("");
  const [dispositivos, setDispositivos] = useState([]); // [{id, nombre, fabricante, estado}]
  const [modoAprendizaje, setModoAprendizaje] = useState(null); // controlId en espera, o null
  const [ultimaSenal, setUltimaSenal] = useState(null); // { ts, tipo, canal, dato1 } (throttled, para UI en vivo)
  const [logSenales, setLogSenales] = useState([]); // últimas señales crudas (monitor en vivo)

  const [perfiles, setPerfiles] = useState([]);
  const [perfilActivoId, setPerfilActivoId] = useState(null);
  const [mapeoActual, setMapeoActual] = useState([]); // [{controlId, mensajeTipo, canal, dato1, invertido, relativo, sensibilidad}]
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);

  // Plug-and-play: sugerencia de perfil cuando se detecta un dispositivo
  // nuevo sin perfil asociado, y aviso cuando se activa uno automáticamente.
  const [sugerenciaDispositivo, setSugerenciaDispositivo] = useState(null); // { nombre }
  const [avisoConexion, setAvisoConexion] = useState(null); // { nombre, perfilActivado }

  // Asistente de mapeo guiado: recorre los controles pendientes uno por uno.
  const [asistenteActivo, setAsistenteActivo] = useState(false);
  const [asistenteControlActual, setAsistenteControlActual] = useState(null);
  const [asistenteRestantes, setAsistenteRestantes] = useState(0);

  const accesoRef = useRef(null);
  const mapeoActualRef = useRef(mapeoActual);
  mapeoActualRef.current = mapeoActual;
  const modoAprendizajeRef = useRef(modoAprendizaje);
  modoAprendizajeRef.current = modoAprendizaje;
  const timeoutAprendizajeRef = useRef(null);
  const ultimaSenalTsRef = useRef(0);
  const valoresRelativosRef = useRef(new Map()); // controlId -> valor virtual 0..1
  const dispositivosVistosRef = useRef(new Set()); // nombres ya notificados en esta sesión
  const perfilesRef = useRef(perfiles);
  perfilesRef.current = perfiles;

  const asistenteActivoRef = useRef(false);
  const asistenteListaRef = useRef([]);
  const asistenteIdxRef = useRef(0);

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

  // ---------- Avance del asistente guiado ----------
  const avanzarAsistente = useCallback(() => {
    if (!asistenteActivoRef.current) return;
    const lista = asistenteListaRef.current;
    let idx = asistenteIdxRef.current + 1;
    // Saltar controles que ya quedaron asignados por otro medio mientras tanto.
    while (idx < lista.length && mapeoActualRef.current.some((a) => a.controlId === lista[idx])) {
      idx++;
    }
    if (idx >= lista.length) {
      asistenteActivoRef.current = false;
      setAsistenteActivo(false);
      setAsistenteControlActual(null);
      setAsistenteRestantes(0);
      return;
    }
    asistenteIdxRef.current = idx;
    setAsistenteControlActual(lista[idx]);
    setAsistenteRestantes(lista.length - idx - 1);
    iniciarAprendizajeInterno(lista[idx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const avanzarAsistenteRef = useRef(avanzarAsistente);
  avanzarAsistenteRef.current = avanzarAsistente;

  // ---------- Aplicar un mensaje MIDI entrante ----------
  const aplicarMensaje = useCallback((msg) => {
    // Log crudo para el monitor en vivo (acotado a las últimas 8 señales).
    setLogSenales((prev) => [{ ts: Date.now(), ...msg }, ...prev].slice(0, 8));

    // Señal visible "resumida" con throttle (~15 actualizaciones/seg como máximo).
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
        relativo: false,
        sensibilidad: 1,
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
      if (asistenteActivoRef.current) {
        setTimeout(() => avanzarAsistenteRef.current?.(), 300);
      }
      return;
    }

    // Enrutamiento normal: buscar si esta señal está asignada a algún control.
    const clave = claveMensaje(msg);
    const asignacion = mapeoActualRef.current.find((a) => claveMensaje(a) === clave);
    if (!asignacion) return;

    const control = buscarControl(asignacion.controlId);
    if (!control) return;
    const callbacks = registroRef.current.get(asignacion.controlId);
    if (!callbacks || callbacks.size === 0) return;

    if (control.tipo === "absoluto") {
      let valor;
      if (asignacion.relativo) {
        const signed = deltaRelativo(msg.dato2) * (asignacion.invertido ? -1 : 1);
        const actual = valoresRelativosRef.current.has(asignacion.controlId)
          ? valoresRelativosRef.current.get(asignacion.controlId)
          : 0.5;
        valor = clamp01(actual + signed * PASO_BASE_RELATIVO * (asignacion.sensibilidad || 1));
        valoresRelativosRef.current.set(asignacion.controlId, valor);
      } else {
        valor = normalizarAbsoluto(msg);
        if (asignacion.invertido) valor = 1 - valor;
      }
      for (const cb of callbacks) cb(valor);
    } else {
      // "trigger" y "toggle": disparan solo al presionar (dato2 > 0), nunca al soltar.
      if (msg.dato2 > 0) for (const cb of callbacks) cb();
    }
  }, []);

  // ---------- Web MIDI: acceso, dispositivos, escucha y plug-and-play ----------
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
      return lista;
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

    // Cuando se conecta un dispositivo nuevo: si ya existe un perfil guardado
    // para ese nombre, lo activa solo; si no, sugiere crear uno (una sola vez
    // por dispositivo en esta sesión, para no ser insistente).
    function manejarConexion(nombre) {
      if (dispositivosVistosRef.current.has(nombre)) return;
      dispositivosVistosRef.current.add(nombre);
      const existente = perfilesRef.current.find((p) => p.dispositivo === nombre);
      if (existente) {
        if (!existente.activo) {
          seleccionarPerfilRef.current?.(existente.id);
        }
        setAvisoConexion({ nombre, perfilActivado: true });
      } else if (usuario) {
        setSugerenciaDispositivo({ nombre });
      }
    }

    navigator
      .requestMIDIAccess({ sysex: false })
      .then((acceso) => {
        if (!activo) return;
        accesoRef.current = acceso;
        setAccesoListo(true);
        const inicial = refrescarDispositivos(acceso);
        conectarEntradas(acceso);
        for (const d of inicial) manejarConexion(d.nombre);
        acceso.onstatechange = (e) => {
          const lista = refrescarDispositivos(acceso);
          conectarEntradas(acceso);
          if (e?.port?.type === "input" && e.port.state === "connected") {
            manejarConexion(e.port.name || "Controlador MIDI");
          }
          void lista;
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
  }, [soportado, aplicarMensaje, usuario]);

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
  function iniciarAprendizajeInterno(controlId) {
    setModoAprendizaje(controlId);
    clearTimeout(timeoutAprendizajeRef.current);
    timeoutAprendizajeRef.current = setTimeout(() => {
      setModoAprendizaje((actual) => (actual === controlId ? null : actual));
      // Si el asistente estaba esperando este control y nadie lo movió,
      // se detiene para no dejarlo "escuchando" indefinidamente.
      if (asistenteActivoRef.current && asistenteControlActualRef.current === controlId) {
        asistenteActivoRef.current = false;
        setAsistenteActivo(false);
        setAsistenteControlActual(null);
        setAsistenteRestantes(0);
      }
    }, 9000);
  }
  const asistenteControlActualRef = useRef(asistenteControlActual);
  asistenteControlActualRef.current = asistenteControlActual;

  const iniciarAprendizaje = useCallback((controlId) => {
    iniciarAprendizajeInterno(controlId);
  }, []);

  const cancelarAprendizaje = useCallback(() => {
    clearTimeout(timeoutAprendizajeRef.current);
    setModoAprendizaje(null);
  }, []);

  const quitarAsignacion = useCallback((controlId) => {
    valoresRelativosRef.current.delete(controlId);
    setMapeoActual((prev) => prev.filter((a) => a.controlId !== controlId));
  }, []);

  const invertirAsignacion = useCallback((controlId) => {
    setMapeoActual((prev) =>
      prev.map((a) => (a.controlId === controlId ? { ...a, invertido: !a.invertido } : a))
    );
  }, []);

  const alternarRelativo = useCallback((controlId) => {
    valoresRelativosRef.current.delete(controlId);
    setMapeoActual((prev) =>
      prev.map((a) =>
        a.controlId === controlId ? { ...a, relativo: !a.relativo, sensibilidad: a.sensibilidad || 1 } : a
      )
    );
  }, []);

  const ciclarSensibilidad = useCallback((controlId) => {
    setMapeoActual((prev) =>
      prev.map((a) => {
        if (a.controlId !== controlId) return a;
        const idx = NIVELES_SENSIBILIDAD.indexOf(a.sensibilidad || 1);
        const siguiente = NIVELES_SENSIBILIDAD[(idx + 1) % NIVELES_SENSIBILIDAD.length];
        return { ...a, sensibilidad: siguiente };
      })
    );
  }, []);

  const limpiarMapeo = useCallback(() => {
    valoresRelativosRef.current.clear();
    setMapeoActual([]);
  }, []);

  // ---------- Asistente de mapeo guiado ----------
  const iniciarAsistente = useCallback(() => {
    const pendientes = CONTROLES_MIDI.map((c) => c.id).filter(
      (id) => !mapeoActualRef.current.some((a) => a.controlId === id)
    );
    if (!pendientes.length) return false;
    asistenteListaRef.current = pendientes;
    asistenteIdxRef.current = 0;
    asistenteActivoRef.current = true;
    setAsistenteActivo(true);
    setAsistenteControlActual(pendientes[0]);
    setAsistenteRestantes(pendientes.length - 1);
    iniciarAprendizajeInterno(pendientes[0]);
    return true;
  }, []);

  const saltarAsistente = useCallback(() => {
    clearTimeout(timeoutAprendizajeRef.current);
    setModoAprendizaje(null);
    avanzarAsistenteRef.current?.();
  }, []);

  const detenerAsistente = useCallback(() => {
    asistenteActivoRef.current = false;
    setAsistenteActivo(false);
    setAsistenteControlActual(null);
    setAsistenteRestantes(0);
    clearTimeout(timeoutAprendizajeRef.current);
    setModoAprendizaje(null);
  }, []);

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
    valoresRelativosRef.current.clear();
    setMapeoActual([]);
    return creado;
  }, []);

  const seleccionarPerfil = useCallback(
    async (id) => {
      const perfil = perfilesRef.current.find((p) => p.id === id);
      if (!perfil) return;
      mapeoPersistidoRef.current = perfil.mapeo;
      valoresRelativosRef.current.clear();
      setPerfilActivoId(id);
      setMapeoActual(perfil.mapeo);
      setPerfiles((prev) => prev.map((p) => ({ ...p, activo: p.id === id })));
      try {
        await api.activarMidiMapeo(id);
      } catch {
        /* noop */
      }
    },
    []
  );
  const seleccionarPerfilRef = useRef(seleccionarPerfil);
  seleccionarPerfilRef.current = seleccionarPerfil;

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

  // ---------- Plug-and-play: sugerencia de dispositivo nuevo ----------
  const crearPerfilParaSugerencia = useCallback(async () => {
    if (!sugerenciaDispositivo) return;
    const { nombre } = sugerenciaDispositivo;
    setSugerenciaDispositivo(null);
    try {
      await crearPerfil(nombre, nombre);
      setAvisoConexion({ nombre, perfilActivado: true, nuevo: true });
    } catch {
      alert("No se pudo crear el perfil automáticamente. Puedes crearlo manualmente abajo.");
    }
  }, [sugerenciaDispositivo, crearPerfil]);

  const descartarSugerencia = useCallback(() => setSugerenciaDispositivo(null), []);
  const descartarAvisoConexion = useCallback(() => setAvisoConexion(null), []);

  // ---------- Exportar / importar (archivo tipo perfil, formato propio) ----------
  const exportarPerfil = useCallback(() => {
    const perfil = perfilesRef.current.find((p) => p.id === perfilActivoId);
    const datos = {
      formato: "panel-radio-online-midimap",
      version: 2,
      nombre: perfil?.nombre || "Mi controlador",
      dispositivo: perfil?.dispositivo || "",
      mapeo: mapeoActual,
    };
    return JSON.stringify(datos, null, 2);
  }, [perfilActivoId, mapeoActual]);

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
    valoresRelativosRef.current.clear();
    setMapeoActual(creado.mapeo);
    return creado;
  }, []);

  const totalControles = CONTROLES_MIDI.length;

  const value = useMemo(
    () => ({
      soportado,
      accesoListo,
      errorAcceso,
      dispositivos,
      modoAprendizaje,
      ultimaSenal,
      logSenales,
      iniciarAprendizaje,
      cancelarAprendizaje,
      quitarAsignacion,
      invertirAsignacion,
      alternarRelativo,
      ciclarSensibilidad,
      nivelesSensibilidad: NIVELES_SENSIBILIDAD,
      limpiarMapeo,
      mapeoActual,
      totalControles,
      obtenerEtiqueta,
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
      // plug-and-play
      sugerenciaDispositivo,
      crearPerfilParaSugerencia,
      descartarSugerencia,
      avisoConexion,
      descartarAvisoConexion,
      // asistente guiado
      asistenteActivo,
      asistenteControlActual,
      asistenteRestantes,
      iniciarAsistente,
      saltarAsistente,
      detenerAsistente,
    }),
    [
      soportado,
      accesoListo,
      errorAcceso,
      dispositivos,
      modoAprendizaje,
      ultimaSenal,
      logSenales,
      iniciarAprendizaje,
      cancelarAprendizaje,
      quitarAsignacion,
      invertirAsignacion,
      alternarRelativo,
      ciclarSensibilidad,
      limpiarMapeo,
      mapeoActual,
      totalControles,
      obtenerEtiqueta,
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
      sugerenciaDispositivo,
      crearPerfilParaSugerencia,
      descartarSugerencia,
      avisoConexion,
      descartarAvisoConexion,
      asistenteActivo,
      asistenteControlActual,
      asistenteRestantes,
      iniciarAsistente,
      saltarAsistente,
      detenerAsistente,
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
// Se puede llamar desde varios componentes montados a la vez con el mismo
// controlId (ej. "global.panico"): todos reciben la señal.
export function useMidiTarget(controlId, callback) {
  const { registrarControl } = useContext(MidiRegistroContext);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return registrarControl(controlId, (...args) => callbackRef.current?.(...args));
  }, [registrarControl, controlId]);
}

// Hook ligero complementario: permite que un componente "anuncie" el nombre
// real de un control dinámico (ej. el sample cargado en el pad 3 del
// Soundboard) para que el panel de mapeo lo muestre en vez de la etiqueta
// genérica del catálogo ("Aplausos" en vez de "Pad 3"). Se limpia solo al
// desmontar o cuando el texto cambia a vacío/null.
export function useMidiEtiqueta(controlId, texto) {
  const { registrarEtiqueta } = useContext(MidiRegistroContext);
  useEffect(() => {
    return registrarEtiqueta(controlId, texto);
  }, [registrarEtiqueta, controlId, texto]);
}
