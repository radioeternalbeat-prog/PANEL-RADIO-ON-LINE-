import { useEffect, useRef, useState } from "react";
import {
  Apple,
  CalendarClock,
  Clock,
  ListMusic,
  Loader2,
  Music2,
  Music4,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { api } from "../api/client";
import { usePlayer } from "../context/PlayerContext";
import BuscadorItunes from "../components/BuscadorItunes";
import ImportadorCanciones from "../components/ImportadorCanciones";
import ModalPlaylist from "../components/ModalPlaylist";

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
  const inputXml = useRef(null);
  const { reproducirPista, medioActual, reproduciendo, alternar } = usePlayer();

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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Evento</th>
                  <th className="px-5 py-3">Inicio</th>
                  <th className="px-5 py-3">Fin</th>
                  <th className="px-5 py-3">Playlist</th>
                  <th className="px-5 py-3">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {programacion.map((p) => (
                  <tr key={p.id} className="hover:bg-surface2">
                    <td className="px-5 py-3 font-medium text-fg">{p.nombre}</td>
                    <td className="px-5 py-3 text-muted">{p.inicio}</td>
                    <td className="px-5 py-3 text-muted">{p.fin}</td>
                    <td className="px-5 py-3 text-muted">{p.playlist}</td>
                    <td className="px-5 py-3">
                      <span className="badge bg-brand-500/10 text-brand-500">{p.dias}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          onCambios={recargarPlaylists}
        />
      )}
    </div>
  );
}
