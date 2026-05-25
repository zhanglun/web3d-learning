// src/routes/annotator.tsx
import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { View, OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei'
import { PointCloud } from '../components/annotator/PointCloud'
import { useAnnotatorStore } from '../components/annotator/annotatorStore'

export default function AnnotatorRoute() {
  const perspRef = useRef<HTMLDivElement>(null!)
  const bevRef   = useRef<HTMLDivElement>(null!)

  const loadSample = useAnnotatorStore((s) => s.loadSample)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
                  background: '#0d0d1a', gap: 8, padding: 8, boxSizing: 'border-box' }}>

      {/* Temporary load button until Toolbar is built */}
      <div style={{ color: '#fff', fontSize: 12 }}>
        <button onClick={() => loadSample()} style={{ marginRight: 8 }}>Load Sample</button>
        Annotator
      </div>

      {/* Viewport row */}
      <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0 }}>
        <div ref={perspRef} style={{ flex: 1, borderRadius: 8, overflow: 'hidden' }} />
        <div ref={bevRef}   style={{ flex: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }} />
      </div>

      {/* Full-page Canvas — pointer-events off, events delegated via eventSource */}
      <Canvas
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                 pointerEvents: 'none' }}
        eventSource={document.getElementById('root') as HTMLElement}
        gl={{ alpha: true }}
      >
        <View track={perspRef}>
          <PerspectiveCamera makeDefault position={[0, 6, 10]} fov={60} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1} />
          <OrbitControls makeDefault />
          <Grid args={[20, 20] as [number, number]} cellSize={0.5} cellColor="#1e1e3a"
                sectionSize={2} sectionColor="#333366" fadeDistance={20} />
          <PointCloud />
        </View>

        <View track={bevRef}>
          <ambientLight intensity={1} />
          <PointCloud />
        </View>
      </Canvas>
    </div>
  )
}
