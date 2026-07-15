#!/usr/bin/env bash
# Despliega o actualiza Eternal Beat en el VPS.
# Uso en el VPS (dentro de la carpeta del proyecto):
#   bash deploy/deploy.sh            # panel + HTTPS
#   bash deploy/deploy.sh radio      # además, streaming propio (Icecast + Liquidsoap)
set -euo pipefail

COMPOSE="docker-compose.prod.yml"
PERFIL="${1:-}"

echo "==> Actualizando código (git pull)…"
git pull --ff-only

if [ ! -f .env ]; then
  echo "!! No existe .env. Cópialo desde la plantilla y configúralo:"
  echo "     cp .env.example .env && nano .env"
  exit 1
fi

if [ "$PERFIL" = "radio" ]; then
  echo "==> Construyendo y levantando panel + streaming propio…"
  docker compose -f "$COMPOSE" --profile radio up -d --build
else
  echo "==> Construyendo y levantando panel + HTTPS…"
  docker compose -f "$COMPOSE" up -d --build
fi

echo "==> Estado de los servicios:"
docker compose -f "$COMPOSE" ps

echo "==> Listo. Revisa los registros con:"
echo "     docker compose -f $COMPOSE logs -f panel"
