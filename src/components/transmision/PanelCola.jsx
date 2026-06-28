import { useEffect, useState } from "react";
import {
  ListMusic,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { usePlayer } from "../../context/PlayerContext";
import { useMezclador } from "../../context/MezcladorContext";

function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PanelCola() {
  const [biblioteca, setBiblioteca] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const { cargarEnDeck } = useMezclador();
  const {
    cola,
    indiceCola,
    reproduciendo,
    modoAuto,
    setModoAuto,
    reproducirLista,
    reproducirIndice,
    encolar,
    quitarDeCola,
    alternar,
  } = usePlayer();

  useEffect(() => {
    api
      .biblioteca()
      .then(setBiblioteca)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const filtrada = biblioteca.filter(
    (t) =>
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.artista || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <ListMusic size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Cola automatizada</h3>
        </div>
        {/* Toggle AutoDJ */}
        <button
          onClick={() => setModoAuto(!modoAuto)}
          className={`badge transition ${
            modoAuto ? "bg-brand-500/15 text-brand-500" : "bg-surface2 text-muted"
          }`}
          title="Avance automático de pistas"
        >
          <Sparkles size={11} /> AutoDJ {modoAuto ? "ON" : "OFF"}
        </button>
      </div>

      {/* Acciones rápidas */}
      <div className="mb-3 flex gap-2">
        <button
          className="btn-primary flex-1 py-1.5 text-xs"
          onClick={() => reproducirLista(biblioteca, 0)}
          disabled={!biblioteca.length}
        >
          <Play size={14} /> Reproducir todo
        </button>
        <button
          className="btn-ghost flex-1 py-1.5 text-xs"
          onClick={() => reproducirLista(mezclar(biblioteca), 0)}
          disabled={!biblioteca.length}
        >
          <Shuffle size={14} /> Mezclar
        </button>
      </div>

      {/* Cola actual */}
      {cola.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            En cola ({cola.length})
          </p>
          <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
            {cola.map((t, i) => {
              const activa = i === indiceCola;
              return (
                <div
                  key={`${t.id}-${i}`}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    activa ? "bg-brand-500/10" : "hover:bg-surface2"
                  }`}
                >
                  <button
                    onClick={() => (activa ? alternar() : reproducirIndice(i))}
                    className="text-brand-500"
                    title={activa ? "Pausar/Reanudar" : "Reproducir"}
                  >
                    {activa && reproduciendo ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <span className={`flex-1 truncate ${activa ? "font-semibold text-fg" : "text-muted"}`}>
                    {t.titulo} <span className="text-muted">· {t.artista}</span>
                  </span>
                  <button
                    onClick={() => quitarDeCola(i)}
                    className="text-muted hover:text-red-500"
                    title="Quitar"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Biblioteca para añadir */}
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input py-1.5 pl-8 text-sm"
          placeholder="Buscar en la biblioteca..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {cargando ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="animate-spin text-brand-500" size={22} />
          </div>
        ) : (
          filtrada.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-surface2">
                {t.artwork ? (
                  <img src={t.artwork} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Music2 size={14} className="text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{t.titulo}</p>
                <p className="truncate text-xs text-muted">{t.artista}</p>
              </div>
              {/* Cargar en deck A / B del mezclador */}
              {t.previewUrl && (
                <>
                  <button
                    onClick={() => cargarEnDeck("A", t)}
                    className="rounded-md bg-brand-500/15 px-2 py-1 text-[11px] font-bold text-brand-500 transition hover:bg-brand-500/30"
                    title="Cargar en Deck A"
                  >
                    A
                  </button>
                  <button
                    onClick={() => cargarEnDeck("B", t)}
                    className="rounded-md bg-brand-500/15 px-2 py-1 text-[11px] font-bold text-brand-500 transition hover:bg-brand-500/30"
                    title="Cargar en Deck B"
                  >
                    B
                  </button>
                </>
              )}
              <button
                onClick={() => encolar(t)}
                className="rounded-md bg-surface2 p-1.5 text-muted transition hover:text-brand-500"
                title="Añadir a la cola"
              >
                <Plus size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
