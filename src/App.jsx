import { useEffect, useMemo, useState } from 'react'
import './App.css'

const BUILD_TIME = new Date().toISOString()

function useUptime() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const start = useMemo(() => Date.now(), [])
  const ms = now - start
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 60
  const h = Math.floor(ms / 3600000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function StatusDot({ state }) {
  return <span className={`dot dot--${state}`} aria-hidden />
}

function Card({ title, children, accent }) {
  return (
    <section className="card" style={accent ? { '--accent': accent } : undefined}>
      <header className="card__header">
        <h3>{title}</h3>
      </header>
      <div className="card__body">{children}</div>
    </section>
  )
}

function Stat({ label, value, mono }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className={`stat__value ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  )
}

export default function App() {
  const uptime = useUptime()
  const [latency, setLatency] = useState(null)
  const [pinging, setPinging] = useState(false)
  const [counter, setCounter] = useState(0)
  const [theme, setTheme] = useState('aurora')

  async function ping() {
    setPinging(true)
    const t0 = performance.now()
    try {
      await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
      setLatency(Math.max(1, Math.round(performance.now() - t0)))
    } catch {
      setLatency(-1)
    } finally {
      setPinging(false)
    }
  }

  useEffect(() => { ping() }, [])

  const env = import.meta.env
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '—'

  return (
    <div className={`app theme-${theme}`}>
      <div className="bg-grid" aria-hidden />

      <header className="nav">
        <div className="brand">
          <span className="brand__logo">JJ</span>
          <div>
            <strong>app-test</strong>
            <small>jjpiriz.com.ar</small>
          </div>
        </div>
        <nav className="nav__links">
          <a href="https://jjpiriz.com.ar" target="_blank" rel="noreferrer">jjpiriz.com.ar</a>
          <a href="https://coolify.io" target="_blank" rel="noreferrer">Coolify</a>
          <a href="https://vitejs.dev" target="_blank" rel="noreferrer">Vite</a>
        </nav>
      </header>

      <main className="hero">
        <div className="hero__copy">
          <span className="pill">
            <StatusDot state="ok" /> servidor coolify · banco de pruebas
          </span>
          <h1>
            Si estás viendo esto, el deploy en <span className="grad">Coolify</span> funciona.
          </h1>
          <p className="lead">
            Página de verificación rápida para mi nuevo MegaServer. Confirma que el build de
            React + Vite, el contenedor y el reverse proxy están sirviendo correctamente sobre
            HTTPS.
          </p>
          <div className="cta">
            <button className="btn btn--primary" onClick={ping} disabled={pinging}>
              {pinging ? 'Pingueando…' : 'Re-test conexión'}
            </button>
            <button className="btn" onClick={() => setCounter((c) => c + 1)}>
              Hidratación React: {counter}
            </button>
            <button className="btn btn--ghost" onClick={() => setTheme(theme === 'aurora' ? 'sunset' : 'aurora')}>
              Cambiar tema
            </button>
          </div>
        </div>

        <div className="hero__panel">
          <div className="terminal">
            <div className="terminal__bar">
              <span /><span /><span />
              <em>~/megaserver — coolify deploy</em>
            </div>
            <pre className="terminal__body">
{`$ docker ps --filter name=app-test
✓ container running
✓ healthcheck passing
✓ traefik route → app-test.jjpiriz.com.ar
✓ TLS handshake OK

$ uptime
${uptime}

$ echo "ready to break things 🚀"`}
            </pre>
          </div>
        </div>
      </main>

      <section className="grid">
        <Card title="Servidor" accent="#7c5cff">
          <Stat label="Estado"
                value={<><StatusDot state={latency === -1 ? 'err' : 'ok'} /> {latency === -1 ? 'sin respuesta' : 'online'}</>} />
          <Stat label="Latencia HEAD" value={latency == null ? '—' : latency === -1 ? 'error' : `${latency} ms`} mono />
          <Stat label="Uptime sesión" value={uptime} mono />
          <Stat label="Host" value={typeof window !== 'undefined' ? window.location.host : '—'} mono />
        </Card>

        <Card title="Build" accent="#22d3ee">
          <Stat label="Modo" value={env.MODE} mono />
          <Stat label="Producción" value={env.PROD ? 'sí' : 'no'} />
          <Stat label="Vite" value={env.VITE_VERSION || 'runtime'} />
          <Stat label="Build time" value={BUILD_TIME} mono />
        </Card>

        <Card title="Cliente" accent="#34d399">
          <Stat label="Idioma" value={typeof navigator !== 'undefined' ? navigator.language : '—'} />
          <Stat label="Pantalla" value={typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '—'} mono />
          <Stat label="UA" value={<code className="ua">{userAgent}</code>} />
        </Card>

        <Card title="Stack" accent="#fbbf24">
          <ul className="chips">
            <li>React 18</li>
            <li>Vite 5</li>
            <li>Docker</li>
            <li>nginx</li>
            <li>Coolify</li>
            <li>Traefik</li>
          </ul>
          <p className="muted small">
            Imagen multi-stage: build en Node 20 alpine, sirve con nginx alpine.
          </p>
        </Card>
      </section>

      <footer className="foot">
        <span>© {new Date().getFullYear()} jjpiriz.com.ar · MegaServer</span>
        <span className="muted">deploy: <code>{BUILD_TIME}</code></span>
      </footer>
    </div>
  )
}
