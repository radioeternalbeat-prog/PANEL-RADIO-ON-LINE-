import { useMemo } from "react";

// Reproductor embebible oficial de Caster.fm (widget "newStreamPlayer").
// Se monta dentro de un iframe aislado (srcDoc) para que el script de Caster
// se ejecute limpio en cada render, sin chocar con el DOM de React.
//
// publicToken y channelId son públicos (pensados para incrustarse en webs).
export default function ReproductorCaster({
  publicToken,
  channelId,
  theme = "light",
  color = "FF8000",
  height = 200,
}) {
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
  class="cstrEmbed"></div>
<script src="https://cdn.cloud.caster.fm/widgets/embed.js"></script>
</body>
</html>`;
  }, [publicToken, channelId, theme, color]);

  if (!publicToken || !channelId) {
    return (
      <div className="rounded-xl bg-surface2 px-4 py-6 text-center text-sm text-muted">
        Configura el reproductor de Caster.fm (token y canal) en la estación.
      </div>
    );
  }

  return (
    <iframe
      title="Reproductor en vivo"
      srcDoc={srcDoc}
      className="w-full rounded-xl border border-line bg-surface"
      style={{ height }}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  );
}
