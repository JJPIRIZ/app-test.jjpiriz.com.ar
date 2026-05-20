// scripts/fetch-projects.mjs
//
// Build-time: llama a Coolify API y genera public/projects.json.
// Si falla (sin env vars, API caída, etc.), usa projects.fallback.json.
// Nunca hace fallar el build — el lab siempre arranca con algo.
//
// Env vars esperadas (Coolify "Build Variables" con "Is Build Time" = on):
//   COOLIFY_API_URL    — ej: https://coolify.jjpiriz.com.ar
//   COOLIFY_API_TOKEN  — bearer token de solo lectura

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'projects.json')
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

function pickFqdn(app) {
  const raw = app?.fqdn ?? app?.fqdns ?? ''
  const first = String(raw).split(',').map((s) => s.trim()).find(Boolean)
  if (!first) return null
  return /^https?:\/\//i.test(first) ? first : `https://${first}`
}

async function fetchFromCoolify() {
  if (!API_URL || !TOKEN) {
    console.warn('[fetch-projects] COOLIFY_API_URL o COOLIFY_API_TOKEN ausente — usando fallback')
    return null
  }
  const url = `${API_URL}/api/v1/applications`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      console.error(`[fetch-projects] Coolify respondió ${res.status} ${res.statusText}`)
      return null
    }
    const data = await res.json()
    return Array.isArray(data) ? data : data?.data ?? data?.applications ?? null
  } catch (err) {
    console.error('[fetch-projects] error de red:', err?.message ?? err)
    return null
  }
}

function transform(apps, overrides) {
  return apps
    .map((app, i) => {
      const rawName = app.name ?? app.uuid ?? `app-${i}`
      const slug = slugify(rawName)
      const url = pickFqdn(app)
      if (!url) return null // sin dominio público, no la mostramos
      const ov = overrides[slug] ?? {}
      return {
        slug,
        name: ov.name ?? rawName,
        tagline: ov.tagline ?? app.description ?? '',
        url,
        tech: Array.isArray(ov.tech) ? ov.tech : [],
        accent: ov.accent ?? ACCENTS[i % ACCENTS.length],
      }
    })
    .filter(Boolean)
}

async function main() {
  const apps = await fetchFromCoolify()
  let projects
  let source

  if (Array.isArray(apps) && apps.length > 0) {
    const overrides = await readJson(OVERRIDES, {})
    projects = transform(apps, overrides)
    source = 'coolify'
    console.log(`[fetch-projects] ${projects.length} apps desde Coolify`)
    if (projects.length > 0) {
      console.log('[fetch-projects] slugs detectados:', projects.map((p) => p.slug).join(', '))
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
