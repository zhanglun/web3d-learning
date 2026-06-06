import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      overflowY: 'auto',
      background: 'var(--bg)',
      color: 'var(--text-2)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '52px 52px 72px',
      boxSizing: 'border-box',
    }}>

      <header style={{ marginBottom: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.3px', marginBottom: 8 }}>
            Web3D Learning
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Three.js · React Three Fiber · ROS2 · Robotics
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Robotics section */}
      <section style={{ marginBottom: 60 }}>
        <SectionLabel label="Robotics Portfolio" color="var(--accent)" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
          <PortfolioCard
            icon="🤖"
            title="Robot Demo"
            description="Real-time ROS2 mobile robot — odometry visualization, 360° laser scan, virtual joystick control"
            tags={['rosbridge v2', 'nav_msgs/Odometry', 'sensor_msgs/LaserScan', 'cmd_vel']}
            onClick={() => navigate('/robot')}
          />
          <PortfolioCard
            icon="📦"
            title="Point Cloud Annotator"
            description="Load PCD files, place 3D bounding boxes with transform handles, bird-eye BEV view, export JSON / nuScenes"
            tags={['PCD Parser', 'TransformControls', 'BEV', 'nuScenes export']}
            onClick={() => navigate('/annotator')}
          />
        </div>

        <ArmDeckCard onNavigate={navigate} />
      </section>

      {/* Basics section */}
      <section>
        <SectionLabel label="Three.js Exercises" color="var(--border-strong)" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Basic', href: '/basic' },
            { label: 'Geometry', href: '/geometry' },
            { label: 'Vector', href: '/vector' },
            { label: 'Texture', href: '/texture' },
            { label: 'GLTF', href: '/gltf' },
            { label: 'Circular Arc', href: '/circular-arc' },
            { label: 'Kid', href: '/kid' },
            { label: 'Solar System', href: '/solar-system' },
          ].map(({ label, href }) => (
            <MiniCard key={href} label={label} onClick={() => navigate(href)} />
          ))}
        </div>
      </section>

    </div>
  )
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

function PortfolioCard({ icon, title, description, tags, onClick }: {
  icon: string
  title: string
  description: string
  tags: string[]
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '20px 22px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>{description}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {tags.map(t => <Tag key={t} label={t} />)}
      </div>
    </div>
  )
}

function ArmDeckCard({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => onNavigate('/armdeck')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '20px 22px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 12 }}>🦾</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>ArmDeck</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>
        Robotic arm teleop platform — URDF loading, inverse kinematics, trajectory recording, full ROS2 hardware integration
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {['URDF', 'closed-chain-ik', 'Foxglove WS', 'CDR binary', 'IndexedDB', 'TF Visualizer'].map(t => (
          <Tag key={t} label={t} />
        ))}
      </div>
    </div>
  )
}

function MiniCard({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '7px 14px',
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 7,
        cursor: 'pointer',
        fontSize: 13,
        color: hovered ? 'var(--text-1)' : 'var(--text-3)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 11,
      padding: '2px 8px',
      background: 'var(--tag-bg)',
      color: 'var(--tag-fg)',
      border: '1px solid var(--tag-border)',
      borderRadius: 4,
    }}>
      {label}
    </span>
  )
}
