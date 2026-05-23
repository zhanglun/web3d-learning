import { describe, it, expect } from 'vitest'
import { scanToPoints } from './scanUtils'

describe('scanToPoints', () => {
  it('converts a single valid forward range to (r, 0, 0)', () => {
    const scan = {
      angle_min: 0, angle_max: 0, angle_increment: 0,
      range_min: 0.1, range_max: 10, ranges: [2.0],
    }
    const pts = scanToPoints(scan)
    expect(pts.length).toBe(3)
    expect(pts[0]).toBeCloseTo(2.0) // x
    expect(pts[1]).toBeCloseTo(0)   // y (always 0)
    expect(pts[2]).toBeCloseTo(0)   // z (-sin(0)*r = 0)
  })

  it('filters out Infinity values', () => {
    const scan = {
      angle_min: 0, angle_max: 0, angle_increment: 0,
      range_min: 0.1, range_max: 10, ranges: [Infinity, 1.0],
    }
    const pts = scanToPoints(scan)
    expect(pts.length).toBe(3) // only second point
  })

  it('filters out values exceeding range_max', () => {
    const scan = {
      angle_min: 0, angle_max: 0, angle_increment: 0,
      range_min: 0.1, range_max: 5, ranges: [10.0],
    }
    const pts = scanToPoints(scan)
    expect(pts.length).toBe(0)
  })

  it('filters out values below range_min', () => {
    const scan = {
      angle_min: 0, angle_max: 0, angle_increment: 0,
      range_min: 0.5, range_max: 10, ranges: [0.1],
    }
    const pts = scanToPoints(scan)
    expect(pts.length).toBe(0)
  })

  it('converts angle 90deg (left in ROS) to negative z in Three.js', () => {
    const scan = {
      angle_min: Math.PI / 2, angle_max: Math.PI / 2, angle_increment: 0,
      range_min: 0.1, range_max: 10, ranges: [1.0],
    }
    const pts = scanToPoints(scan)
    expect(pts[0]).toBeCloseTo(0)   // x = cos(90°) * 1 ≈ 0
    expect(pts[1]).toBeCloseTo(0)   // y
    expect(pts[2]).toBeCloseTo(-1)  // z = -sin(90°) * 1 = -1
  })

  it('returns empty Float32Array for empty ranges', () => {
    const scan = {
      angle_min: 0, angle_max: 0, angle_increment: 0,
      range_min: 0.1, range_max: 10, ranges: [],
    }
    const pts = scanToPoints(scan)
    expect(pts.length).toBe(0)
    expect(pts).toBeInstanceOf(Float32Array)
  })
})
