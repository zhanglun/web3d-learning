# ROS2 Web 机器人可视化与控制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 web3d-learning 项目中新增 `/robot` 路由，通过 rosbridge WebSocket 连接 ROS2 Gazebo 仿真，实现 TurtleBot3 的 3D 可视化（odom 位姿 + 激光点云）与浏览器端运动控制（虚拟摇杆发布 cmd_vel）。

**Architecture:** Zustand store 持有 ROSLIB.Ros 连接实例及话题数据；RosSubscriber 组件负责订阅 /odom 和 /scan 并写入 store；RobotModel 和 LaserScanPoints 只读 store 并渲染；VirtualJoystick 直接通过 ROSLIB.Topic.publish() 发布 /cmd_vel。

**Tech Stack:** React 19 + TypeScript, React Three Fiber, @react-three/drei, roslib (roslibjs), Zustand, Vitest (新增，用于 store 和 utils 测试)

---

## 文件结构

```
新增文件：
src/components/robot/types.ts          — ROS 消息类型定义
src/components/robot/scanUtils.ts      — LaserScan → Float32Array 坐标转换
src/components/robot/scanUtils.test.ts — scanUtils 单元测试
src/components/robot/ConnectionPanel.tsx
src/components/robot/RosSubscriber.tsx
src/components/robot/RobotModel.tsx
src/components/robot/LaserScanPoints.tsx
src/components/robot/VirtualJoystick.tsx
src/components/robot/ControlPanel.tsx
src/store/robotStore.ts                — Zustand store
src/store/robotStore.test.ts           — store 单元测试
src/routes/robot.tsx                   — 路由入口

修改文件：
src/main.tsx                           — 注册 /robot 路由
src/routes/root.tsx                    — 添加导航链接
vite.config.ts                         — 添加 vitest 配置
package.json                           — 添加 test 脚本
```

---

## Task 1: 安装依赖 + 配置 Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: 安装前端依赖**

```bash
cd /Users/zhanglun/Documents/mine/web3d-learning
pnpm add roslib zustand
pnpm add -D vitest @vitest/coverage-v8 jsdom @types/roslib
```

- [ ] **Step 2: 添加 test 脚本到 package.json**

在 `package.json` 的 `scripts` 中添加：

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 3: 更新 vite.config.ts 添加 vitest**

将 `vite.config.ts` 替换为：

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: 验证 Vitest 可运行**

```bash
pnpm test:run
```

预期输出：`No test files found` 或直接通过（不报错即可）

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts
git commit -m "feat(robot): install roslib, zustand, vitest"
```

---

## Task 2: 定义 ROS 消息类型 + scanUtils + 测试

**Files:**
- Create: `src/components/robot/types.ts`
- Create: `src/components/robot/scanUtils.ts`
- Create: `src/components/robot/scanUtils.test.ts`

- [ ] **Step 1: 创建消息类型定义**

创建 `src/components/robot/types.ts`：

```ts
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
```

- [ ] **Step 2: 写 scanUtils 的失败测试**

创建 `src/components/robot/scanUtils.test.ts`：

```ts
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
    expect(pts.length).toBe(3) // 只有第二个点
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
```

- [ ] **Step 3: 运行测试确认失败**

```bash
pnpm test:run
```

预期：`FAIL src/components/robot/scanUtils.test.ts` — Cannot find module './scanUtils'

- [ ] **Step 4: 实现 scanUtils.ts**

创建 `src/components/robot/scanUtils.ts`：

```ts
import type { LaserScanMessage } from './types'

