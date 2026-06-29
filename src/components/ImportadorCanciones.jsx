import { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ListPlus,
  Loader2,
  Music2,
  UploadCloud,
  X,
} from "lucide-react";
import { subirCancion } from "../api/client";
import { usePlayer } from "../context/PlayerContext";

export default function ImportadorCanciones({ onCerrar, onImportado }) {
  const { encolar } = usePlayer();
  const [items, setItems] = useState([]); // { nombre, estado: 'subiendo'|'ok'|'error', pista?, error? }
  const [aCola, setACola] = useState(true);
  const [arrastrando, setArrastrando] = useState(false);
  const aColaRef = useRef(aCola);
  aColaRef.current = aCola;
  const inputRef = useRef(null);

  async function procesar(archivos) {
    const lista = Array.from(archivos || []).filter((f) => f.type.startsWith("audio/"));
    if (!lista.length) return;
    const base = items.length;
    setItems((prev) => [...prev, ...lista.map((f) => ({ nombre: f.name, estado: "subiendo" }))]);

    for (let i = 0; i < lista.length; i++) {
      const archivo = lista[i];
      const idx = base + i;
      try {
        const pista = await subirCancion({ archivo, titulo: archivo.name.replace(/\.[^.]+$/, "") });
        if (aColaRef.current) encolar(pista); // conectar con la Cola automatizada
        setItems((prev) => prev.map((it, j) => (j === idx ? { ...it, estado: "ok", pista } : it)));
      } catch (err) {
        setItems((prev) =>
          prev.map((it, j) => (j === idx ? { ...it, estado: "error", error: err.message } : it))
        );
      }
    }
    onImportado?.();
  }

  function onDrop(e) {
    e.preventDefault();
    setArrastrando(false);
    procesar(e.dataTransfer.files);
  }

  const subiendo = items.some((it) => it.estado === "subiendo");
  const listas = items.filter((it) => it.estado === "ok").length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-line bg-surface shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-grad text-white">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-fg">Importar canciones reales</h2>
              <p className="text-xs text-muted">Sube tus archivos de audio y guárdalos en la biblioteca</p>
            </div>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* Zona de arrastrar y soltar */}
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              procesar(e.target.files);
              e.target.value = "";
            }}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
              arrastrando ? "border-brand-500 bg-brand-500/10" : "border-line bg-surface2 hover:border-brand-500/50"
            }`}
          >
            <UploadCloud size={36} className="text-brand-500" />
            <p className="text-sm font-semibold text-fg">Arrastra tus canciones aquí</p>
            <p className="text-xs text-muted">o haz clic para seleccionar archivos (MP3, AAC, etc.)</p>
          </div>

          {/* Opción: agregar a la cola automatizada */}
          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg bg-surface2 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-fg">
              <ListPlus size={16} className="text-brand-500" />
              Agregar a la cola automatizada al importar
            </span>
            <input
              type="checkbox"
              className="h-5 w-9 cursor-pointer accent-brand-500"
              checked={aCola}
              onChange={(e) => setACola(e.target.checked)}
            />
          </label>

          {/* Lista de importaciones */}
          {items.length > 0 && (
            <div className="mt-4 max-h-60 space-y-1 overflow-y-auto pr-1">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-surface2 px-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface text-muted">
                    <Music2 size={15} />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{it.nombre}</span>
                  {it.estado === "subiendo" && <Loader2 size={16} className="animate-spin text-brand-500" />}
                  {it.estado === "ok" && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check size={14} /> {aCola ? "En biblioteca y cola" : "Guardada"}
                    </span>
                  )}
                  {it.estado === "error" && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-500" title={it.error}>
                      <AlertCircle size={14} /> Error
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between gap-3 border-t border-line p-4">
          <p className="text-sm text-muted">
            {subiendo ? "Subiendo…" : `${listas} canción(es) guardada(s)`}
          </p>
          <button onClick={onCerrar} className="btn-primary" disabled={subiendo}>
            {subiendo ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Listo
          </button>
        </div>
      </div>
    </div>
  );
}
