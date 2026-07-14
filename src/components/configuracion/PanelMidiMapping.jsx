import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  FlipHorizontal2,
  Pencil,
  Piano,
  Plus,
  Radio,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMidi } from "../../context/MidiContext";
import { controlesAgrupados } from "../../midi/controlesMidi";

const GRUPOS = controlesAgrupados();

function etiquetaMensaje({ mensajeTipo, canal, dato1 }) {
  const nombresTipo = { cc: "CC", note: "Nota", pitchbend: "Pitch bend" };
  const base = nombresTipo[mensajeTipo] || mensajeTipo;
  return mensajeTipo === "pitchbend"
    ? `${base} · canal ${canal + 1}`
    : `${base} ${dato1} · canal ${canal + 1}`;
}

function Fila({ control }) {
  const { mapeoActual, modoAprendizaje, iniciarAprendizaje, cancelarAprendizaje, quitarAsignacion, invertirAsignacion } =
    useMidi();

  const asignacion = mapeoActual.find((a) => a.controlId === control.id);
  const aprendiendo = modoAprendizaje === control.id;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        aprendiendo
          ? "border-brand-500 bg-brand-500/10"
          : asignacion
          ? "border-line bg-surface2"
          : "border-line bg-surface"
      }`}
    >
      <div className="min-w-[180px] flex-1">
        <p className="text-sm font-medium text-fg">{control.etiqueta}</p>
        {asignacion ? (
          <p className="text-[11px] text-muted">
            {etiquetaMensaje(asignacion)}
            {asignacion.invertido && " · invertido"}
          </p>
        ) : (
          <p className="text-[11px] text-muted">Sin asignar</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {control.tipo === "absoluto" && asignacion && (
          <button
            onClick={() => invertirAsignacion(control.id)}
            title="Invertir rango (útil si el fader queda al revés)"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              asignacion.invertido
                ? "border-brand-500 bg-brand-500/15 text-brand-500"
                : "border-line bg-surface text-muted hover:text-fg"
            }`}
          >
            <FlipHorizontal2 size={14} />
          </button>
        )}
        {asignacion && (
          <button
            onClick={() => quitarAsignacion(control.id)}
            title="Quitar asignación"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-red-500/50 hover:text-red-500"
          >
            <X size={14} />
          </button>
        )}
        {aprendiendo ? (
          <button
            onClick={cancelarAprendizaje}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Escuchando…
          </button>
        ) : (
          <button
            onClick={() => iniciarAprendizaje(control.id)}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            {asignacion ? "Reasignar" : "Asignar"}
          </button>
        )}
      </div>
    </div>
  );
}

