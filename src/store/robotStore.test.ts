import { describe, it, expect, beforeEach } from 'vitest'
import { useRobotStore } from './robotStore'
import type { OdometryMessage, LaserScanMessage } from '../components/robot/types'

const resetStore = () =>
  useRobotStore.setState({
    ros: null, connected: false, odom: null, scan: null,
    maxLinearSpeed: 0.2, maxAngularSpeed: 1.0,
  })

describe('robotStore', () => {
  beforeEach(resetStore)

  it('初始状态：未连接，无数据', () => {
    const s = useRobotStore.getState()
    expect(s.ros).toBeNull()
    expect(s.connected).toBe(false)
    expect(s.odom).toBeNull()
    expect(s.scan).toBeNull()
    expect(s.maxLinearSpeed).toBe(0.2)
    expect(s.maxAngularSpeed).toBe(1.0)
  })

  it('setOdom 更新 odom 状态', () => {
    const msg: OdometryMessage = {
      pose: { pose: { position: { x: 1, y: 2, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } },
      twist: { twist: { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } } },
    }
    useRobotStore.getState().setOdom(msg)
    expect(useRobotStore.getState().odom?.pose.pose.position.x).toBe(1)
    expect(useRobotStore.getState().odom?.pose.pose.position.y).toBe(2)
  })

  it('setScan 更新 scan 状态', () => {
    const msg: LaserScanMessage = {
      angle_min: 0, angle_max: Math.PI, angle_increment: 0.01,
      range_min: 0.1, range_max: 10, ranges: [1.0, 2.0, 3.0],
    }
    useRobotStore.getState().setScan(msg)
    expect(useRobotStore.getState().scan?.ranges.length).toBe(3)
  })

  it('setMaxLinearSpeed 更新速度上限', () => {
    useRobotStore.getState().setMaxLinearSpeed(0.5)
    expect(useRobotStore.getState().maxLinearSpeed).toBe(0.5)
  })

  it('setMaxAngularSpeed 更新角速度上限', () => {
    useRobotStore.getState().setMaxAngularSpeed(1.5)
    expect(useRobotStore.getState().maxAngularSpeed).toBe(1.5)
  })
})
