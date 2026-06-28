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
} from "lucide-react";
import { api } from "../api/client";
import { usePlayer } from "../context/PlayerContext";
import BuscadorItunes from "../components/BuscadorItunes";

const tabs = [
  { id: "biblioteca", label: "Biblioteca", icon: Music4 },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "programacion", label: "Programación", icon: CalendarClock },
];

function BadgeFuente({ fuente }) {
  const map = {
    itunes: { txt: "iTunes", cls: "bg-pink-100 text-pink-700" },
    xml: { txt: "Local", cls: "bg-indigo-100 text-indigo-700" },
    manual: { txt: "Manual", cls: "bg-slate-100 text-slate-500" },
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
  const [aviso, setAviso] = useState("");
  const inputXml = useRef(null);
  const { reproducirPista, medioActual, reproduciendo, alternar } = usePlayer();

  async function cargarBiblioteca(q = "") {
    const b = await api.biblioteca(q);
    setBiblioteca(b);
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
    e.target.value = ""; // permite re-subir el mismo archivo
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
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AutoDJ</h1>
          <p className="text-sm text-slate-500">
            Gestiona tu música con iTunes como motor: busca canciones reales o importa tu biblioteca.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputXml}
            type="file"
            accept=".xml"
            className="hidden"
            onChange={onArchivoXml}
          />
          <button
            className="btn-ghost"
            onClick={() => inputXml.current?.click()}
            disabled={importandoXml}
          >
            {importandoXml ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Importar Library.xml
          </button>
          <button className="btn-primary" onClick={() => setMostrarItunes(true)}>
            <Apple size={16} /> Buscar en iTunes
          </button>
        </div>
      </div>

      {aviso && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{aviso}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Biblioteca */}
      {tab === "biblioteca" && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div className="relative max-w-xs flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Buscar en tu biblioteca..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <span className="text-sm text-slate-500">{biblioteca.length} pistas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
              <tbody className="divide-y divide-slate-100">
                {biblioteca.map((t) => {
                  const sonando =
                    medioActual?.tipo === "pista" && medioActual?.id === t.id && reproduciendo;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <div className="relative h-10 w-10">
                          {t.artwork ? (
                            <img src={t.artwork} alt="" className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                              <Music2 size={16} />
                            </div>
                          )}
                          {t.previewUrl && (
                            <button
                              onClick={() => (sonando ? alternar() : reproducirPista(t))}
                              className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-white opacity-0 transition hover:opacity-100"
                              title="Escuchar preview"
                            >
                              {sonando ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">{t.titulo}</td>
                      <td className="px-3 py-2 text-slate-600">{t.artista}</td>
                      <td className="hidden px-3 py-2 text-slate-500 lg:table-cell">{t.album}</td>
                      <td className="px-3 py-2">
                        <span className="badge bg-brand-50 text-brand-700">{t.genero}</span>
                      </td>
                      <td className="px-3 py-2">
                        <BadgeFuente fuente={t.fuente} />
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {t.duracion}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => eliminarPista(t.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <ListMusic size={20} />
                </div>
                <span className={`badge ${p.activa ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <h3 className="mt-3 font-bold text-slate-800">{p.nombre}</h3>
              <p className="text-xs text-slate-400">{p.tipo}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <span>{p.pistas} pistas</span>
                <span className="font-semibold text-brand-700">Peso {p.peso}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.peso}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Programación */}
      {tab === "programacion" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Evento</th>
                  <th className="px-5 py-3">Inicio</th>
                  <th className="px-5 py-3">Fin</th>
                  <th className="px-5 py-3">Playlist</th>
                  <th className="px-5 py-3">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {programacion.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.nombre}</td>
                    <td className="px-5 py-3 text-slate-600">{p.inicio}</td>
                    <td className="px-5 py-3 text-slate-600">{p.fin}</td>
                    <td className="px-5 py-3 text-slate-600">{p.playlist}</td>
                    <td className="px-5 py-3">
                      <span className="badge bg-brand-50 text-brand-700">{p.dias}</span>
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
    </div>
  );
}
