import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Clock,
  Library,
  ListMusic,
  ListPlus,
  Loader2,
  Music2,
  Pause,
  Play,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { api, subirAPlaylist } from "../api/client";
import { usePlayer } from "../context/PlayerContext";

// Modal de gestión de UNA playlist independiente.
// Permite: subir música propia a esta playlist, agregar desde la biblioteca,
// quitar canciones, reproducir una pista o la lista completa.
export default function ModalPlaylist({ playlist, onCerrar, onCambios }) {
  const { reproducirPista, reproducirLista, encolar, medioActual, reproduciendo, alternar } = usePlayer();
  const [pistas, setPistas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState("lista"); // "lista" | "biblioteca"
  const [biblioteca, setBiblioteca] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [subidas, setSubidas] = useState([]); // { nombre, estado, error? }
  const [aviso, setAviso] = useState("");
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  async function recargar() {
    const p = await api.pistasDePlaylist(playlist.id);
    setPistas(p);
  }

  useEffect(() => {
    api
      .pistasDePlaylist(playlist.id)
      .then(setPistas)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [playlist.id]);

  // Cargar biblioteca al cambiar a esa vista o buscar.
  useEffect(() => {
    if (vista !== "biblioteca") return;
    const t = setTimeout(() => {
      api.biblioteca(busqueda).then(setBiblioteca).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [vista, busqueda]);

  const idsEnPlaylist = useMemo(() => new Set(pistas.map((p) => p.id)), [pistas]);
  const subiendo = subidas.some((s) => s.estado === "subiendo");

  async function procesarArchivos(archivos) {
    const lista = Array.from(archivos || []).filter((f) => f.type.startsWith("audio/"));
    if (!lista.length) return;
    const base = subidas.length;
    setSubidas((prev) => [...prev, ...lista.map((f) => ({ nombre: f.name, estado: "subiendo" }))]);
    for (let i = 0; i < lista.length; i++) {
      const archivo = lista[i];
      const idx = base + i;
      try {
        await subirAPlaylist({ id: playlist.id, archivo, titulo: archivo.name.replace(/\.[^.]+$/, "") });
        setSubidas((prev) => prev.map((s, j) => (j === idx ? { ...s, estado: "ok" } : s)));
      } catch (err) {
        setSubidas((prev) =>
          prev.map((s, j) => (j === idx ? { ...s, estado: "error", error: err.message } : s))
        );
      }
    }
    await recargar();
    onCambios?.();
  }

  async function agregarDeBiblioteca(pista) {
    try {
      await api.agregarPistaPlaylist(playlist.id, pista.id);
      await recargar();
      onCambios?.();
    } catch (err) {
      setAviso(err.message);
    }
  }

  async function quitar(pistaId) {
    try {
      await api.quitarPistaPlaylist(playlist.id, pistaId);
      setPistas((prev) => prev.filter((p) => p.id !== pistaId));
      onCambios?.();
    } catch (err) {
      setAviso(err.message);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setArrastrando(false);
    procesarArchivos(e.dataTransfer.files);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 flex w-full max-w-3xl flex-col rounded-2xl border border-line bg-surface shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-grad text-white">
              <ListMusic size={22} />
            </div>
            <div>
              <h2 className="font-bold text-fg">{playlist.nombre}</h2>
              <p className="text-xs text-muted">
                {playlist.tipo} · {pistas.length} canción(es) en esta playlist
              </p>
            </div>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
            <X size={20} />
          </button>
        </div>

        {/* Barra de acciones */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              procesarArchivos(e.target.files);
              e.target.value = "";
            }}
          />
          <button className="btn-primary" onClick={() => inputRef.current?.click()} disabled={subiendo}>
            {subiendo ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            Subir música aquí
          </button>
          <button
            className={`btn-ghost ${vista === "biblioteca" ? "ring-2 ring-brand-500" : ""}`}
            onClick={() => setVista(vista === "biblioteca" ? "lista" : "biblioteca")}
          >
            <Library size={16} /> {vista === "biblioteca" ? "Ver la playlist" : "Agregar de la biblioteca"}
          </button>
          {pistas.length > 0 && vista === "lista" && (
            <button className="btn-ghost" onClick={() => reproducirLista(pistas, 0)}>
              <PlayCircle size={16} /> Reproducir todo
            </button>
          )}
        </div>

        {aviso && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
            <AlertCircle size={14} /> {aviso}
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto p-4">
          {/* VISTA LISTA */}
          {vista === "lista" && (
            <>
              {/* Zona de arrastrar */}
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={onDrop}
                className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-5 text-center transition ${
                  arrastrando ? "border-brand-500 bg-brand-500/10" : "border-line bg-surface2 hover:border-brand-500/50"
                }`}
              >
                <UploadCloud size={26} className="text-brand-500" />
                <p className="text-sm font-semibold text-fg">Arrastra canciones para esta playlist</p>
                <p className="text-xs text-muted">Se guardan solo en «{playlist.nombre}»</p>
              </div>

              {/* Subidas en curso */}
              {subidas.length > 0 && (
                <div className="mb-4 space-y-1">
                  {subidas.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-surface2 px-3 py-2">
                      <Music2 size={15} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">{s.nombre}</span>
                      {s.estado === "subiendo" && <Loader2 size={15} className="animate-spin text-brand-500" />}
                      {s.estado === "ok" && <Check size={15} className="text-emerald-500" />}
                      {s.estado === "error" && (
                        <AlertCircle size={15} className="text-red-500" title={s.error} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {cargando ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="animate-spin text-brand-500" size={26} />
                </div>
              ) : pistas.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted">
                  <ListMusic size={32} className="opacity-50" />
                  <p className="text-sm">Esta playlist está vacía.</p>
                  <p className="text-xs">Sube música o agrégala desde la biblioteca.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {pistas.map((t, i) => {
                    const sonando = medioActual?.tipo === "pista" && medioActual?.id === t.id && reproduciendo;
                    return (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface2"
                      >
                        <span className="w-5 text-right text-xs text-muted">{i + 1}</span>
                        <div className="relative h-10 w-10 shrink-0">
                          {t.artwork ? (
                            <img src={t.artwork} alt="" className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface2 text-muted">
                              <Music2 size={15} />
                            </div>
                          )}
                          <button
                            onClick={() => (sonando ? alternar() : reproducirPista(t))}
                            className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition hover:opacity-100"
                          >
                            {sonando ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">{t.titulo}</p>
                          <p className="truncate text-xs text-muted">{t.artista}</p>
                        </div>
                        <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
                          <Clock size={12} /> {t.duracion}
                        </span>
                        <button
                          onClick={() => encolar(t)}
                          title="Enviar a la cola"
                          className="rounded-lg p-2 text-muted hover:bg-brand-500/10 hover:text-brand-500"
                        >
                          <ListPlus size={16} />
                        </button>
                        <button
                          onClick={() => quitar(t.id)}
                          title="Quitar de la playlist"
                          className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {/* VISTA BIBLIOTECA */}
          {vista === "biblioteca" && (
            <>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-9"
                  placeholder="Buscar en la biblioteca para agregar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  autoFocus
                />
              </div>
              {biblioteca.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">No hay canciones en la biblioteca.</div>
              ) : (
                <ul className="space-y-1">
                  {biblioteca.map((t) => {
                    const ya = idsEnPlaylist.has(t.id);
                    return (
                      <li key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface2 text-muted">
                          {t.artwork ? (
                            <img src={t.artwork} alt="" className="h-9 w-9 rounded-md object-cover" />
                          ) : (
                            <Music2 size={14} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">{t.titulo}</p>
                          <p className="truncate text-xs text-muted">{t.artista}</p>
                        </div>
                        <button
                          disabled={ya}
                          onClick={() => agregarDeBiblioteca(t)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                            ya
                              ? "cursor-default bg-emerald-500/10 text-emerald-500"
                              : "bg-brand-500/10 text-brand-500 hover:bg-brand-500/20"
                          }`}
                        >
                          {ya ? <Check size={14} /> : <Plus size={14} />} {ya ? "Agregada" : "Agregar"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between gap-3 border-t border-line p-4">
          <p className="text-sm text-muted">{pistas.length} canción(es) en esta playlist</p>
          <button onClick={onCerrar} className="btn-primary">
            <Check size={16} /> Listo
          </button>
        </div>
      </div>
    </div>
  );
}
