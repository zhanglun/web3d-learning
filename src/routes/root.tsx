import { Outlet, Link, useLocation, useMatch } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

const ROUTE_NAMES: Record<string, string> = {
  '/basic': 'Basic',
  '/geometry': 'Geometry',
  '/vector': 'Vector',
  '/texture': 'Texture',
  '/gltf': 'GLTF',
  '/circular-arc': 'Circular Arc',
  '/kid': 'Kid',
  '/solar-system': 'Solar System',
  '/robot': 'Robot Demo',
  '/annotator': 'Point Cloud Annotator',
  '/armdeck': 'ArmDeck',
  '/armdeck/phase1': 'ArmDeck — Phase 1',
  '/armdeck/phase2': 'ArmDeck — Phase 2',
  '/armdeck/phase3': 'ArmDeck — Phase 3',
  '/armdeck/phase4': 'ArmDeck — Phase 4',
}

export default function Root() {
  const isHome = useMatch({ path: '/', end: true })
  const { pathname } = useLocation()

  if (isHome) {
    return <Outlet />
  }

  const demoName = ROUTE_NAMES[pathname] ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <div style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px 0 16px',
        gap: 10,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}>
        <Link
          to="/"
          style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}
        >
          ← Home
        </Link>
        {demoName && (
          <>
            <span style={{ color: 'var(--border-strong)', fontSize: 12, userSelect: 'none' }}>·</span>
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{demoName}</span>
          </>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle size={28} />
        </div>
      </div>
      <div id="detail" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  )
}
