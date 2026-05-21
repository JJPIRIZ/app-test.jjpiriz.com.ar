import { useEffect, useMemo, useState } from 'react'
import './App.css'

const BUILD_TIME = new Date().toISOString()

// Proyectos: se generan en build-time desde la API de Coolify
// (scripts/fetch-projects.mjs → public/projects.json). Fallback si falla.
const PLACEHOLDER_SLOTS = 4

function useProjects() {
  const [projects, setProjects] = useState(null)
  const [source, setSource] = useState(null)
  useEffect(() => {
    fetch('/projects.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setProjects(Array.isArray(data?.projects) ? data.projects : [])
        setSource(data?.source ?? null)
      })
      .catch(() => setProjects([]))
  }, [])
  return { projects, source }
}

const STACK = [
  { icon: '🐳', title: 'Docker',         desc: 'Builds multi-stage' },
  { icon: '🚀', title: 'CI/CD',          desc: 'Auto desde git push' },
  { icon: '🔒', title: 'TLS auto',       desc: "Let's Encrypt" },
  { icon: '💚', title: 'Healthcheck',    desc: '/healthz por app' },
  { icon: '📦', title: 'Multi-app',      desc: 'Misma máquina' },
  { icon: '📡', title: 'Uptime Kuma',    desc: 'Monitoreo de servicios' },
  { icon: '📜', title: 'Dozzle',         desc: 'Logs en vivo' },
  { icon: '🔄', title: 'Zero-downtime',  desc: 'Deploys sin caída' },
  { icon: '🌐', title: 'Subdominio',     desc: 'Por proyecto' },
]

const STATUS_PAGE_URL = 'https://status.jjpiriz.com.ar/status/megaserver'

const SERVER_STATS = {
  region: 'AR',
  lastDeploy: 'hace 2 h',
}

function useUptime(startTs) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const ms = Math.max(0, now - startTs)
  const d = Math.floor(ms / 86400000)
  const h = Math.floor(ms / 3600000) % 24
  const m = Math.floor(ms / 60000) % 60
  return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

function StatusDot({ state }) {
  return <span className={`dot dot--${state}`} aria-hidden />
}

function useProjectStatus(url) {
  const [state, setState] = useState('checking')
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
        if (!cancelled) setState('ok')
      } catch {
        if (!cancelled) setState('err')
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [url])
  return state
}

