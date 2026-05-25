// src/routes/annotator.tsx
import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { View, OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { PointCloud } from '../components/annotator/PointCloud'
import { AnnotationBox3D } from '../components/annotator/AnnotationBox3D'
import { useAnnotatorStore } from '../components/annotator/annotatorStore'
import { BevView } from '../components/annotator/BevView'
import { BevOverlay } from '../components/annotator/BevOverlay'
import { BoxList } from '../components/annotator/BoxList'
import { Toolbar } from '../components/annotator/Toolbar'

export default function AnnotatorRoute() {
  const perspRef = useRef<HTMLDivElement>(null!)
  const bevRef   = useRef<HTMLDivElement>(null!)
  const bevCameraRef = useRef<THREE.OrthographicCamera | null>(null)

  const orbitRef = useRef<any>(null)
  const boxes    = useAnnotatorStore((s) => s.boxes)
  const selectBox = useAnnotatorStore((s) => s.selectBox)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
                  background: '#0d0d1a', gap: 8, padding: 8, boxSizing: 'border-box' }}>

      <Toolbar />

      {/* Viewport row */}
      <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0 }}>
        <div ref={perspRef} style={{ flex: 1, borderRadius: 8, overflow: 'hidden' }} />
        <div ref={bevRef}   style={{ flex: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          <BevOverlay containerRef={bevRef} cameraRef={bevCameraRef} />
        </div>
      </div>

      {/* Box list */}
      <BoxList />

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
          <OrbitControls ref={orbitRef} makeDefault />
          <Grid args={[20, 20] as [number, number]} cellSize={0.5} cellColor="#1e1e3a"
                sectionSize={2} sectionColor="#333366" fadeDistance={20} />
          <PointCloud />
          <mesh
            visible={false}
            scale={[100, 1, 100]}
            position={[0, -0.1, 0]}
            onClick={() => selectBox(null)}
          >
            <planeGeometry />
          </mesh>
          {boxes.map((box) => (
            <AnnotationBox3D
              key={box.id}
              box={box}
              showTransformControls
              orbitRef={orbitRef}
            />
          ))}
        </View>

        <View track={bevRef}>
          <BevView cameraRef={bevCameraRef} />
        </View>
      </Canvas>
    </div>
  )
}
