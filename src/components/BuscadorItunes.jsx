import { useState } from "react";
import {
  Check,
  Download,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react";
import { api } from "../api/client";
import { usePlayer } from "../context/PlayerContext";

export default function BuscadorItunes({ onCerrar, onImportado }) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState([]);
  const [seleccion, setSeleccion] = useState({});
  const [buscando, setBuscando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const { reproducirPista, medioActual, reproduciendo, alternar } = usePlayer();

  async function buscar(e) {
    e?.preventDefault();
    if (!termino.trim()) return;
    setBuscando(true);
    setError("");
    setAviso("");
    setSeleccion({});
    try {
      const { resultados } = await api.buscarItunes(termino, 30);
      setResultados(resultados);
      if (!resultados.length) setAviso("Sin resultados para esa búsqueda.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBuscando(false);
    }
  }

  function toggle(pista) {
    setSeleccion((s) => {
      const copia = { ...s };
      if (copia[pista.itunesId]) delete copia[pista.itunesId];
      else copia[pista.itunesId] = pista;
      return copia;
    });
  }

  const seleccionadas = Object.values(seleccion);

  async function importar() {
    if (!seleccionadas.length) return;
    setImportando(true);
    setError("");
    try {
      const r = await api.importarItunes(seleccionadas);
      setAviso(r.mensaje);
      setSeleccion({});
      onImportado?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-line bg-surface shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-grad text-white">
              <Music2 size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-fg">Buscar en iTunes</h2>
              <p className="text-xs text-muted">Catálogo de Apple · canciones reales con preview</p>
            </div>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
            <X size={20} />
          </button>
        </div>

        {/* Buscador */}
        <div className="border-b border-line p-5">
          <form onSubmit={buscar} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                className="input pl-9"
                placeholder="Artista, canción o álbum (ej. Shakira, Despacito...)"
                value={termino}
                onChange={(e) => setTermino(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={buscando}>
              {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Buscar
            </button>
          </form>
          {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}
          {aviso && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500 dark:text-emerald-400">{aviso}</p>}
        </div>

        {/* Resultados */}
        <div className="max-h-[45vh] overflow-y-auto p-3">
          {resultados.length === 0 && !buscando && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted">
              <Music2 size={36} />
              <p className="text-sm">Busca canciones para agregarlas a tu biblioteca.</p>
            </div>
          )}

          <div className="space-y-1">
            {resultados.map((p) => {
              const sel = !!seleccion[p.itunesId];
              const sonando =
                medioActual?.tipo === "pista" &&
                medioActual?.id === p.itunesId &&
                reproduciendo;
              return (
                <div
                  key={p.itunesId}
                  className={`flex items-center gap-3 rounded-xl p-2 transition ${
                    sel ? "bg-brand-500/10" : "hover:bg-surface2"
                  }`}
                >
                  <div className="relative h-12 w-12 shrink-0">
                    {p.artwork ? (
                      <img src={p.artwork} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface2 text-muted">
                        <Music2 size={18} />
                      </div>
                    )}
                    {p.previewUrl && (
                      <button
                        onClick={() => (sonando ? alternar() : reproducirPista(p))}
                        className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition hover:opacity-100"
                        title="Escuchar preview"
                      >
                        {sonando ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{p.titulo}</p>
                    <p className="truncate text-xs text-muted">
                      {p.artista} · {p.album}
                    </p>
                  </div>

                  <span className="hidden text-xs text-muted sm:block">{p.duracion}</span>
                  <span className="hidden rounded-full border border-line bg-surface2 px-2 py-0.5 text-[11px] text-muted md:block">
                    {p.genero}
                  </span>

                  <button
                    onClick={() => toggle(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      sel
                        ? "bg-brand-600 text-white"
                        : "border border-line bg-surface2 text-muted hover:text-fg"
                    }`}
                    title={sel ? "Quitar de la selección" : "Agregar a la selección"}
                  >
                    {sel ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between gap-3 border-t border-line p-4">
          <p className="text-sm text-muted">{seleccionadas.length} seleccionada(s)</p>
          <div className="flex gap-2">
            <button onClick={onCerrar} className="btn-ghost">
              Cerrar
            </button>
            <button
              onClick={importar}
              className="btn-primary"
              disabled={!seleccionadas.length || importando}
            >
              {importando ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Importar a biblioteca
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
