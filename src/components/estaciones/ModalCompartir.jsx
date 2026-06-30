import { useState } from "react";
import { Check, Code2, Copy, ExternalLink, Radio, Share2, X } from "lucide-react";
import ReproductorCaster from "../ReproductorCaster";

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
  const tieneWidget = !!(estacion.embedToken && estacion.embedCanal);
  const temaWidget =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  // URL cruda del stream (para fuente/avanzado).
  const streamUrl =
    estacion.streamUrl || `http://${estacion.host}:${estacion.puerto}${estacion.montaje}`;

  // Código embed oficial de Caster.fm (reproductor para oyentes).
  const embedCaster = `<div data-type="newStreamPlayer" data-publicToken="${estacion.embedToken}" data-theme="light" data-color="FF8000" data-channelId="${estacion.embedCanal}" data-rendered="false" class="cstrEmbed"><a href="https://www.caster.fm">Shoutcast Hosting</a> <a href="https://www.caster.fm">Stream Hosting</a> <a href="https://www.caster.fm">Radio Server Hosting</a></div>
<script src="https://cdn.cloud.caster.fm/widgets/embed.js"></script>`;

  // Embed alternativo (audio HTML simple) cuando no hay widget.
  const embedAudio = `<audio controls preload="none" style="width:100%">
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
              <h2 className="font-semibold text-fg">Escuchar y compartir “{estacion.nombre}”</h2>
              <p className="text-xs text-muted">Reproductor en vivo, enlaces y código embed</p>
            </div>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-2 text-muted hover:bg-surface2 hover:text-fg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {tieneWidget ? (
            <>
              {/* Reproductor en vivo (widget oficial de Caster.fm) */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-muted">
                  <Radio size={14} className="text-brand-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Reproductor en vivo</span>
                </div>
                <ReproductorCaster
                  publicToken={estacion.embedToken}
                  channelId={estacion.embedCanal}
                  theme={temaWidget}
                  height={240}
                />
                <p className="mt-2 text-[11px] text-muted">
                  Pulsa play para escuchar lo que estás transmitiendo ahora mismo.
                </p>
              </div>

              {/* Código embed para la web del usuario */}
              <div className="flex items-center gap-2 text-muted">
                <Code2 size={14} className="text-brand-500" />
                <span className="text-xs font-semibold uppercase tracking-wide">Para tu sitio web</span>
              </div>
              <Copiable etiqueta="Pega este código en tu web (reproductor Caster.fm)" valor={embedCaster} multilinea />

              <p className="rounded-lg bg-surface2 px-3 py-2 text-[11px] text-muted">
                En el plan gratuito de Caster.fm, los oyentes escuchan por este reproductor (no por una URL
                directa). La URL con puerto es la de la <span className="font-semibold text-fg">fuente</span> y pide
                contraseña, por eso no se puede compartir tal cual.
              </p>
            </>
          ) : (
            <>
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
              <Copiable etiqueta="Pega este código en tu web" valor={embedAudio} multilinea />
              <p className="rounded-lg bg-surface2 px-3 py-2 text-[11px] text-muted">
                La URL suena cuando hay una <span className="font-semibold text-fg">fuente emitiendo</span> al
                servidor. Si nada está al aire, el reproductor mostrará "sin audio".
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
