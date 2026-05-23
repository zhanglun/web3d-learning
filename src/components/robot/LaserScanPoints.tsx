import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '../../store/robotStore'
import { scanToPoints } from './scanUtils'

export function LaserScanPoints() {
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const scan = useRobotStore(s => s.scan)

  useEffect(() => {
    if (!scan || !geoRef.current) return
    const positions = scanToPoints(scan)
    geoRef.current.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    )
    geoRef.current.attributes.position.needsUpdate = true
  }, [scan])

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial color="#ff4444" size={0.03} sizeAttenuation />
    </points>
  )
}
