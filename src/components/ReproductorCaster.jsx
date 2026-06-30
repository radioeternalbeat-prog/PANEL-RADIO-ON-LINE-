import { useEffect, useMemo, useRef, useState } from "react";

// Reproductor embebible oficial de Caster.fm (widget "newStreamPlayer").
// Se monta dentro de un iframe (srcDoc) para que el script de Caster se
// ejecute limpio, y se autoajusta a la altura real del reproductor.
//
// publicToken y channelId son públicos (pensados para incrustarse en webs).
export default function ReproductorCaster({
  publicToken,
  channelId,
  theme = "light",
  color = "FF8000",
  minHeight = 120,
}) {
  const iframeRef = useRef(null);
  const [alto, setAlto] = useState(minHeight);

  const srcDoc = useMemo(() => {
    const colorLimpio = String(color).replace("#", "");
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}</style>
</head>
<body>
<div
  data-type="newStreamPlayer"
  data-publicToken="${publicToken}"
  data-theme="${theme}"
  data-color="${colorLimpio}"
  data-channelId="${channelId}"
  data-rendered="false"
  class="cstrEmbed"><a href="https://www.caster.fm">Shoutcast Hosting</a> <a href="https://www.caster.fm">Stream Hosting</a> <a href="https://www.caster.fm">Radio Server Hosting</a></div>
<script src="https://cdn.cloud.caster.fm/widgets/embed.js"></script>
</body>
</html>`;
  }, [publicToken, channelId, theme, color]);

  // Mide la altura real del contenido del widget y ajusta el iframe.
  // El widget se renderiza de forma asíncrona, por eso se sondea unos segundos.
  useEffect(() => {
    function ajustar() {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;
        const h = Math.max(
          doc.body?.scrollHeight || 0,
          doc.documentElement?.scrollHeight || 0
        );
        if (h && h > minHeight) setAlto(h);
      } catch {
        /* origen distinto: se mantiene la altura por defecto */
      }
    }
    const intervalo = setInterval(ajustar, 350);
    const fin = setTimeout(() => clearInterval(intervalo), 8000);
    return () => {
      clearInterval(intervalo);
      clearTimeout(fin);
    };
  }, [srcDoc, minHeight]);

  if (!publicToken || !channelId) {
    return (
      <div className="rounded-xl bg-surface2 px-4 py-6 text-center text-sm text-muted">
        Configura el reproductor de Caster.fm (token y canal) en la estación.
      </div>
    );
  }

  // Nota: el widget de Caster.fm no reproduce dentro de un iframe en modo
  // "sandbox" (bloquea el audio). Por eso el iframe va sin sandbox y con
  // permisos de autoplay/media. El contenido viene del CDN oficial de Caster.
  return (
    <iframe
      ref={iframeRef}
      title="Reproductor en vivo"
      srcDoc={srcDoc}
      scrolling="no"
      onLoad={() => {
        // Primer ajuste tras cargar el documento.
        try {
          const doc = iframeRef.current?.contentDocument;
          const h = Math.max(doc?.body?.scrollHeight || 0, doc?.documentElement?.scrollHeight || 0);
          if (h && h > minHeight) setAlto(h);
        } catch {
          /* noop */
        }
      }}
      className="block w-full overflow-hidden rounded-xl border border-line bg-surface"
      style={{ height: alto }}
      allow="autoplay; encrypted-media; fullscreen; clipboard-write"
    />
  );
}
