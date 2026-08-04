import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Disc3,
  ListMusic,
  Loader2,
  Music2,
  Play,
  Search,
} from "lucide-react";
import { api } from "../../api/client";
import { useMezclador } from "../../context/MezcladorContext";

export default function PanelPlaylists() {
  const [playlists, setPlaylists] = useState([]);
  const [playlistActiva, setPlaylistActiva] = useState(null);
  const [pistas, setPistas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoPistas, setCargandoPistas] = useState(false);
  const [cargandoDeck, setCargandoDeck] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const { cargarEnDeck } = useMezclador();

  useEffect(() => {
    api
      .playlists()
      .then(setPlaylists)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  async function abrirPlaylist(pl) {
    if (playlistActiva?.id === pl.id) {
      // Cerrar si ya está abierta
      setPlaylistActiva(null);
      setPistas([]);
      return;
    }
    setPlaylistActiva(pl);
    setCargandoPistas(true);
    try {
      const p = await api.pistasDePlaylist(pl.id);
      setPistas(p);
    } catch {
      setPistas([]);
    } finally {
      setCargandoPistas(false);
    }
  }

  async function aDeck(deckId, t) {
    const clave = `${deckId}-${t.id}`;
    setCargandoDeck(clave);
    try {
      await cargarEnDeck(deckId, t);
    } finally {
      setCargandoDeck((c) => (c === clave ? null : c));
    }
  }

  const pistasFiltradas = busqueda
    ? pistas.filter(
        (t) =>
          t.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
          (t.artista || "").toLowerCase().includes(busqueda.toLowerCase())
      )
    : pistas;

  return (
    <div className="card flex flex-col p-5">
      <div className="mb-3 flex items-center gap-2 text-muted">
        <Disc3 size={16} className="text-brand-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">Playlists</h3>
        <span className="ml-auto badge bg-surface2 text-muted">{playlists.length}</span>
      </div>

      {cargando ? (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="animate-spin text-brand-500" size={22} />
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex h-20 items-center justify-center text-xs text-muted">
          No hay playlists. Crea una desde AutoDJ.
        </div>
      ) : (
        <div className="space-y-1">
          {/* Lista de playlists */}
          {playlists.map((pl) => {
            const activa = playlistActiva?.id === pl.id;
            return (
              <div key={pl.id}>
                <button
                  onClick={() => abrirPlaylist(pl)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                    activa ? "bg-brand-500/10 text-brand-400" : "hover:bg-surface2 text-fg"
                  }`}
                >
                  {activa ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <ListMusic size={14} className={activa ? "text-brand-400" : "text-muted"} />
                  <span className="flex-1 truncate text-sm font-medium">{pl.nombre}</span>
                  <span className="text-xs text-muted">{pl.pistas} pistas</span>
                </button>

                {/* Contenido de la playlist expandida */}
                {activa && (
                  <div className="ml-4 mt-1 rounded-lg border border-line bg-surface2/50 p-3">
                    {/* Buscador dentro de la playlist */}
                    {pistas.length > 5 && (
                      <div className="relative mb-2">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                          className="input py-1 pl-7 text-xs"
                          placeholder={`Buscar en ${pl.nombre}...`}
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                        />
                      </div>
                    )}

                    {cargandoPistas ? (
                      <div className="flex h-12 items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-brand-500" />
                      </div>
                    ) : pistasFiltradas.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted">
                        {busqueda ? "Sin resultados" : "Playlist vacía"}
                      </p>
                    ) : (
                      <div className="max-h-64 space-y-0.5 overflow-y-auto">
                        {pistasFiltradas.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface"
                          >
                            {/* Artwork */}
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface overflow-hidden">
                              {t.artwork ? (
                                <img src={t.artwork} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Music2 size={12} className="text-muted" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-fg">{t.titulo}</p>
                              <p className="truncate text-[10px] text-muted">{t.artista || "—"}</p>
                            </div>

                            {/* Cargar en Deck A */}
                            <button
                              onClick={() => aDeck("A", t)}
                              disabled={cargandoDeck === `A-${t.id}`}
                              className="flex h-5 w-5 items-center justify-center rounded bg-brand-500/15 text-[10px] font-bold text-brand-500 transition hover:bg-brand-500/30 disabled:opacity-50"
                              title="Cargar en Deck A"
                            >
                              {cargandoDeck === `A-${t.id}` ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                "A"
                              )}
                            </button>

                            {/* Cargar en Deck B */}
                            <button
                              onClick={() => aDeck("B", t)}
                              disabled={cargandoDeck === `B-${t.id}`}
                              className="flex h-5 w-5 items-center justify-center rounded bg-brand-500/15 text-[10px] font-bold text-brand-500 transition hover:bg-brand-500/30 disabled:opacity-50"
                              title="Cargar en Deck B"
                            >
                              {cargandoDeck === `B-${t.id}` ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                "B"
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
