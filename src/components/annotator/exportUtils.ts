// src/components/annotator/exportUtils.ts
import type { AnnotationBox } from './types'

export interface CustomExport {
  version: string
  annotations: Array<{
    id: string
    label: string
    position: { x: number; y: number; z: number }
    size: { width: number; depth: number; height: number }
    rotation_yaw: number
  }>
}

export interface NuScenesAnnotation {
  token: string
  translation: [number, number, number]
  size: [number, number, number]
  rotation: [number, number, number, number]  // [qw, qx, qy, qz]
  category_name: string
  velocity: [number, number]
}

export function toCustomJson(boxes: AnnotationBox[]): CustomExport {
  return {
    version: '1.0',
    annotations: boxes.map((b) => ({
      id: b.id,
      label: b.label,
      position: { x: b.position[0], y: b.position[1], z: b.position[2] },
      size: { width: b.size[0], depth: b.size[1], height: b.size[2] },
      rotation_yaw: b.rotation,
    })),
  }
}

export function toNuScenes(boxes: AnnotationBox[]): NuScenesAnnotation[] {
  return boxes.map((b) => {
    const qw = Math.cos(b.rotation / 2)
    const qz = Math.sin(b.rotation / 2)
    return {
      token: b.id,
      translation: [...b.position] as [number, number, number],
      size: [...b.size] as [number, number, number],
      rotation: [qw, 0, 0, qz],
      category_name: b.label || 'unknown',
      velocity: [0, 0],
    }
  })
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
