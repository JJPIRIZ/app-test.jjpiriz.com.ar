# app-test.jjpiriz.com.ar

Banco de pruebas para validar el nuevo **MegaServer Coolify** que estoy
armando para alojar todos mis desarrollos. Es una mini web hecha con
**React + Vite** que confirma de un vistazo que el pipeline completo está
funcionando: build → contenedor → reverse proxy → TLS → dominio.

Si abrís [https://app-test.jjpiriz.com.ar](https://app-test.jjpiriz.com.ar)
y se ve el panel con el terminal animado y los chequeos en verde, el
servidor está sirviendo correctamente.

---

## Qué prueba

- Build de **Vite 5** y hidratación de **React 18** en el cliente.
- Contenedor **Docker** multi-stage (Node 20 → nginx alpine).
- Servido detrás de **nginx** con SPA fallback, gzip y cache de assets.
- Healthcheck `/healthz` pensado para **Coolify / Traefik**.
- Latencia HEAD contra el propio host, uptime de sesión y datos de build.

## Stack

React 18 · Vite 5 · Docker · nginx · Coolify · Traefik

## Estructura

```
.
├── Dockerfile          # build multi-stage + nginx
├── nginx.conf          # SPA fallback, /healthz, gzip, cache
├── index.html
├── public/favicon.svg
├── src/
│   ├── App.jsx         # UI principal (hero, terminal, cards)
│   ├── App.css
│   ├── index.css
│   └── main.jsx
└── vite.config.js
```

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # genera dist/
npm run preview      # sirve dist/ en :4173
```

## Deploy en Coolify

1. **New Resource → Application → Public Repository** y pegar la URL del repo.
2. Build pack: **Dockerfile**.
3. Puerto interno: **80**.
4. Healthcheck path: **`/healthz`**.
5. En **Domains** asignar `app-test.jjpiriz.com.ar` y emitir certificado.

El `Dockerfile` ya incluye un `HEALTHCHECK` que pega contra `/healthz`,
así que tanto Docker como Coolify reportan el estado real del contenedor.

## Licencia

Uso personal — JJ Piriz · [jjpiriz.com.ar](https://jjpiriz.com.ar)
