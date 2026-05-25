// src/components/annotator/PointCloud.tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useAnnotatorStore } from './annotatorStore'

export function PointCloud() {
  const geoRef = useRef<THREE.BufferGeometry>(null!)
  const pointCloud = useAnnotatorStore((s) => s.pointCloud)

  useEffect(() => {
    if (!pointCloud || !geoRef.current) return
    geoRef.current.setAttribute('position', new THREE.BufferAttribute(pointCloud, 3))
    geoRef.current.computeBoundingSphere()
  }, [pointCloud])

  if (!pointCloud) return null

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial color="#88ccff" size={0.05} sizeAttenuation />
    </points>
  )
}
