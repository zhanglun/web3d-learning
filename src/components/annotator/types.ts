// src/components/annotator/types.ts
export interface AnnotationBox {
  id: string
  position: [number, number, number]  // center x, y, z in Three.js world coords
  size: [number, number, number]       // [width(X), depth(Z), height(Y)] in meters
  rotation: number                     // yaw around Y axis, in radians
  label: string
}

export interface AnnotatorState {
  pointCloud: Float32Array | null      // flat [x,y,z, x,y,z, ...] array
  boxes: AnnotationBox[]
  selectedId: string | null
  mode: 'view' | 'annotate'
}
