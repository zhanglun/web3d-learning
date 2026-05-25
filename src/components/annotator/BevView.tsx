import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrthographicCamera, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { PointCloud } from './PointCloud'
import { AnnotationBox3D } from './AnnotationBox3D'
import { useAnnotatorStore } from './annotatorStore'

interface Props {
  cameraRef: React.RefObject<THREE.OrthographicCamera | null>
}

function CameraCapture({ cameraRef }: Props) {
  const { camera } = useThree()
  useEffect(() => {
    cameraRef.current = camera as THREE.OrthographicCamera
  }, [camera, cameraRef])
  return null
}

export function BevView({ cameraRef }: Props) {
  const boxes = useAnnotatorStore((s) => s.boxes)

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 20, 0]} up={[0, 0, -1]} zoom={30} />
      <CameraCapture cameraRef={cameraRef} />
      <ambientLight intensity={1} />
      <OrbitControls
        makeDefault
        enableRotate={false}
        mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 0 } as any}
      />
      <PointCloud />
      {boxes.map((box) => (
        <AnnotationBox3D key={box.id} box={box} />
      ))}
    </>
  )
}
