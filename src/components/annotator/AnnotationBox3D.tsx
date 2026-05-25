import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { TransformControls } from '@react-three/drei'
import type { AnnotationBox } from './types'
import { useAnnotatorStore } from './annotatorStore'

interface Props {
  box: AnnotationBox
  showTransformControls?: boolean
  orbitRef?: React.RefObject<any>
}

export function AnnotationBox3D({ box, showTransformControls = false, orbitRef }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const selectedId = useAnnotatorStore((s) => s.selectedId)
  const selectBox  = useAnnotatorStore((s) => s.selectBox)
  const updateBox  = useAnnotatorStore((s) => s.updateBox)
  const isSelected = box.id === selectedId

  const [w, d, h] = box.size  // width(X), depth(Z), height(Y)

  const edgesGeo = useMemo(() => {
    const box3 = new THREE.BoxGeometry(w, h, d)  // THREE: (width, height, depth)
    const edges = new THREE.EdgesGeometry(box3)
    box3.dispose()
    return edges
  }, [w, d, h])

  useEffect(() => () => edgesGeo.dispose(), [edgesGeo])

  return (
    <>
      <group
        ref={groupRef}
        position={box.position}
        rotation={[0, box.rotation, 0]}
        onClick={(e) => { e.stopPropagation(); selectBox(box.id) }}
      >
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color={isSelected ? '#ffaa00' : '#44aaff'} />
        </lineSegments>
      </group>

      {showTransformControls && isSelected && (
        <TransformControls
          object={groupRef}
          onMouseDown={() => { if (orbitRef?.current) orbitRef.current.enabled = false }}
          onMouseUp={()   => { if (orbitRef?.current) orbitRef.current.enabled = true  }}
          onObjectChange={() => {
            const g = groupRef.current
            if (!g) return
            updateBox(box.id, {
              position: [g.position.x, g.position.y, g.position.z],
              rotation: g.rotation.y,
            })
          }}
        />
      )}
    </>
  )
}
