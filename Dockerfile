# --- build ---
FROM node:20-alpine AS build
WORKDIR /app

# Coolify API (build-time only). Si no se setean, el script usa projects.fallback.json.
ARG COOLIFY_API_URL=""
ARG COOLIFY_API_TOKEN=""
ENV COOLIFY_API_URL=$COOLIFY_API_URL
ENV COOLIFY_API_TOKEN=$COOLIFY_API_TOKEN

# Analítica propia (Umami, build-time). Si no se setean, no se inyecta el script.
ARG VITE_UMAMI_URL=""
ARG VITE_UMAMI_WEBSITE_ID=""
ENV VITE_UMAMI_URL=$VITE_UMAMI_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# --- serve ---
FROM nginx:1.27-alpine AS serve

# node (sin deps externas: el script usa sólo built-ins + fetch global) para
# regenerar projects.json en cada arranque del contenedor.
RUN apk add --no-cache nodejs

WORKDIR /app
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/projects.overrides.json ./projects.overrides.json
COPY --from=build /app/projects.fallback.json ./projects.fallback.json

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Hook de arranque: regenera la grilla desde la API en cada deploy/restart.
COPY --chmod=0755 scripts/refresh-projects.sh /docker-entrypoint.d/40-refresh-projects.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
