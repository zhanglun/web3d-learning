import type { LaserScanMessage } from './types'

export function scanToPoints(scan: LaserScanMessage): Float32Array {
  const positions: number[] = []
  for (let i = 0; i < scan.ranges.length; i++) {
    const r = scan.ranges[i]
    if (!isFinite(r) || r < scan.range_min || r > scan.range_max) continue
    const angle = scan.angle_min + i * scan.angle_increment
    // ROS coords (x=forward, y=left, z=up) → Three.js (x=right, y=up, z=toward viewer)
    positions.push(r * Math.cos(angle), 0, -r * Math.sin(angle))
  }
  return new Float32Array(positions)
}