function Grupo({ grupo, controles, contarAsignados }) {
  const [abierto, setAbierto] = useState(false);
  const asignados = contarAsignados(controles);

  return (
    <div className="rounded-xl border border-line">
      <button
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-fg">{grupo}</span>
        <span className="flex items-center gap-2">
          <span className="badge bg-surface2 text-muted">
            {asignados}/{controles.length} asignados
          </span>
          <ChevronDown
            size={16}
            className={`text-muted transition-transform ${abierto ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {abierto && (
        <div className="space-y-2 border-t border-line p-3">
          {controles.map((c) => (
            <Fila key={c.id} control={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PanelMidiMapping() {
  const {
    soportado,
    accesoListo,
    errorAcceso,
    dispositivos,
    ultimaSenal,
    mapeoActual,
    perfiles,
    perfilActivoId,
    cargandoPerfiles,
    crearPerfil,
    seleccionarPerfil,
    renombrarPerfil,
    eliminarPerfil,
    limpiarMapeo,
    exportarPerfil,
    importarPerfil,
  } = useMidi();

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const inputArchivo = useRef(null);

  const perfilActivo = perfiles.find((p) => p.id === perfilActivoId) || null;

  const contarAsignados = (controles) => {
    const ids = new Set(controles.map((c) => c.id));
    return mapeoActual.filter((a) => ids.has(a.controlId)).length;
  };

  async function onCrearPerfil() {
    const nombre = nombreNuevo.trim() || "Mi controlador";
    setNombreNuevo("");
    setCreando(false);
    try {
      await crearPerfil(nombre);
    } catch {
      alert("No se pudo crear el perfil. Revisa tu conexión con el servidor.");
    }
  }

  function onIniciarRenombrar() {
    if (!perfilActivo) return;
    setNombreEdicion(perfilActivo.nombre);
    setRenombrando(true);
  }

  async function onConfirmarRenombrar() {
    const nombre = nombreEdicion.trim();
    setRenombrando(false);
    if (!perfilActivo || !nombre || nombre === perfilActivo.nombre) return;
    try {
      await renombrarPerfil(perfilActivo.id, nombre);
    } catch {
      alert("No se pudo renombrar el perfil.");
    }
  }

  async function onEliminarPerfil() {
    if (!perfilActivo) return;
    if (!window.confirm(`¿Eliminar el perfil "${perfilActivo.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await eliminarPerfil(perfilActivo.id);
    } catch {
      alert("No se pudo eliminar el perfil.");
    }
  }

  function onExportar() {
    const json = exportarPerfil();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nombreArchivo = (perfilActivo?.nombre || "mapeo-midi").replace(/[^a-zA-Z0-9-_]/g, "_");
    a.href = url;
    a.download = `${nombreArchivo}.midimap.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportar(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      await importarPerfil(texto);
    } catch (err) {
      alert(err.message || "No se pudo importar el archivo. ¿Es un .midimap.json válido?");
    }
  }

  const totalAsignados = mapeoActual.length;
  const totalControles = useMemo(
    () => GRUPOS.reduce((n, g) => n + g.controles.length, 0),
    []
  );

  if (!soportado) {
    return (
      <div className="card p-5">
        <div className="mb-2 flex items-center gap-2 text-muted">
          <Piano size={18} className="text-brand-500" />
          <h2 className="font-semibold text-fg">Mapeo MIDI</h2>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Tu navegador no soporta Web MIDI. Usa Chrome, Edge u Opera en escritorio para conectar
            un controlador MIDI y crear tu propio mapeo de controles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted">
          <Piano size={18} className="text-brand-500" />
          <h2 className="font-semibold text-fg">Mapeo MIDI</h2>
        </div>
        <span className="badge bg-surface2 text-muted">
          {totalAsignados}/{totalControles} controles asignados
        </span>
      </div>

      {/* Dispositivos conectados */}
      <div className="mb-5 rounded-xl bg-surface2 p-3">
        {!accesoListo && !errorAcceso && (
          <p className="text-sm text-muted">Solicitando acceso a dispositivos MIDI…</p>
        )}
        {errorAcceso && (
          <p className="flex items-center gap-2 text-sm text-red-500">
            <AlertTriangle size={15} /> {errorAcceso}
          </p>
        )}
        {accesoListo && dispositivos.length === 0 && (
          <p className="text-sm text-muted">
            Ningún controlador MIDI conectado. Conecta el tuyo por USB (o Bluetooth MIDI) y
            aparecerá aquí automáticamente.
          </p>
        )}
        {accesoListo && dispositivos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {dispositivos.map((d) => (
              <span
                key={d.id}
                className="badge border border-line bg-surface text-fg"
                title={d.fabricante}
              >
                <Radio size={11} className="text-emerald-500" /> {d.nombre}
              </span>
            ))}
          </div>
        )}
        {/* Indicador de última señal recibida: feedback táctil inmediato */}
        {ultimaSenal && (
          <p className="mt-2 flex items-center gap-2 text-[11px] text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Última señal: {ultimaSenal.tipo === "cc" ? "CC" : ultimaSenal.tipo} {ultimaSenal.dato1}
            {" · "}canal {ultimaSenal.canal + 1}
          </p>
        )}
      </div>

      {/* Selector de perfiles */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {renombrando ? (
          <>
            <input
              autoFocus
              className="input max-w-[220px] py-1.5 text-sm"
              value={nombreEdicion}
              onChange={(e) => setNombreEdicion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onConfirmarRenombrar()}
            />
            <button onClick={onConfirmarRenombrar} className="btn-primary px-3 py-1.5 text-xs">
              Guardar
            </button>
            <button onClick={() => setRenombrando(false)} className="btn-ghost px-3 py-1.5 text-xs">
              Cancelar
            </button>
          </>
        ) : (
          <>
            <select
              className="input max-w-[220px] py-1.5 text-sm"
              value={perfilActivoId || ""}
              onChange={(e) => seleccionarPerfil(Number(e.target.value))}
              disabled={cargandoPerfiles || perfiles.length === 0}
            >
              {perfiles.length === 0 && <option value="">Sin perfiles todavía</option>}
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.dispositivo ? `· ${p.dispositivo}` : ""}
                </option>
              ))}
            </select>
            {perfilActivo && (
              <button
                onClick={onIniciarRenombrar}
                title="Renombrar perfil"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-fg"
              >
                <Pencil size={14} />
              </button>
            )}
          </>
        )}

        {creando ? (
          <>
            <input
              autoFocus
              className="input max-w-[180px] py-1.5 text-sm"
              placeholder="Nombre del perfil (ej. Mi DDJ-400)"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCrearPerfil()}
            />
            <button onClick={onCrearPerfil} className="btn-primary px-3 py-1.5 text-xs">
              Crear
            </button>
            <button onClick={() => setCreando(false)} className="btn-ghost px-3 py-1.5 text-xs">
              Cancelar
            </button>
          </>
        ) : (
          <button onClick={() => setCreando(true)} className="btn-ghost px-3 py-1.5 text-xs">
            <Plus size={14} /> Nuevo perfil
          </button>
        )}

        {perfilActivo && (
          <button
            onClick={onEliminarPerfil}
            className="btn-ghost px-3 py-1.5 text-xs hover:border-red-500/50 hover:text-red-500"
          >
            <Trash2 size={14} /> Eliminar
          </button>
        )}

        <div className="ml-auto flex gap-2">
          <input
            ref={inputArchivo}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportar}
          />
          <button onClick={() => inputArchivo.current?.click()} className="btn-ghost px-3 py-1.5 text-xs">
            <Upload size={14} /> Importar
          </button>
          <button
            onClick={onExportar}
            disabled={!perfilActivo}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {!perfilActivo ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-surface2 p-6 text-center text-muted">
          <Piano size={28} />
          <p className="text-sm">
            Crea un perfil para empezar a mapear tu controlador, o importa uno que ya tengas
            guardado.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Pulsa <strong className="text-fg">Asignar</strong> en el control que quieras mapear y
            luego mueve el knob, fader o botón de tu controlador MIDI. Se guarda al instante.
          </p>
          <div className="space-y-2">
            {GRUPOS.map(({ grupo, controles }) => (
              <Grupo key={grupo} grupo={grupo} controles={controles} contarAsignados={contarAsignados} />
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                if (window.confirm("¿Quitar todas las asignaciones de este perfil?")) limpiarMapeo();
              }}
              className="btn-ghost px-3 py-1.5 text-xs hover:border-red-500/50 hover:text-red-500"
            >
              <Trash2 size={14} /> Limpiar todo el mapeo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
