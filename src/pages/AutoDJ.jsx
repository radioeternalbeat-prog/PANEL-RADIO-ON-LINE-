import { useEffect, useRef, useState } from "react";
import {
  Apple,
  CalendarClock,
  Clock,
  ListMusic,
  Loader2,
  Megaphone,
  Music2,
  Music4,
  Pause,
  Pencil,
  Play,
  PlayCircle,
  Plus,
  Power,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { api } from "../api/client";
import { usePlayer } from "../context/PlayerContext";
import { useAutomatizacion } from "../context/AutomatizacionContext";
import BuscadorItunes from "../components/BuscadorItunes";
import ImportadorCanciones from "../components/ImportadorCanciones";
import ModalPlaylist from "../components/ModalPlaylist";
import ModalPrograma from "../components/ModalPrograma";
import { bloqueActivo, etiquetaDias } from "../utils/programacion";

const tabs = [
  { id: "biblioteca", label: "Biblioteca", icon: Music4 },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "programacion", label: "Programación", icon: CalendarClock },
];

function BadgeFuente({ fuente }) {
  const map = {
    itunes: { txt: "iTunes", cls: "bg-brand-500/15 text-brand-500" },
    xml: { txt: "Local", cls: "bg-accent-500/15 text-accent-500" },
    archivo: { txt: "Subido", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    manual: { txt: "Manual", cls: "bg-surface2 text-muted" },
  };
  const s = map[fuente] || map.manual;
  return <span className={`badge ${s.cls}`}>{s.txt}</span>;
}

export default function AutoDJ() {
  const [tab, setTab] = useState("biblioteca");
  const [busqueda, setBusqueda] = useState("");
  const [biblioteca, setBiblioteca] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [programacion, setProgramacion] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarItunes, setMostrarItunes] = useState(false);
  const [importandoXml, setImportandoXml] = useState(false);
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [aviso, setAviso] = useState("");
  const [playlistAbierta, setPlaylistAbierta] = useState(null);
  const [creandoPlaylist, setCreandoPlaylist] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [programaEditar, setProgramaEditar] = useState(null); // objeto, {} (nuevo) o null
  const [ahora, setAhora] = useState(new Date());
  const inputXml = useRef(null);
  const { reproducirPista, reproducirLista, encolar, medioActual, reproduciendo, alternar } = usePlayer();
  const {
    auto,
    activarAuto,
    desactivarAuto,
    inserciones,
    reproducirInsercion,
    toggleInsercionActiva,
    cambiarCadaMin,
    ultimaCuña,
    recargar: recargarAutomatizacion,
  } = useAutomatizacion();

  // Reevalúa el bloque al aire cada 30 s.
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const programaAlAire = bloqueActivo(programacion, ahora);

  function recargarProgramacion() {
    api.programacion().then(setProgramacion).catch(() => {});
    recargarAutomatizacion(); // mantiene el motor sincronizado con los cambios
  }

  async function eliminarPrograma(id, e) {
    e?.stopPropagation();
    if (!confirm("¿Eliminar este bloque de programación?")) return;
    try {
      await api.eliminarPrograma(id);
      setProgramacion((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setAviso(err.message || "No se pudo eliminar el bloque.");
    }
  }

  // Carga las canciones de la playlist del bloque en la cola y empieza a reproducir.
  async function emitirPlaylist(programa) {
    if (!programa?.playlistId) {
      setAviso("Este bloque no tiene una playlist asociada.");
      return;
    }
    try {
      const pistas = await api.pistasDePlaylist(programa.playlistId);
      if (!pistas.length) {
        setAviso(`La playlist «${programa.playlist}» está vacía.`);
        return;
      }
      reproducirLista(pistas, 0);
      setAviso(`Reproduciendo «${programa.playlist}» (${pistas.length} canciones).`);
    } catch (err) {
      setAviso(err.message || "No se pudo cargar la playlist.");
    }
  }

  async function cargarBiblioteca(q = "") {
    const b = await api.biblioteca(q);
    setBiblioteca(b);
  }

  function recargarPlaylists() {
    api.playlists().then(setPlaylists).catch(() => {});
  }

  async function crearPlaylist() {
    const nombre = nombreNueva.trim();
    if (!nombre) return;
    try {
      await api.crearPlaylist({ nombre });
      setNombreNueva("");
      setCreandoPlaylist(false);
      recargarPlaylists();
    } catch (err) {
      setAviso(err.message || "No se pudo crear la playlist.");
    }
  }

  async function eliminarPlaylist(id, e) {
    e?.stopPropagation();
    if (!confirm("¿Eliminar esta playlist? Las canciones permanecen en la biblioteca.")) return;
    try {
      await api.eliminarPlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setAviso(err.message || "No se pudo eliminar la playlist.");
    }
  }

  useEffect(() => {
    Promise.all([api.biblioteca(), api.playlists(), api.programacion()])
      .then(([b, p, pr]) => {
        setBiblioteca(b);
        setPlaylists(p);
        setProgramacion(pr);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api.biblioteca(busqueda).then(setBiblioteca).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  async function eliminarPista(id) {
    try {
      await api.eliminarPista(id);
      setBiblioteca((prev) => prev.filter((t) => t.id !== id));
    } catch {
      /* noop */
    }
  }

  async function onArchivoXml(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setImportandoXml(true);
    setAviso("");
    try {
      const xml = await archivo.text();
      const r = await api.importarLibraryXml(xml);
      setAviso(r.mensaje);
      await cargarBiblioteca();
    } catch (err) {
      setAviso(err.message || "No se pudo importar el archivo.");
    } finally {
      setImportandoXml(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">AutoDJ</h1>
          <p className="text-sm text-muted">
            Gestiona tu música con iTunes como motor: busca canciones reales o importa tu biblioteca.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={inputXml} type="file" accept=".xml" className="hidden" onChange={onArchivoXml} />
          <button className="btn-ghost" onClick={() => setMostrarImportar(true)}>
            <UploadCloud size={16} /> Subir música
          </button>
          <button className="btn-ghost" onClick={() => inputXml.current?.click()} disabled={importandoXml}>
            {importandoXml ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Importar Library.xml
          </button>
          <button className="btn-primary" onClick={() => setMostrarItunes(true)}>
            <Apple size={16} /> Buscar en iTunes
          </button>
        </div>
      </div>

      {aviso && (
        <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">{aviso}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === id ? "bg-brand-600 text-white" : "text-muted hover:bg-surface2 hover:text-fg"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Biblioteca */}
      {tab === "biblioteca" && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line p-4">
            <div className="relative max-w-xs flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-9"
                placeholder="Buscar en tu biblioteca..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <span className="text-sm text-muted">{biblioteca.length} pistas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3"></th>
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Artista</th>
                  <th className="hidden px-3 py-3 lg:table-cell">Álbum</th>
                  <th className="px-3 py-3">Género</th>
                  <th className="px-3 py-3">Origen</th>
                  <th className="px-3 py-3">Dur.</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {biblioteca.map((t) => {
                  const sonando =
                    medioActual?.tipo === "pista" && medioActual?.id === t.id && reproduciendo;
                  return (
                    <tr key={t.id} className="hover:bg-surface2">
                      <td className="px-4 py-2">
                        <div className="relative h-10 w-10">
                          {t.artwork ? (
                            <img src={t.artwork} alt="" className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface2 text-muted">
                              <Music2 size={16} />
                            </div>
                          )}
                          {t.previewUrl && (
                            <button
                              onClick={() => (sonando ? alternar() : reproducirPista(t))}
                              className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition hover:opacity-100"
                              title="Escuchar preview"
                            >
                              {sonando ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-fg">{t.titulo}</td>
                      <td className="px-3 py-2 text-muted">{t.artista}</td>
                      <td className="hidden px-3 py-2 text-muted lg:table-cell">{t.album}</td>
                      <td className="px-3 py-2">
                        <span className="badge bg-brand-500/10 text-brand-500">{t.genero}</span>
                      </td>
                      <td className="px-3 py-2">
                        <BadgeFuente fuente={t.fuente} />
                      </td>
                      <td className="px-3 py-2 text-muted">
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {t.duracion}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => eliminarPista(t.id)}
                          className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Playlists */}
      {tab === "playlists" && (
        <>
          <p className="-mt-2 text-sm text-muted">
            Cada playlist es independiente: sube música o agrega canciones de la biblioteca a cada una por separado.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlaylistAbierta(p)}
                className="card group p-5 text-left transition hover:border-brand-500/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-500">
                    <ListMusic size={20} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge ${
                        p.activa
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-surface2 text-muted"
                      }`}
                    >
                      {p.activa ? "Activa" : "Inactiva"}
                    </span>
                    <span
                      onClick={(e) => eliminarPlaylist(p.id, e)}
                      className="rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                      title="Eliminar playlist"
                    >
                      <Trash2 size={15} />
                    </span>
                  </div>
                </div>
                <h3 className="mt-3 font-bold text-fg">{p.nombre}</h3>
                <p className="text-xs text-muted">{p.tipo}</p>
                <div className="mt-4 flex items-center justify-between text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <Music4 size={14} /> {p.pistas} pistas
                  </span>
                  <span className="font-semibold text-brand-500 opacity-0 transition group-hover:opacity-100">
                    Gestionar →
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full bg-brand-grad"
                    style={{ width: `${Math.min(100, p.pistas * 10)}%` }}
                  />
                </div>
              </button>
            ))}

            {/* Tarjeta: nueva playlist */}
            {creandoPlaylist ? (
              <div className="card flex flex-col justify-center gap-3 p-5">
                <input
                  autoFocus
                  className="input"
                  placeholder="Nombre de la playlist"
                  value={nombreNueva}
                  onChange={(e) => setNombreNueva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") crearPlaylist();
                    if (e.key === "Escape") setCreandoPlaylist(false);
                  }}
                />
                <div className="flex gap-2">
                  <button className="btn-primary flex-1" onClick={crearPlaylist}>
                    Crear
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setCreandoPlaylist(false);
                      setNombreNueva("");
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreandoPlaylist(true)}
                className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-muted transition hover:border-brand-500/60 hover:text-brand-500"
              >
                <Plus size={26} />
                <span className="text-sm font-semibold">Nueva playlist</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Programación */}
      {tab === "programacion" && (
        <div className="space-y-4">
          {/* Piloto automático */}
          <div className="card overflow-hidden">
            <div
              className={`flex flex-wrap items-center justify-between gap-4 p-5 ${
                auto ? "bg-brand-grad text-white" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    auto ? "bg-white/20" : "bg-brand-500/15 text-brand-500"
                  }`}
                >
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className={`font-bold ${auto ? "text-white" : "text-fg"}`}>Piloto automático</h3>
                  <p className={`text-sm ${auto ? "text-white/80" : "text-muted"}`}>
                    {auto
                      ? "Activo: cambia de playlist por horario e inserta cuñas solo."
                      : "Manual: tú controlas la reproducción y las cuñas."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => (auto ? desactivarAuto() : activarAuto())}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  auto
                    ? "bg-white text-brand-600 hover:bg-white/90"
                    : "bg-brand-600 text-white hover:bg-brand-500"
                }`}
              >
                <Power size={16} /> {auto ? "Desactivar" : "Activar automático"}
              </button>
            </div>
            {auto && ultimaCuña && (
              <div className="border-t border-white/20 bg-black/10 px-5 py-2 text-xs text-white/90">
                Última cuña: <span className="font-semibold">{ultimaCuña.nombre}</span> ·{" "}
                {ultimaCuña.hora.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>

          {/* Reglas de inserción: jingles y publicidad */}
          <div className="grid gap-4 sm:grid-cols-2">
            {inserciones.map((ins) => {
              const esJingle = ins.tipo === "jingle";
              const Icono = esJingle ? Sparkles : Megaphone;
              return (
                <div key={ins.id} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          esJingle
                            ? "bg-accent-500/15 text-accent-500"
                            : "bg-brand-500/15 text-brand-500"
                        }`}
                      >
                        <Icono size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-fg">{ins.nombre}</h4>
                        <p className="text-xs text-muted">
                          {ins.playlist} · {ins.playlistPistas} pistas
                        </p>
                      </div>
                    </div>
                    {/* Interruptor on/off */}
                    <button
                      onClick={() => toggleInsercionActiva(ins)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                        ins.activa ? "bg-brand-600" : "bg-surface2"
                      }`}
                      title={ins.activa ? "Activa" : "Inactiva"}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                          ins.activa ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-muted">Frecuencia</label>
                    <select
                      className="input h-9 w-auto py-1 text-sm"
                      value={ins.cadaMin}
                      onChange={(e) => cambiarCadaMin(ins, Number(e.target.value))}
                    >
                      <option value={15}>Cada 15 min</option>
                      <option value={20}>Cada 20 min</option>
                      <option value={30}>Cada 30 min</option>
                      <option value={45}>Cada 45 min</option>
                      <option value={60}>Cada 1 hora</option>
                      <option value={120}>Cada 2 horas</option>
                    </select>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="btn-ghost flex-1"
                      onClick={() =>
                        setPlaylistAbierta({ id: ins.playlistId, nombre: ins.playlist, tipo: ins.tipo })
                      }
                    >
                      <ListMusic size={15} /> Gestionar
                    </button>
                    <button
                      className="btn-ghost"
                      title="Reproducir una cuña ahora"
                      onClick={async () => {
                        const ok = await reproducirInsercion(ins);
                        if (!ok) setAviso(`Sube audios a «${ins.playlist}» para poder reproducir cuñas.`);
                      }}
                    >
                      <PlayCircle size={15} /> Probar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-sm text-muted">
              Programa qué playlist suena en cada franja horaria. El bloque vigente se marca «Al aire».
            </p>
            <button className="btn-primary" onClick={() => setProgramaEditar({})}>
              <Plus size={16} /> Nuevo bloque
            </button>
          </div>

          {/* Banner: en emisión ahora */}
          {programaAlAire ? (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4">
              <span className="flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                Al aire ahora
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-fg">{programaAlAire.nombre}</p>
                <p className="text-sm text-muted">
                  {programaAlAire.inicio}–{programaAlAire.fin} · Playlist:{" "}
                  <span className="font-semibold text-brand-500">{programaAlAire.playlist || "—"}</span>
                </p>
              </div>
              <button className="btn-primary" onClick={() => emitirPlaylist(programaAlAire)}>
                <PlayCircle size={16} /> Emitir ahora
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface2 p-4 text-sm text-muted">
              <Radio size={16} /> No hay ningún bloque programado para este momento.
            </div>
          )}

          {/* Tabla de bloques */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3">Evento</th>
                    <th className="px-5 py-3">Horario</th>
                    <th className="px-5 py-3">Playlist</th>
                    <th className="px-5 py-3">Días</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {programacion.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted">
                        Aún no hay bloques. Crea el primero con «Nuevo bloque».
                      </td>
                    </tr>
                  )}
                  {programacion.map((p) => {
                    const alAire = programaAlAire?.id === p.id;
                    return (
                      <tr key={p.id} className={alAire ? "bg-brand-500/5" : "hover:bg-surface2"}>
                        <td className="px-5 py-3 font-medium text-fg">
                          <div className="flex items-center gap-2">
                            {alAire && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                            {p.nombre}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {p.inicio}–{p.fin}
                        </td>
                        <td className="px-5 py-3">
                          {p.playlistId ? (
                            <span className="inline-flex items-center gap-1 text-fg">
                              <ListMusic size={14} className="text-brand-500" />
                              {p.playlist}
                              <span className="text-xs text-muted">({p.playlistPistas})</span>
                            </span>
                          ) : (
                            <span className="text-xs text-amber-500">Sin playlist</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="badge bg-brand-500/10 text-brand-500">{etiquetaDias(p.dias)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => emitirPlaylist(p)}
                              title="Emitir esta playlist ahora"
                              className="rounded-lg p-2 text-muted hover:bg-brand-500/10 hover:text-brand-500"
                            >
                              <PlayCircle size={16} />
                            </button>
                            <button
                              onClick={() => setProgramaEditar(p)}
                              title="Editar bloque"
                              className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={(e) => eliminarPrograma(p.id, e)}
                              title="Eliminar bloque"
                              className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mostrarItunes && (
        <BuscadorItunes
          onCerrar={() => setMostrarItunes(false)}
          onImportado={() => cargarBiblioteca(busqueda)}
        />
      )}

      {mostrarImportar && (
        <ImportadorCanciones
          onCerrar={() => setMostrarImportar(false)}
          onImportado={() => cargarBiblioteca(busqueda)}
        />
      )}

      {playlistAbierta && (
        <ModalPlaylist
          playlist={playlistAbierta}
          onCerrar={() => setPlaylistAbierta(null)}
          onCambios={() => {
            recargarPlaylists();
            recargarAutomatizacion();
          }}
        />
      )}

      {programaEditar && (
        <ModalPrograma
          programa={programaEditar.id ? programaEditar : null}
          playlists={playlists}
          onCerrar={() => setProgramaEditar(null)}
          onGuardado={recargarProgramacion}
        />
      )}
    </div>
  );
}
