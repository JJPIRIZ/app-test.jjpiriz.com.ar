// scripts/fetch-projects.mjs
//
// Build-time: llama a Coolify API y genera public/projects.json.
// Si falla (sin env vars, API caída, etc.), usa projects.fallback.json.
// Nunca hace fallar el build — el lab siempre arranca con algo.
//
// Trae DOS endpoints de Coolify:
//   /api/v1/applications  → se muestran todas las que tengan dominio público.
//   /api/v1/services      → OPT-IN: sólo se muestran las que en
//                            projects.overrides.json tengan "show": true.
//   (así herramientas internas como Umami/Dozzle quedan ocultas por defecto)
//
// Env vars esperadas (Coolify "Build Variables" con "Is Build Time" = on):
//   COOLIFY_API_URL    — ej: https://coolify.jjpiriz.com.ar
//   COOLIFY_API_TOKEN  — bearer token de solo lectura

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
// Por defecto escribe en public/ (build-time). En runtime, el hook de nginx
// setea PROJECTS_OUT para escribir directo en la carpeta que sirve nginx.
const OUT = process.env.PROJECTS_OUT || path.join(ROOT, 'public', 'projects.json')
const FALLBACK = path.join(ROOT, 'projects.fallback.json')
const OVERRIDES = path.join(ROOT, 'projects.overrides.json')

const API_URL = process.env.COOLIFY_API_URL?.replace(/\/$/, '')
const TOKEN = process.env.COOLIFY_API_TOKEN

const ACCENTS = ['#7c5cff', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#fb923c']

async function readJson(file, def) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return def
  }
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function pickFqdn(item) {
  const raw = item?.fqdn ?? item?.fqdns ?? ''
  const first = String(raw).split(',').map((s) => s.trim()).find(Boolean)
  if (!first) return null
  return /^https?:\/\//i.test(first) ? first : `https://${first}`
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      console.error(`[fetch-projects] ${url} respondió ${res.status} ${res.statusText}`)
      return null
    }
    const data = await res.json()
    return Array.isArray(data) ? data : data?.data ?? data?.applications ?? null
  } catch (err) {
    console.error(`[fetch-projects] error de red en ${url}:`, err?.message ?? err)
    return null
  }
}

async function fetchFromCoolify() {
  if (!API_URL || !TOKEN) {
    console.warn('[fetch-projects] COOLIFY_API_URL o COOLIFY_API_TOKEN ausente — usando fallback')
    return null
  }
  const [apps, services] = await Promise.all([
    fetchJson(`${API_URL}/api/v1/applications`),
    fetchJson(`${API_URL}/api/v1/services`),
  ])
  if (apps === null && services === null) return null // API inaccesible → fallback
  return {
    apps: Array.isArray(apps) ? apps : [],
    services: Array.isArray(services) ? services : [],
  }
}

// kind: 'application' | 'service'. Los services son opt-in (override.show === true).
function buildProject(item, kind, overrides) {
  const rawName = item.name ?? item.uuid ?? kind
  const slug = slugify(rawName)
  const ov = overrides[slug] ?? {}
  if (kind === 'service' && ov.show !== true) return null // service no curado → oculto
  const link = ov.link !== false // por defecto la card es clickeable; "link": false = sólo exhibición
  const url = ov.url ?? pickFqdn(item)
  if (link && !url) return null // si es clickeable necesita destino público
  return {
    slug,
    name: ov.name ?? rawName,
    tagline: ov.tagline ?? item.description ?? '',
    url: url ?? null, // en cards sin link, sólo se usa para el estado "online"
    tech: Array.isArray(ov.tech) ? ov.tech : [],
    accent: ov.accent ?? null, // se asigna abajo si no hay override
    kind,
    link,
  }
}

async function main() {
  const data = await fetchFromCoolify()
  let projects
  let source

  if (data && (data.apps.length > 0 || data.services.length > 0)) {
    const overrides = await readJson(OVERRIDES, {})
    const raw = [
      ...data.apps.map((item) => ({ item, kind: 'application' })),
      ...data.services.map((item) => ({ item, kind: 'service' })),
    ]
    projects = raw
      .map(({ item, kind }) => buildProject(item, kind, overrides))
      .filter(Boolean)
      .map((p, i) => ({ ...p, accent: p.accent ?? ACCENTS[i % ACCENTS.length] }))
    source = 'coolify'
    const apps = projects.filter((p) => p.kind === 'application').length
    const svcs = projects.filter((p) => p.kind === 'service').length
    console.log(`[fetch-projects] ${projects.length} proyectos desde Coolify (${apps} apps, ${svcs} services curados)`)
    if (projects.length > 0) {
      console.log('[fetch-projects] slugs detectados:', projects.map((p) => `${p.slug}(${p.kind})`).join(', '))
    }
  } else {
    const fallback = await readJson(FALLBACK, { projects: [] })
    projects = Array.isArray(fallback) ? fallback : fallback.projects ?? []
    source = 'fallback'
    console.log(`[fetch-projects] usando fallback (${projects.length} proyectos)`)
  }

  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(
    OUT,
    JSON.stringify({ projects, source, generatedAt: new Date().toISOString() }, null, 2),
  )
  console.log(`[fetch-projects] escrito ${path.relative(ROOT, OUT)}`)
}

main().catch((err) => {
  console.error('[fetch-projects] fatal:', err)
  // No queremos romper el build por esto
  process.exit(0)
})