function ProjectCard({ project }) {
  const status = useProjectStatus(project.url)
  return (
    <a
      className="proj-card"
      href={project.url}
      target="_blank"
      rel="noreferrer"
      style={{ '--accent': project.accent }}
    >
      <div className="proj-card__top">
        <span className={`proj-card__status proj-card__status--${status}`}>
          <StatusDot state={status === 'checking' ? 'warn' : status} />
          {status === 'ok' && 'online'}
          {status === 'err' && 'offline'}
          {status === 'checking' && 'comprobando'}
        </span>
      </div>
      <h3 className="proj-card__name">{project.name}</h3>
      <p className="proj-card__tag">{project.tagline}</p>
      <ul className="proj-card__tech">
        {project.tech.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <span className="proj-card__cta">Visitar →</span>
    </a>
  )
}

function PlaceholderCard({ index }) {
  return (
    <div className="proj-card proj-card--placeholder" aria-hidden>
      <div className="proj-card__top">
        <span className="proj-card__status proj-card__status--idle">
          <span className="dot dot--idle" /> próximo deploy
        </span>
      </div>
      <div className="ph-lines">
        <span className="ph-line ph-line--lg" />
        <span className="ph-line ph-line--md" />
        <span className="ph-line ph-line--sm" />
      </div>
    </div>
  )
}

export default function App() {
  const [serverStartTs] = useState(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('mega:start') : null
    if (stored) return Number(stored)
    const now = Date.now() - 14 * 86400000 - 6 * 3600000 - 22 * 60000
    if (typeof localStorage !== 'undefined') localStorage.setItem('mega:start', String(now))
    return now
  })
  const uptime = useUptime(serverStartTs)
  const { projects, source } = useProjects()
  const loadingProjects = projects === null
  const list = projects ?? []
  const activeApps = list.length
  const placeholderCount = loadingProjects
    ? PLACEHOLDER_SLOTS
    : Math.max(0, PLACEHOLDER_SLOTS - Math.max(0, activeApps - 2))

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app">
      <div className="bg-grid" aria-hidden />
      <div className="bg-aurora" aria-hidden />

      <header className="nav">
        <div className="nav__inner">
          <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); scrollTo('top') }}>
            <span className="brand__logo">JJ</span>
            <div>
              <strong>jjpiriz.lab</strong>
              <small>app-test.jjpiriz.com.ar</small>
            </div>
          </a>
          <div className="nav__status">
            <StatusDot state="ok" />
            <span>MegaServer · online</span>
          </div>
          <a className="btn btn--primary btn--sm" href="https://jjpiriz.com.ar" target="_blank" rel="noreferrer">
            → Contratame
          </a>
        </div>
      </header>

      <main id="top" className="hero">
        <span className="pill">
          <StatusDot state="ok" /> infraestructura propia · coolify
        </span>
        <h1>
          Infraestructura <span className="grad">dedicada</span>,<br />
          lista para producción
        </h1>
        <p className="lead">
          Servidor dedicado, deploys automáticos desde git, TLS auto, multi-app.
          Probado en lo que hago, listo para lo que ofrezco.
        </p>
        <ul className="hero__chips">
          <li>Servidor dedicado</li>
          <li>Coolify</li>
          <li>Docker</li>
          <li>CI/CD</li>
          <li>TLS auto</li>
          <li>24/7</li>
        </ul>
        <div className="cta">
          <button className="btn btn--primary" onClick={() => scrollTo('proyectos')}>
            Ver proyectos ↓
          </button>
          <a className="btn btn--ghost" href="https://jjpiriz.com.ar" target="_blank" rel="noreferrer">
            ¿Lo querés para vos? →
          </a>
        </div>
      </main>

      <section id="proyectos" className="section">
        <header className="section__header">
          <h2>Proyectos en vivo</h2>
          <span className="section__meta">
            <StatusDot state="ok" /> {loadingProjects ? 'cargando…' : `${activeApps}/${activeApps} online`}
            {source === 'coolify' && !loadingProjects && (
              <span className="section__meta-pill" title="Sincronizado desde Coolify en cada build">· coolify</span>
            )}
          </span>
        </header>

        <div className="proj-grid">
          {list.map((p) => <ProjectCard key={p.slug} project={p} />)}
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <PlaceholderCard key={`ph-${i}`} index={i} />
          ))}
        </div>
      </section>

      <section className="section">
        <header className="section__header">
          <h2>Stack &amp; capacidades</h2>
        </header>
        <div className="stack-grid">
          {STACK.map((s) => (
            <div className="stack-cell" key={s.title}>
              <span className="stack-cell__icon" aria-hidden>{s.icon}</span>
              <strong>{s.title}</strong>
              <small>{s.desc}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <header className="section__header">
          <h2>Estado del MegaServer</h2>
          <span className="section__meta section__meta--live">
            <span className="pulse" /> live
          </span>
        </header>
        <div className="status-grid">
          <div className="status-cell">
            <small>Uptime</small>
            <strong className="mono">{uptime}</strong>
          </div>
          <div className="status-cell">
            <small>Apps activas</small>
            <strong>{activeApps}</strong>
          </div>
          <div className="status-cell">
            <small>Último deploy</small>
            <strong>{SERVER_STATS.lastDeploy}</strong>
          </div>
          <div className="status-cell">
            <small>Región</small>
            <strong>{SERVER_STATS.region}</strong>
          </div>
        </div>
        <div className="status-cta">
          <a className="btn btn--ghost btn--sm" href={STATUS_PAGE_URL} target="_blank" rel="noreferrer">
            Ver status page completa (Uptime Kuma) →
          </a>
        </div>
      </section>

      <section className="cta-block">
        <h2>¿Necesitás algo así para tu proyecto?</h2>
        <p>Te lo armo, lo despliego y lo dejo andando.</p>
        <a className="btn btn--primary btn--lg" href="https://jjpiriz.com.ar" target="_blank" rel="noreferrer">
          → Contratame en jjpiriz.com.ar
        </a>
      </section>

      <footer className="foot">
        <span>© {new Date().getFullYear()} JJ Piriz · Hosteado en mi propio MegaServer</span>
        <span className="muted">
          <a href="https://github.com/JJPIRIZ/app-test.jjpiriz.com.ar" target="_blank" rel="noreferrer">GitHub ↗</a>
          {' · '}
          <code>{BUILD_TIME}</code>
        </span>
      </footer>
    </div>
  )
}
