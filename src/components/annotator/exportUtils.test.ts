// src/components/annotator/exportUtils.test.ts
import { describe, it, expect } from 'vitest'
import { toCustomJson, toNuScenes } from './exportUtils'
import type { AnnotationBox } from './types'

const box: AnnotationBox = {
  id: 'test-id',
  label: 'car',
  position: [1, 0.75, -3],
  size: [2, 4, 1.5],
  rotation: Math.PI / 4,
}

describe('toCustomJson', () => {
  it('maps all fields correctly', () => {
    const result = toCustomJson([box])
    expect(result.version).toBe('1.0')
    const ann = result.annotations[0]
    expect(ann.id).toBe('test-id')
    expect(ann.label).toBe('car')
    expect(ann.position).toEqual({ x: 1, y: 0.75, z: -3 })
    expect(ann.size).toEqual({ width: 2, depth: 4, height: 1.5 })
    expect(ann.rotation_yaw).toBeCloseTo(Math.PI / 4)
  })

  it('returns empty annotations array for no boxes', () => {
    expect(toCustomJson([]).annotations).toHaveLength(0)
  })
})

describe('toNuScenes', () => {
  it('identity quaternion for yaw=0', () => {
    const result = toNuScenes([{ ...box, rotation: 0 }])
    const [qw, , , qz] = result[0].rotation
    expect(qw).toBeCloseTo(1)
    expect(qz).toBeCloseTo(0)
  })

  it('correct quaternion for yaw=PI/2', () => {
    const result = toNuScenes([{ ...box, rotation: Math.PI / 2 }])
    const [qw, , , qz] = result[0].rotation
    expect(qw).toBeCloseTo(Math.cos(Math.PI / 4))
    expect(qz).toBeCloseTo(Math.sin(Math.PI / 4))
  })

  it('uses "unknown" as category_name for empty label', () => {
    const result = toNuScenes([{ ...box, label: '' }])
    expect(result[0].category_name).toBe('unknown')
  })

  it('returns empty array for no boxes', () => {
    expect(toNuScenes([])).toHaveLength(0)
  })
})
