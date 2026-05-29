import { create } from 'zustand'
import { Ros } from 'roslib'
import type { OdometryMessage, LaserScanMessage } from '../components/robot/types'

interface RobotStore {
  ros: Ros | null
  connected: boolean
  odom: OdometryMessage | null
  scan: LaserScanMessage | null
  maxLinearSpeed: number
  maxAngularSpeed: number
  connect: (url: string) => void
  disconnect: () => void
  setOdom: (data: OdometryMessage) => void
  setScan: (data: LaserScanMessage) => void
  setMaxLinearSpeed: (v: number) => void
  setMaxAngularSpeed: (v: number) => void
}

export const useRobotStore = create<RobotStore>((set, get) => ({
  ros: null,
  connected: false,
  odom: null,
  scan: null,
  maxLinearSpeed: 0.2,
  maxAngularSpeed: 1.0,

  connect: (url: string) => {
    const ros = new Ros({ url })
    ros.on('connection', () => set({ connected: true }))
    ros.on('error', () => set({ connected: false }))
    ros.on('close', () => set({ connected: false, ros: null }))
    set({ ros })
  },

  disconnect: () => {
    get().ros?.close()
    set({ ros: null, connected: false, odom: null, scan: null })
  },

  setOdom: (data) => set({ odom: data }),
  setScan: (data) => set({ scan: data }),
  setMaxLinearSpeed: (v) => set({ maxLinearSpeed: v }),
  setMaxAngularSpeed: (v) => set({ maxAngularSpeed: v }),
}))
