#!/bin/sh
# Hook de arranque de nginx (/docker-entrypoint.d/): regenera projects.json
# leyendo la API de Coolify en CADA arranque del contenedor.
#
# Así el grid se actualiza con un Deploy normal (o cualquier restart), sin
# depender de la caché de build de Docker ni de "Force rebuild".
#
# Si la API falla, faltan las env vars, o tarda demasiado, queda el
# projects.json que vino horneado del build. Nunca bloquea el arranque.

echo "[refresh-projects] regenerando grilla desde la API de Coolify..."
if cd /app 2>/dev/null; then
  PROJECTS_OUT=/usr/share/nginx/html/projects.json timeout 15 node scripts/fetch-projects.mjs \
    || echo "[refresh-projects] sin datos frescos — se mantiene el projects.json del build"
fi
exit 0
