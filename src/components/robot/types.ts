export interface RosPose {
  position: { x: number; y: number; z: number }
  orientation: { x: number; y: number; z: number; w: number }
}

export interface OdometryMessage {
  pose: { pose: RosPose }
  twist: {
    twist: {
      linear: { x: number; y: number; z: number }
      angular: { x: number; y: number; z: number }
    }
  }
}

export interface LaserScanMessage {
  angle_min: number
  angle_max: number
  angle_increment: number
  range_min: number
  range_max: number
  ranges: number[]
}
