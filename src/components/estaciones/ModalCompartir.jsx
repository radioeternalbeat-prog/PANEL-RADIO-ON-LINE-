import { useState } from "react";
import { Check, Code2, Copy, ExternalLink, Radio, Share2, X } from "lucide-react";

function Copiable({ etiqueta, valor, multilinea }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    navigator.clipboard?.writeText(valor).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">{etiqueta}</label>
        <button onClick={copiar} className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline">
          {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      {multilinea ? (
        <pre className="overflow-x-auto rounded-lg bg-[#121214] p-3 text-xs text-emerald-300">{valor}</pre>
      ) : (
        <div className="flex items-center rounded-lg bg-[#121214] p-3">
          <code className="flex-1 truncate text-xs text-accent-400">{valor}</code>
        </div>
      )}
    </div>
  );
}

export default function ModalCompartir({ estacion, onCerrar }) {
  // Usa la URL real del stream si está configurada; si no, la construye.
  const streamUrl =
    estacion.streamUrl || `http://${estacion.host}:${estacion.puerto}${estacion.montaje}`;
  const embed = `<audio controls preload="none" style="width:100%">
  <source src="${streamUrl}" type="audio/mpeg" />
  Tu navegador no soporta audio en streaming.
</audio>`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-grad text-white">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-fg">Compartir “{estacion.nombre}”</h2>
              <p className="text-xs text-muted">Enlaces y código para tus oyentes</p>
            </div>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Copiable etiqueta="URL del stream (oyentes)" valor={streamUrl} />

          <div className="flex flex-wrap gap-2">
            <a href={streamUrl} target="_blank" rel="noreferrer" className="btn-primary">
              <Radio size={16} /> Abrir el stream
            </a>
            <a href={streamUrl} target="_blank" rel="noreferrer" download className="btn-ghost">
              <ExternalLink size={16} /> Abrir en otra app
            </a>
          </div>

          <div className="flex items-center gap-2 text-muted">
            <Code2 size={14} className="text-brand-500" />
            <span className="text-xs font-semibold uppercase tracking-wide">Reproductor embebible</span>
          </div>
          <Copiable etiqueta="Pega este código en tu web" valor={embed} multilinea />

          <p className="rounded-lg bg-surface2 px-3 py-2 text-[11px] text-muted">
            La URL suena cuando hay una <span className="font-semibold text-fg">fuente emitiendo</span> al
            servidor (AutoDJ del proveedor, codificador como BUTT/Mixxx, o Liquidsoap). Si nada está al aire,
            el reproductor mostrará "sin audio".
          </p>
        </div>
      </div>
    </div>
  );
}