export function scanToPoints(scan: LaserScanMessage): Float32Array {
  const positions: number[] = []
  for (let i = 0; i < scan.ranges.length; i++) {
    const r = scan.ranges[i]
    if (!isFinite(r) || r < scan.range_min || r > scan.range_max) continue
    const angle = scan.angle_min + i * scan.angle_increment
    // ROS 坐标 (x=前, y=左, z=上) → Three.js (x=右, y=上, z=朝观察者)
    positions.push(r * Math.cos(angle), 0, -r * Math.sin(angle))
  }
  return new Float32Array(positions)
}
```

- [ ] **Step 5: 运行测试确认全部通过**

```bash
pnpm test:run
```

预期：`PASS src/components/robot/scanUtils.test.ts` — 6 tests passed

- [ ] **Step 6: Commit**

```bash
git add src/components/robot/types.ts src/components/robot/scanUtils.ts src/components/robot/scanUtils.test.ts
git commit -m "feat(robot): add ROS message types and scanToPoints utility"
```

---

## Task 3: Zustand robotStore + 测试

**Files:**
- Create: `src/store/robotStore.ts`
- Create: `src/store/robotStore.test.ts`

- [ ] **Step 1: 写 store 的失败测试**

创建 `src/store/robotStore.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test:run
```

预期：`FAIL src/store/robotStore.test.ts` — Cannot find module './robotStore'

- [ ] **Step 3: 实现 robotStore.ts**

创建 `src/store/robotStore.ts`：

```ts
import { create } from 'zustand'
import ROSLIB from 'roslib'
import type { OdometryMessage, LaserScanMessage } from '../components/robot/types'

