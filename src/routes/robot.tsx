import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { ConnectionPanel } from '../components/robot/ConnectionPanel'
import { RosSubscriber } from '../components/robot/RosSubscriber'
import { RobotModel } from '../components/robot/RobotModel'
import { LaserScanPoints } from '../components/robot/LaserScanPoints'
import { ControlPanel } from '../components/robot/ControlPanel'

export default function RobotRoute() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0d0d1a',
      gap: 8,
      padding: 8,
      boxSizing: 'border-box',
    }}>
      <ConnectionPanel />
      <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', minHeight: 0 }}>
        <Canvas camera={{ position: [0, 4, 6], fov: 60 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1} />
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellColor="#1e1e3a"
            sectionSize={2}
            sectionColor="#333366"
            fadeDistance={20}
          />
          <RosSubscriber />
          <RobotModel />
          <LaserScanPoints />
          <OrbitControls makeDefault />
        </Canvas>
      </div>
      <ControlPanel />
    </div>
  )
}