interface RobotStore {
  ros: ROSLIB.Ros | null
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
    const ros = new ROSLIB.Ros({ url })
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
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
pnpm test:run
```

预期：`PASS src/store/robotStore.test.ts` — 5 tests passed，`PASS src/components/robot/scanUtils.test.ts` — 6 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/store/robotStore.ts src/store/robotStore.test.ts
git commit -m "feat(robot): add Zustand robotStore with connect/disconnect/setOdom/setScan"
```

---

## Task 4: ConnectionPanel 组件

**Files:**
- Create: `src/components/robot/ConnectionPanel.tsx`

- [ ] **Step 1: 创建 ConnectionPanel.tsx**

```tsx
import { useState } from 'react'
import { useRobotStore } from '../../store/robotStore'

export function ConnectionPanel() {
  const [url, setUrl] = useState('ws://localhost:9090')
  const connected = useRobotStore(s => s.connected)
  const connect = useRobotStore(s => s.connect)
  const disconnect = useRobotStore(s => s.disconnect)

  return (
    <div style={{
      padding: '10px 14px',
      background: '#1a1a2e',
      borderRadius: 8,
      display: 'flex',
      gap: 10,
      alignItems: 'center',
    }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
        background: connected ? '#4caf50' : '#f44336',
        boxShadow: connected ? '0 0 6px #4caf50' : 'none',
      }} />
      <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>
        {connected ? '已连接' : '未连接'}
      </span>
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        disabled={connected}
        placeholder="ws://localhost:9090"
        style={{
          flex: 1,
          padding: '5px 10px',
          borderRadius: 4,
          border: '1px solid #333',
          background: '#0d0d1a',
          color: '#ddd',
          fontSize: 13,
          outline: 'none',
        }}
      />
      <button
        onClick={() => connected ? disconnect() : connect(url)}
        style={{
          padding: '5px 16px',
          borderRadius: 4,
          border: 'none',
          background: connected ? '#c62828' : '#2e7d32',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {connected ? '断开' : '连接'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 确认 TypeScript 无报错**

```bash
pnpm exec tsc --noEmit
```

预期：无错误输出

- [ ] **Step 3: Commit**

```bash
git add src/components/robot/ConnectionPanel.tsx
git commit -m "feat(robot): add ConnectionPanel with rosbridge URL input"
```

---

## Task 5: RosSubscriber 组件

**Files:**
- Create: `src/components/robot/RosSubscriber.tsx`

RosSubscriber 是一个无渲染组件（返回 null），挂载时订阅 `/odom` 和 `/scan`，卸载时取消订阅。必须放在 R3F Canvas 内部才能访问 React 生命周期。

- [ ] **Step 1: 创建 RosSubscriber.tsx**

```tsx
import { useEffect } from 'react'
import ROSLIB from 'roslib'
import { useRobotStore } from '../../store/robotStore'
import type { OdometryMessage, LaserScanMessage } from './types'

export function RosSubscriber() {
  const ros = useRobotStore(s => s.ros)
  const setOdom = useRobotStore(s => s.setOdom)
  const setScan = useRobotStore(s => s.setScan)

  useEffect(() => {
    if (!ros) return

    const odomTopic = new ROSLIB.Topic({
      ros,
      name: '/odom',
      messageType: 'nav_msgs/Odometry',
    })
    odomTopic.subscribe((msg) => {
      setOdom(msg as unknown as OdometryMessage)
    })

    const scanTopic = new ROSLIB.Topic({
      ros,
      name: '/scan',
      messageType: 'sensor_msgs/LaserScan',
    })
    scanTopic.subscribe((msg) => {
      setScan(msg as unknown as LaserScanMessage)
    })

    return () => {
      odomTopic.unsubscribe()
      scanTopic.unsubscribe()
    }
  }, [ros, setOdom, setScan])

  return null
}
```

- [ ] **Step 2: 确认 TypeScript 无报错**

```bash
pnpm exec tsc --noEmit
```

预期：无错误输出

- [ ] **Step 3: Commit**

```bash
git add src/components/robot/RosSubscriber.tsx
git commit -m "feat(robot): add RosSubscriber to subscribe /odom and /scan topics"
```

---

## Task 6: RobotModel 组件

**Files:**
- Create: `src/components/robot/RobotModel.tsx`

RobotModel 读取 store 中的 odom，将 ROS 坐标系（x 前, y 左, z 上）映射到 Three.js 坐标系（x 右, y 上, z 朝观察者）。机器人在平面上运动时 z=0，yaw 角是绕 z 轴旋转，映射为 Three.js 的绕 y 轴旋转。

- [ ] **Step 1: 创建 RobotModel.tsx**

```tsx
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '../../store/robotStore'

export function RobotModel() {
  const groupRef = useRef<THREE.Group>(null)
  const odom = useRobotStore(s => s.odom)

  useEffect(() => {
    if (!odom || !groupRef.current) return
    const { position, orientation } = odom.pose.pose
    // ROS x=前→Three.js x, ROS y=左→Three.js -z, ROS z=上→Three.js y
    groupRef.current.position.set(position.x, position.z, -position.y)
    // 平面运动时只有 yaw（绕 ROS z 轴），提取并映射为 Three.js 绕 y 轴旋转
    const yaw = 2 * Math.atan2(orientation.z, orientation.w)
    groupRef.current.rotation.set(0, -yaw, 0)
  }, [odom])

  return (
    <group ref={groupRef}>
      {/* 车身 */}
      <mesh>
        <boxGeometry args={[0.28, 0.14, 0.19]} />
        <meshStandardMaterial color="#4a90e2" />
      </mesh>
      {/* 左轮 */}
      <mesh position={[0, -0.05, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.018, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* 右轮 */}
      <mesh position={[0, -0.05, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.018, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: 确认 TypeScript 无报错**

```bash
pnpm exec tsc --noEmit
```

预期：无错误输出

- [ ] **Step 3: Commit**

```bash
git add src/components/robot/RobotModel.tsx
git commit -m "feat(robot): add RobotModel with odom-driven position and yaw"
```

---

## Task 7: LaserScanPoints 组件

**Files:**
- Create: `src/components/robot/LaserScanPoints.tsx`

- [ ] **Step 1: 创建 LaserScanPoints.tsx**

```tsx
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '../../store/robotStore'
import { scanToPoints } from './scanUtils'

export function LaserScanPoints() {
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const scan = useRobotStore(s => s.scan)

  useEffect(() => {
    if (!scan || !geoRef.current) return
    const positions = scanToPoints(scan)
    geoRef.current.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    )
    geoRef.current.attributes.position.needsUpdate = true
  }, [scan])

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial color="#ff4444" size={0.03} sizeAttenuation />
    </points>
  )
}
```

- [ ] **Step 2: 确认 TypeScript 无报错**

```bash
pnpm exec tsc --noEmit
```

预期：无错误输出

- [ ] **Step 3: Commit**

```bash
git add src/components/robot/LaserScanPoints.tsx
git commit -m "feat(robot): add LaserScanPoints rendering /scan data as 3D points"
```

---

## Task 8: VirtualJoystick 组件

**Files:**
- Create: `src/components/robot/VirtualJoystick.tsx`

VirtualJoystick 用 Canvas 2D 绘制圆盘 + 摇杆，pointer events 处理拖拽。松开时立即发布零速指令。cmd_vel 的 linear.x（前进）对应摇杆 y 轴，angular.z（转向）对应摇杆 x 轴（取反）。

- [ ] **Step 1: 创建 VirtualJoystick.tsx**

```tsx
import { useRef, useEffect, useCallback } from 'react'
import ROSLIB from 'roslib'
import { useRobotStore } from '../../store/robotStore'

const SIZE = 120
const KNOB_R = 18
const MAX_OFFSET = SIZE / 2 - KNOB_R - 4

export function VirtualJoystick() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)
  const knob = useRef({ x: 0, y: 0 })
  const cmdVelRef = useRef<ROSLIB.Topic | null>(null)

  const ros = useRobotStore(s => s.ros)
  const maxLinearSpeed = useRobotStore(s => s.maxLinearSpeed)
  const maxAngularSpeed = useRobotStore(s => s.maxAngularSpeed)

  useEffect(() => {
    if (!ros) { cmdVelRef.current = null; return }
    cmdVelRef.current = new ROSLIB.Topic({
      ros,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/Twist',
    })
    return () => { cmdVelRef.current = null }
  }, [ros])

  const publish = useCallback((nx: number, ny: number) => {
    cmdVelRef.current?.publish(new ROSLIB.Message({
      linear: { x: -ny * maxLinearSpeed, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: -nx * maxAngularSpeed },
    }))
  }, [maxLinearSpeed, maxAngularSpeed])

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    // 底盘
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2)
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#111'
    ctx.fill()
    // 摇杆
    const cx = SIZE / 2 + knob.current.x
    const cy = SIZE / 2 + knob.current.y
    ctx.beginPath()
    ctx.arc(cx, cy, KNOB_R, 0, Math.PI * 2)
    ctx.fillStyle = dragging.current ? '#4a90e2' : '#555'
    ctx.fill()
  }, [])

  const clampToCircle = (dx: number, dy: number) => {
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= MAX_OFFSET) return { x: dx, y: dy }
    const scale = MAX_OFFSET / dist
    return { x: dx * scale, y: dy * scale }
  }

  const getOffset = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return clampToCircle(
      e.clientX - rect.left - SIZE / 2,
      e.clientY - rect.top - SIZE / 2,
    )
  }

  useEffect(() => { draw() }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      style={{ touchAction: 'none', cursor: 'grab', flexShrink: 0 }}
      onPointerDown={e => {
        dragging.current = true
        canvasRef.current?.setPointerCapture(e.pointerId)
        const k = getOffset(e)
        knob.current = k
        publish(k.x / MAX_OFFSET, k.y / MAX_OFFSET)
        draw()
      }}
      onPointerMove={e => {
        if (!dragging.current) return
        const k = getOffset(e)
        knob.current = k
        publish(k.x / MAX_OFFSET, k.y / MAX_OFFSET)
        draw()
      }}
      onPointerUp={() => {
        dragging.current = false
        knob.current = { x: 0, y: 0 }
        publish(0, 0)
        draw()
      }}
    />
  )
}
```

- [ ] **Step 2: 确认 TypeScript 无报错**

```bash
pnpm exec tsc --noEmit
```

预期：无错误输出

- [ ] **Step 3: Commit**

```bash
git add src/components/robot/VirtualJoystick.tsx
git commit -m "feat(robot): add VirtualJoystick publishing cmd_vel via pointer events"
```

---

## Task 9: ControlPanel + RobotScene + 路由入口

**Files:**
- Create: `src/components/robot/ControlPanel.tsx`
- Create: `src/routes/robot.tsx`
- Modify: `src/main.tsx`
- Modify: `src/routes/root.tsx`

- [ ] **Step 1: 创建 ControlPanel.tsx**

```tsx
import { useRobotStore } from '../../store/robotStore'
import { VirtualJoystick } from './VirtualJoystick'

export function ControlPanel() {
  const connected = useRobotStore(s => s.connected)
  const maxLinearSpeed = useRobotStore(s => s.maxLinearSpeed)
  const maxAngularSpeed = useRobotStore(s => s.maxAngularSpeed)
  const setMaxLinearSpeed = useRobotStore(s => s.setMaxLinearSpeed)
  const setMaxAngularSpeed = useRobotStore(s => s.setMaxAngularSpeed)

  return (
    <div style={{
      display: 'flex',
      gap: 20,
      padding: '12px 16px',
      background: '#1a1a2e',
      borderRadius: 8,
      alignItems: 'center',
    }}>
      <VirtualJoystick />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: 1,
        opacity: connected ? 1 : 0.4,
        pointerEvents: connected ? 'auto' : 'none',
      }}>
        <label style={{ color: '#aaa', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          线速度上限: {maxLinearSpeed.toFixed(2)} m/s
          <input
            type="range" min={0.05} max={0.5} step={0.05}
            value={maxLinearSpeed}
            onChange={e => setMaxLinearSpeed(Number(e.target.value))}
            style={{ accentColor: '#4a90e2' }}
          />
        </label>
        <label style={{ color: '#aaa', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          角速度上限: {maxAngularSpeed.toFixed(2)} rad/s
          <input
            type="range" min={0.2} max={2.0} step={0.1}
            value={maxAngularSpeed}
            onChange={e => setMaxAngularSpeed(Number(e.target.value))}
            style={{ accentColor: '#4a90e2' }}
          />
        </label>
      </div>
      {!connected && (
        <span style={{ color: '#f44336', fontSize: 12, alignSelf: 'center' }}>
          未连接 ROS
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建 src/routes/robot.tsx**

```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { ConnectionPanel } from '../components/robot/ConnectionPanel'
import { RosSubscriber } from '../components/robot/RosSubscriber'
import { RobotModel } from '../components/robot/RobotModel'
import { LaserScanPoints } from '../components/robot/LaserScanPoints'
import { ControlPanel } from '../components/robot/ControlPanel'

export default function RobotRoute() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0d0d1a',
      gap: 8,
      padding: 8,
      boxSizing: 'border-box',
    }}>
      <ConnectionPanel />
      <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', minHeight: 0 }}>
        <Canvas camera={{ position: [0, 4, 6], fov: 60 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1} />
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellColor="#1e1e3a"
            sectionSize={2}
            sectionColor="#333366"
            fadeDistance={20}
          />
          <RosSubscriber />
          <RobotModel />
          <LaserScanPoints />
          <OrbitControls makeDefault />
        </Canvas>
      </div>
      <ControlPanel />
    </div>
  )
}
```

- [ ] **Step 3: 注册路由到 src/main.tsx**

在 `src/main.tsx` 中添加 import 和路由项。在现有 import 末尾添加：

```tsx
import RobotRoute from './routes/robot';
```

在 `children` 数组末尾添加：

```tsx
{ path: "/robot", element: <RobotRoute /> },
```

完整 children 数组变为：

```tsx
children: [
  { path: "/basic", element: <Basic /> },
  { path: "/geometry", element: <Geometry /> },
  { path: "/vector", element: <Vector /> },
  { path: "/texture", element: <Texture /> },
  { path: "/gltf", element: <GLTF /> },
  { path: "/circular-arc", element: <CircularArc /> },
  { path: "/kid", element: <Kid /> },
  { path: "/solar-system", element: <SolarSystemRoute /> },
  { path: "/robot", element: <RobotRoute /> },
],
```

- [ ] **Step 4: 添加导航链接到 src/routes/root.tsx**

在最后一个 `<ul>` 块（Solar System 那个）之后，添加：

```tsx
<ul>
  <li>
    <a href={'/robot'}>Robot</a>
  </li>
</ul>
```

- [ ] **Step 5: 确认 TypeScript 无报错**

```bash
pnpm exec tsc --noEmit
```

预期：无错误输出

- [ ] **Step 6: 确认所有测试通过**

```bash
pnpm test:run
```

预期：11 tests passed (scanUtils 6 + store 5)

- [ ] **Step 7: Commit**

```bash
git add src/components/robot/ControlPanel.tsx src/routes/robot.tsx src/main.tsx src/routes/root.tsx
git commit -m "feat(robot): add ControlPanel, RobotScene route, register /robot route and nav link"
```

---

## Task 10: 阶段一验证 — 启动开发服务器 + Docker ROS2

**这是连通性验证阶段。确认浏览器能收到 /odom 数据。**

- [ ] **Step 1: 启动前端开发服务器**

```bash
pnpm dev
```

访问 http://localhost:5173/robot，确认页面加载无报错，看到 ConnectionPanel 和 Canvas。

- [ ] **Step 2: 启动 ROS2 Docker 容器**

```bash
docker run -it --rm -p 9090:9090 --name ros2_robot osrf/ros:humble-desktop bash
```

- [ ] **Step 3: 容器内安装 TurtleBot3 和 rosbridge**

在容器内执行：

```bash
apt-get update && apt-get install -y \
  ros-humble-turtlebot3-gazebo \
  ros-humble-turtlebot3-bringup \
  ros-humble-rosbridge-suite

echo "export TURTLEBOT3_MODEL=burger" >> ~/.bashrc
source ~/.bashrc
source /opt/ros/humble/setup.bash
```

- [ ] **Step 4: 启动 Gazebo 仿真（无头模式）**

在容器内：

```bash
export TURTLEBOT3_MODEL=burger
source /opt/ros/humble/setup.bash
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py &
```

等待约 10 秒，确认没有 fatal error。

- [ ] **Step 5: 启动 rosbridge**

在同一容器内（或 `docker exec -it ros2_robot bash`）：

```bash
source /opt/ros/humble/setup.bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

看到 `Rosbridge WebSocket server started on port 9090` 即成功。

- [ ] **Step 6: 浏览器连接验证**

访问 http://localhost:5173/robot，在 ConnectionPanel 输入 `ws://localhost:9090`，点击连接。

验收标准：
- 状态指示灯变绿
- 打开浏览器 DevTools → Console，应看到 WebSocket 连接成功，无报错

- [ ] **Step 7: 验证 /odom 数据到达**

在浏览器 Console 临时添加验证（F12 → Console 粘贴）：

```js
// 临时验证，不需要提交代码
// 在 ConnectionPanel 连接后，zustand store 应持续更新
// 访问 http://localhost:5173/robot 后在 DevTools 查看 Network → WS tab
// 应该看到持续的 binary/text 帧
```

检查 Network → WS → 点击 ws://localhost:9090 → Messages tab，应看到持续收到消息帧。

---

## Task 11: 阶段二验证 — 3D 可视化

**验证机器人 3D 模型随 odom 更新、激光点云正常显示。**

- [ ] **Step 1: 在容器内驱动机器人转圈**

在容器内开新终端（`docker exec -it ros2_robot bash`）：

```bash
source /opt/ros/humble/setup.bash
# 发布一个旋转指令持续 10 秒
ros2 topic pub --rate 10 /cmd_vel geometry_msgs/msg/Twist \
  "{linear: {x: 0.1}, angular: {z: 0.5}}" &
sleep 10
ros2 topic pub -1 /cmd_vel geometry_msgs/msg/Twist "{}"
```

- [ ] **Step 2: 观察浏览器 3D 场景**

验收标准：
- 蓝色方块（机器人）在 Three.js 场景中移动和旋转
- 机器人周围有红色点云（激光雷达）
- OrbitControls 可以自由旋转/缩放视角

---

## Task 12: 阶段三验证 — 运动控制

**验证虚拟摇杆能控制 Gazebo 中的机器人。**

- [ ] **Step 1: 确认 rosbridge 和 Gazebo 仍在运行**

容器内检查：

```bash
ros2 topic list | grep cmd_vel
# 应看到 /cmd_vel
```

- [ ] **Step 2: 在浏览器使用摇杆控制机器人**

在 http://localhost:5173/robot 的 ControlPanel 中：
- 向上拖动摇杆：机器人前进
- 向左/右拖动：机器人左/右转
- 松开摇杆：机器人停止

验收标准：摇杆拖动时 Gazebo 中 TurtleBot3 同步运动，松开立即停止。

- [ ] **Step 3: 验证速度滑块**

将线速度滑块调到最大（0.5 m/s），向上推摇杆，确认机器人比之前快。

- [ ] **Step 4: 最终 commit**

```bash
git add .
git commit -m "feat(robot): complete ROS2 web robot visualization and control demo"
```

---

## Docker 快速参考

```bash
# 启动容器（Mac，暴露 rosbridge 端口）
docker run -it --rm -p 9090:9090 --name ros2_robot osrf/ros:humble-desktop bash

# 容器内一次性安装（首次）
apt-get update && apt-get install -y \
  ros-humble-turtlebot3-gazebo ros-humble-rosbridge-suite

# 容器内启动仿真 + rosbridge（每次）
export TURTLEBOT3_MODEL=burger
source /opt/ros/humble/setup.bash
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py &
sleep 8
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```
