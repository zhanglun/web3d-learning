# 3D Point Cloud Annotation Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/annotator` route with dual-viewport 3D point cloud annotation — perspective view + BEV, box drawing, TransformControls editing, and JSON export.

**Architecture:** Single R3F Canvas split into two `<View>` viewports (3D perspective + BEV orthographic) sharing point cloud data from Zustand. BEV has a Canvas 2D overlay for drawing boxes; 3D view uses drei `<TransformControls>` for editing selected boxes.

**Tech Stack:** React + TypeScript + Three.js + @react-three/fiber + @react-three/drei + Zustand + Vitest

---

## File Map

| File | Role |
|------|------|
| `src/components/annotator/types.ts` | Core types: `AnnotationBox`, `AnnotatorState` |
| `src/components/annotator/annotatorStore.ts` | Zustand store |
| `src/components/annotator/annotatorStore.test.ts` | Store unit tests |
| `src/components/annotator/pcdParser.ts` | ASCII + binary PCD parser → Float32Array |
| `src/components/annotator/pcdParser.test.ts` | Parser unit tests |
| `src/components/annotator/sampleData.ts` | Programmatic parking-lot scene (~8k pts) |
| `src/components/annotator/exportUtils.ts` | Serialize to custom JSON + nuScenes JSON |
| `src/components/annotator/exportUtils.test.ts` | Export unit tests |
| `src/components/annotator/PointCloud.tsx` | R3F: renders Float32Array as BufferGeometry Points |
| `src/components/annotator/AnnotationBox3D.tsx` | R3F: wireframe box + TransformControls when selected |
| `src/components/annotator/BevView.tsx` | R3F scene content for BEV viewport (OrthographicCamera) |
| `src/components/annotator/BevOverlay.tsx` | Canvas 2D overlay — draws box on pointer drag |
| `src/components/annotator/BoxList.tsx` | Bottom panel: lists all annotations, edit label/size/delete |
| `src/components/annotator/Toolbar.tsx` | Top bar: mode toggle, load PCD, load sample, export |
| `src/routes/annotator.tsx` | Route: full layout + dual-View Canvas |
| `src/main.tsx` | Add `/annotator` route |
| `src/routes/root.tsx` | Add nav link |

**Size convention (used everywhere):** `size: [width, depth, height]`
- `size[0]` = X extent (width)
- `size[1]` = Z extent (depth)
- `size[2]` = Y extent (height)
- Maps to `new THREE.BoxGeometry(size[0], size[2], size[1])`

---

## Task 1: Types + Zustand Store

**Files:**
- Create: `src/components/annotator/types.ts`
- Create: `src/components/annotator/annotatorStore.ts`
- Create: `src/components/annotator/annotatorStore.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/annotator/annotatorStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAnnotatorStore } from './annotatorStore'

const baseBox = {
  position: [0, 0, 0] as [number, number, number],
  size: [2, 4, 1.5] as [number, number, number],
  rotation: 0,
  label: 'car',
}

beforeEach(() => {
  useAnnotatorStore.setState({
    pointCloud: null,
    boxes: [],
    selectedId: null,
    mode: 'view',
  })
})

describe('annotatorStore', () => {
  it('addBox assigns a unique ID', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    useAnnotatorStore.getState().addBox(baseBox)
    const { boxes } = useAnnotatorStore.getState()
    expect(boxes).toHaveLength(2)
    expect(boxes[0].id).not.toBe(boxes[1].id)
    expect(typeof boxes[0].id).toBe('string')
    expect(boxes[0].id.length).toBeGreaterThan(0)
  })

  it('updateBox applies a partial patch without touching other fields', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().updateBox(id, { label: 'truck', rotation: 1.5 })
    const box = useAnnotatorStore.getState().boxes[0]
    expect(box.label).toBe('truck')
    expect(box.rotation).toBe(1.5)
    expect(box.position).toEqual([0, 0, 0])
    expect(box.size).toEqual([2, 4, 1.5])
  })

  it('deleteBox removes the box', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().deleteBox(id)
    expect(useAnnotatorStore.getState().boxes).toHaveLength(0)
  })

  it('deleteBox clears selectedId when the deleted box was selected', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().selectBox(id)
    useAnnotatorStore.getState().deleteBox(id)
    expect(useAnnotatorStore.getState().selectedId).toBeNull()
  })

  it('selectBox sets selectedId', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().selectBox(id)
    expect(useAnnotatorStore.getState().selectedId).toBe(id)
  })

  it('selectBox(null) deselects', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().selectBox(id)
    useAnnotatorStore.getState().selectBox(null)
    expect(useAnnotatorStore.getState().selectedId).toBeNull()
  })

  it('setMode changes mode between view and annotate', () => {
    expect(useAnnotatorStore.getState().mode).toBe('view')
    useAnnotatorStore.getState().setMode('annotate')
    expect(useAnnotatorStore.getState().mode).toBe('annotate')
    useAnnotatorStore.getState().setMode('view')
    expect(useAnnotatorStore.getState().mode).toBe('view')
  })

  it('loadPointCloud stores the Float32Array', () => {
    const data = new Float32Array([1, 2, 3, 4, 5, 6])
    useAnnotatorStore.getState().loadPointCloud(data)
    expect(useAnnotatorStore.getState().pointCloud).toBe(data)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
pnpm test:run
```

Expected: `Error: Cannot find module './annotatorStore'`

- [ ] **Step 3: Create types.ts**

```ts
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
```

- [ ] **Step 4: Create annotatorStore.ts**

```ts
// src/components/annotator/annotatorStore.ts
import { create } from 'zustand'
import type { AnnotationBox, AnnotatorState } from './types'

interface AnnotatorStore extends AnnotatorState {
  loadPointCloud: (data: Float32Array) => void
  loadSample: () => void
  addBox: (box: Omit<AnnotationBox, 'id'>) => void
  updateBox: (id: string, patch: Partial<Omit<AnnotationBox, 'id'>>) => void
  deleteBox: (id: string) => void
  selectBox: (id: string | null) => void
  setMode: (mode: 'view' | 'annotate') => void
}

export const useAnnotatorStore = create<AnnotatorStore>((set) => ({
  pointCloud: null,
  boxes: [],
  selectedId: null,
  mode: 'view',

  loadPointCloud: (data) => set({ pointCloud: data }),

  loadSample: () => {
    // Populated in Task 3 when sampleData.ts exists.
    // Import is deferred to avoid circular dependency at test time.
    import('./sampleData').then(({ generateSampleData }) => {
      set({ pointCloud: generateSampleData() })
    })
  },

  addBox: (box) =>
    set((s) => ({ boxes: [...s.boxes, { ...box, id: crypto.randomUUID() }] })),

  updateBox: (id, patch) =>
    set((s) => ({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),

  deleteBox: (id) =>
    set((s) => ({
      boxes: s.boxes.filter((b) => b.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  selectBox: (id) => set({ selectedId: id }),

  setMode: (mode) => set({ mode }),
}))
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test:run
```

Expected: `Tests  8 passed`

- [ ] **Step 6: Commit**

```bash
git add src/components/annotator/types.ts src/components/annotator/annotatorStore.ts src/components/annotator/annotatorStore.test.ts
git commit -m "feat(annotator): add types and Zustand store with tests"
```

---

## Task 2: PCD Parser

**Files:**
- Create: `src/components/annotator/pcdParser.ts`
- Create: `src/components/annotator/pcdParser.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/annotator/pcdParser.test.ts
import { describe, it, expect } from 'vitest'
import { parsePCD } from './pcdParser'

function makeAsciiPCD(pts: [number, number, number][]): ArrayBuffer {
  const header = [
    'VERSION 0.7',
    'FIELDS x y z',
    'SIZE 4 4 4',
    'TYPE F F F',
    'COUNT 1 1 1',
    `WIDTH ${pts.length}`,
    'HEIGHT 1',
    'VIEWPOINT 0 0 0 1 0 0 0',
    `POINTS ${pts.length}`,
    'DATA ascii',
  ].join('\n') + '\n'
  const data = pts.map(([x, y, z]) => `${x} ${y} ${z}`).join('\n') + '\n'
  return new TextEncoder().encode(header + data).buffer as ArrayBuffer
}

function makeBinaryPCD(pts: [number, number, number][]): ArrayBuffer {
  const header = [
    'VERSION 0.7',
    'FIELDS x y z',
    'SIZE 4 4 4',
    'TYPE F F F',
    'COUNT 1 1 1',
    `WIDTH ${pts.length}`,
    'HEIGHT 1',
    'VIEWPOINT 0 0 0 1 0 0 0',
    `POINTS ${pts.length}`,
    'DATA binary',
  ].join('\n') + '\n'
  const headerBytes = new TextEncoder().encode(header)
  const dataBytes = new ArrayBuffer(pts.length * 12)
  const view = new DataView(dataBytes)
  pts.forEach(([x, y, z], i) => {
    view.setFloat32(i * 12,     x, true)
    view.setFloat32(i * 12 + 4, y, true)
    view.setFloat32(i * 12 + 8, z, true)
  })
  const out = new Uint8Array(headerBytes.byteLength + dataBytes.byteLength)
  out.set(headerBytes)
  out.set(new Uint8Array(dataBytes), headerBytes.byteLength)
  return out.buffer as ArrayBuffer
}

describe('parsePCD', () => {
  it('parses ASCII PCD into flat Float32Array', () => {
    const buf = makeAsciiPCD([[1, 2, 3], [4, 5, 6]])
    expect(Array.from(parsePCD(buf))).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('filters NaN and Infinity in ASCII data', () => {
    const header =
      'VERSION 0.7\nFIELDS x y z\nSIZE 4 4 4\nTYPE F F F\nCOUNT 1 1 1\n' +
      'WIDTH 3\nHEIGHT 1\nVIEWPOINT 0 0 0 1 0 0 0\nPOINTS 3\nDATA ascii\n'
    const data = '1 2 3\nnan 0 0\n4 inf 6\n'
    const buf = new TextEncoder().encode(header + data).buffer as ArrayBuffer
    expect(Array.from(parsePCD(buf))).toEqual([1, 2, 3])
  })

  it('parses binary PCD correctly', () => {
    const buf = makeBinaryPCD([[1.5, 2.5, 3.5]])
    const result = parsePCD(buf)
    expect(result[0]).toBeCloseTo(1.5)
    expect(result[1]).toBeCloseTo(2.5)
    expect(result[2]).toBeCloseTo(3.5)
    expect(result.length).toBe(3)
  })

  it('handles x/y/z fields not in first-column order', () => {
    const header =
      'VERSION 0.7\nFIELDS intensity x y z\nSIZE 4 4 4 4\nTYPE F F F F\nCOUNT 1 1 1 1\n' +
      'WIDTH 1\nHEIGHT 1\nVIEWPOINT 0 0 0 1 0 0 0\nPOINTS 1\nDATA ascii\n'
    const data = '99 7 8 9\n'
    const buf = new TextEncoder().encode(header + data).buffer as ArrayBuffer
    expect(Array.from(parsePCD(buf))).toEqual([7, 8, 9])
  })

  it('throws when x/y/z fields are missing', () => {
    const header =
      'VERSION 0.7\nFIELDS intensity\nSIZE 4\nTYPE F\nCOUNT 1\n' +
      'WIDTH 1\nHEIGHT 1\nVIEWPOINT 0 0 0 1 0 0 0\nPOINTS 1\nDATA ascii\n'
    const buf = new TextEncoder().encode(header + '1\n').buffer as ArrayBuffer
    expect(() => parsePCD(buf)).toThrow(/missing x\/y\/z/)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test:run
```

Expected: `Error: Cannot find module './pcdParser'`

- [ ] **Step 3: Create pcdParser.ts**

```ts
// src/components/annotator/pcdParser.ts
export function parsePCD(buffer: ArrayBuffer): Float32Array {
  const bytes = new Uint8Array(buffer)

  // Scan header line-by-line until DATA line
  const headerLines: string[] = []
  let pos = 0
  let dataOffset = 0

  while (pos < bytes.length) {
    let end = pos
    while (end < bytes.length && bytes[end] !== 10) end++ // find \n
    const line = new TextDecoder().decode(bytes.slice(pos, end)).replace(/\r$/, '').trim()
    pos = end + 1
    headerLines.push(line)
    if (line.startsWith('DATA')) { dataOffset = pos; break }
  }

  const get = (prefix: string) =>
    headerLines.find((l) => l.startsWith(prefix))?.slice(prefix.length).trim() ?? ''

  const fields = get('FIELDS ').split(/\s+/)
  const sizes  = get('SIZE ').split(/\s+/).map(Number)
  const points = parseInt(get('POINTS ') || '0', 10)
  const dataType = get('DATA ').split(/\s+/)[0]

  const xIdx = fields.indexOf('x')
  const yIdx = fields.indexOf('y')
  const zIdx = fields.indexOf('z')
  if (xIdx < 0 || yIdx < 0 || zIdx < 0) throw new Error('PCD missing x/y/z fields')

  if (dataType === 'ascii') {
    const text = new TextDecoder().decode(bytes.slice(dataOffset))
    const out: number[] = []
    for (const line of text.split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < fields.length) continue
      const x = parseFloat(parts[xIdx])
      const y = parseFloat(parts[yIdx])
      const z = parseFloat(parts[zIdx])
      if (isFinite(x) && isFinite(y) && isFinite(z)) out.push(x, y, z)
    }
    return new Float32Array(out)
  }

  if (dataType === 'binary') {
    const stride = sizes.reduce((s, v) => s + v, 0)
    const xOff = sizes.slice(0, xIdx).reduce((s, v) => s + v, 0)
    const yOff = sizes.slice(0, yIdx).reduce((s, v) => s + v, 0)
    const zOff = sizes.slice(0, zIdx).reduce((s, v) => s + v, 0)
    const view = new DataView(buffer, dataOffset)
    const out: number[] = []
    for (let i = 0; i < points; i++) {
      const base = i * stride
      const x = view.getFloat32(base + xOff, true)
      const y = view.getFloat32(base + yOff, true)
      const z = view.getFloat32(base + zOff, true)
      if (isFinite(x) && isFinite(y) && isFinite(z)) out.push(x, y, z)
    }
    return new Float32Array(out)
  }

  throw new Error(`Unsupported PCD DATA type: ${dataType}`)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test:run
```

Expected: `Tests  13 passed` (8 from Task 1 + 5 here)

- [ ] **Step 5: Commit**

```bash
git add src/components/annotator/pcdParser.ts src/components/annotator/pcdParser.test.ts
git commit -m "feat(annotator): add PCD parser (ASCII + binary) with tests"
```

---

## Task 3: Sample Data + Export Utils

**Files:**
- Create: `src/components/annotator/sampleData.ts`
- Create: `src/components/annotator/exportUtils.ts`
- Create: `src/components/annotator/exportUtils.test.ts`

- [ ] **Step 1: Write the failing export tests**

```ts
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test:run
```

Expected: `Error: Cannot find module './exportUtils'`

- [ ] **Step 3: Create sampleData.ts**

```ts
// src/components/annotator/sampleData.ts
export function generateSampleData(): Float32Array {
  const pts: number[] = []

  // Ground plane: 4000 points spread across 20x20m at y ≈ 0
  for (let i = 0; i < 4000; i++) {
    pts.push(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 20,
    )
  }

  // Three vehicle clusters
  const vehicles = [
    { cx: 3,  cz: 2,  w: 2.0, d: 4.5 },
    { cx: -4, cz: -3, w: 2.0, d: 4.5 },
    { cx: 0,  cz: -7, w: 1.8, d: 4.2 },
  ]
  for (const v of vehicles) {
    for (let i = 0; i < 1200; i++) {
      pts.push(
        v.cx + (Math.random() - 0.5) * v.w + (Math.random() - 0.5) * 0.05,
        Math.random() * 1.5               + (Math.random() - 0.5) * 0.05,
        v.cz + (Math.random() - 0.5) * v.d + (Math.random() - 0.5) * 0.05,
      )
    }
  }

  return new Float32Array(pts)
}
```

- [ ] **Step 4: Create exportUtils.ts**

```ts
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
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test:run
```

Expected: `Tests  19 passed` (13 previous + 6 here)

- [ ] **Step 6: Commit**

```bash
git add src/components/annotator/sampleData.ts src/components/annotator/exportUtils.ts src/components/annotator/exportUtils.test.ts
git commit -m "feat(annotator): add sample data generator and export utils with tests"
```

---

## Task 4: PointCloud Renderer + Route Shell

**Files:**
- Create: `src/components/annotator/PointCloud.tsx`
- Create: `src/routes/annotator.tsx` (minimal shell)
- Modify: `src/main.tsx`
- Modify: `src/routes/root.tsx`

- [ ] **Step 1: Create PointCloud.tsx**

```tsx
// src/components/annotator/PointCloud.tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useAnnotatorStore } from './annotatorStore'

export function PointCloud() {
  const geoRef = useRef<THREE.BufferGeometry>(null!)
  const pointCloud = useAnnotatorStore((s) => s.pointCloud)

  useEffect(() => {
    if (!pointCloud || !geoRef.current) return
    geoRef.current.setAttribute('position', new THREE.BufferAttribute(pointCloud, 3))
    geoRef.current.computeBoundingSphere()
  }, [pointCloud])

  if (!pointCloud) return null

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial color="#88ccff" size={0.05} sizeAttenuation />
    </points>
  )
}
```

- [ ] **Step 2: Create minimal annotator.tsx route shell**

```tsx
// src/routes/annotator.tsx
import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { View, OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { PointCloud } from '../components/annotator/PointCloud'
import { useAnnotatorStore } from '../components/annotator/annotatorStore'

export default function AnnotatorRoute() {
  const perspRef = useRef<HTMLDivElement>(null!)
  const bevRef   = useRef<HTMLDivElement>(null!)

  const loadSample = useAnnotatorStore((s) => s.loadSample)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
                  background: '#0d0d1a', gap: 8, padding: 8, boxSizing: 'border-box' }}>

      {/* Temporary load button until Toolbar is built */}
      <div style={{ color: '#fff', fontSize: 12 }}>
        <button onClick={() => loadSample()} style={{ marginRight: 8 }}>Load Sample</button>
        Annotator
      </div>

      {/* Viewport row */}
      <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0 }}>
        <div ref={perspRef} style={{ flex: 1, borderRadius: 8, overflow: 'hidden' }} />
        <div ref={bevRef}   style={{ flex: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }} />
      </div>

      {/* Full-page Canvas — pointer-events off, events delegated via eventSource */}
      <Canvas
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                 pointerEvents: 'none' }}
        eventSource={document.getElementById('root') as HTMLElement}
        gl={{ alpha: true }}
      >
        <View track={perspRef}>
          <PerspectiveCamera makeDefault position={[0, 6, 10]} fov={60} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1} />
          <OrbitControls makeDefault />
          <Grid args={[20, 20]} cellSize={0.5} cellColor="#1e1e3a"
                sectionSize={2} sectionColor="#333366" fadeDistance={20} />
          <PointCloud />
        </View>

        <View track={bevRef}>
          <ambientLight intensity={1} />
          <PointCloud />
        </View>
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 3: Register route in main.tsx**

In `src/main.tsx`, add after the last import:
```tsx
import AnnotatorRoute from './routes/annotator';
```

Add to the `children` array:
```tsx
{ path: "/annotator", element: <AnnotatorRoute /> },
```

- [ ] **Step 4: Add nav link in root.tsx**

Find the `<ul>` that contains existing nav links in `src/routes/root.tsx` and add:
```tsx
<li><a href={'/annotator'}>Annotator</a></li>
```

- [ ] **Step 5: Start dev server and verify**

```bash
pnpm dev
```

1. Navigate to `/annotator`
2. Click "Load Sample" — point cloud should appear in left viewport
3. Both viewports show the same point cloud (left: perspective, right: flat view since no BEV camera yet)
4. OrbitControls works in left viewport

- [ ] **Step 6: Commit**

```bash
git add src/components/annotator/PointCloud.tsx src/routes/annotator.tsx src/main.tsx src/routes/root.tsx
git commit -m "feat(annotator): add PointCloud renderer and route shell"
```

---

## Task 5: AnnotationBox3D

**Files:**
- Create: `src/components/annotator/AnnotationBox3D.tsx`
- Modify: `src/routes/annotator.tsx`

- [ ] **Step 1: Create AnnotationBox3D.tsx**

```tsx
// src/components/annotator/AnnotationBox3D.tsx
import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { TransformControls } from '@react-three/drei'
import type { AnnotationBox } from './types'
import { useAnnotatorStore } from './annotatorStore'

interface Props {
  box: AnnotationBox
  showTransformControls?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
```

- [ ] **Step 2: Update annotator.tsx to render boxes in both views**

Replace the 3D `<View>` block in `src/routes/annotator.tsx` — add `orbitRef` and render boxes:

```tsx
// Add these imports at the top of annotator.tsx:
import * as THREE from 'three'
import { AnnotationBox3D } from '../components/annotator/AnnotationBox3D'

// Inside AnnotatorRoute(), add:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orbitRef = useRef<any>(null)
const boxes = useAnnotatorStore((s) => s.boxes)
const selectBox = useAnnotatorStore((s) => s.selectBox)
```

Replace the `<View track={perspRef}>` block with:
```tsx
<View track={perspRef}>
  <PerspectiveCamera makeDefault position={[0, 6, 10]} fov={60} />
  <ambientLight intensity={0.6} />
  <directionalLight position={[5, 8, 5]} intensity={1} />
  <OrbitControls ref={orbitRef} makeDefault />
  <Grid args={[20, 20]} cellSize={0.5} cellColor="#1e1e3a"
        sectionSize={2} sectionColor="#333366" fadeDistance={20} />
  <PointCloud />
  {/* Deselect when clicking empty space */}
  <mesh
    visible={false}
    scale={[100, 1, 100]}
    position={[0, -0.1, 0]}
    onClick={() => selectBox(null)}
  >
    <planeGeometry />
  </mesh>
  {boxes.map((box) => (
    <AnnotationBox3D
      key={box.id}
      box={box}
      showTransformControls
      orbitRef={orbitRef}
    />
  ))}
</View>
```

Replace `<View track={bevRef}>` block with:
```tsx
<View track={bevRef}>
  <ambientLight intensity={1} />
  <PointCloud />
  {boxes.map((box) => (
    <AnnotationBox3D key={box.id} box={box} />
  ))}
</View>
```

- [ ] **Step 3: Verify in browser**

1. Load sample data
2. Add a test box by calling from browser console (or wait for Task 6 BEV drawing):
   ```js
   // In browser console:
   window.__annotatorStore = window.__annotatorStore  // verify Zustand accessible
   ```
3. Open React DevTools and trigger `addBox` from the store, confirm blue wireframe appears in both views
4. Click a box — it turns orange and TransformControls gizmo appears
5. Drag translate gizmo — box moves in both views simultaneously

- [ ] **Step 4: Commit**

```bash
git add src/components/annotator/AnnotationBox3D.tsx src/routes/annotator.tsx
git commit -m "feat(annotator): add AnnotationBox3D with TransformControls"
```

---

## Task 6: BevView + BevOverlay

**Files:**
- Create: `src/components/annotator/BevView.tsx`
- Create: `src/components/annotator/BevOverlay.tsx`
- Modify: `src/routes/annotator.tsx`

- [ ] **Step 1: Create BevView.tsx**

```tsx
// src/components/annotator/BevView.tsx
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrthographicCamera, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { PointCloud } from './PointCloud'
import { AnnotationBox3D } from './AnnotationBox3D'
import { useAnnotatorStore } from './annotatorStore'

interface Props {
  cameraRef: React.RefObject<THREE.OrthographicCamera | null>
}

function CameraCapture({ cameraRef }: Props) {
  const { camera } = useThree()
  useEffect(() => {
    cameraRef.current = camera as THREE.OrthographicCamera
  }, [camera, cameraRef])
  return null
}

export function BevView({ cameraRef }: Props) {
  const boxes = useAnnotatorStore((s) => s.boxes)

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 20, 0]} up={[0, 0, -1]} zoom={30} />
      <CameraCapture cameraRef={cameraRef} />
      <ambientLight intensity={1} />
      <OrbitControls
        makeDefault
        enableRotate={false}
        mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 0 } as any}
      />
      <PointCloud />
      {boxes.map((box) => (
        <AnnotationBox3D key={box.id} box={box} />
      ))}
    </>
  )
}
```

Note: `enableRotate={false}` keeps BEV always top-down. `mouseButtons` remaps left-drag to pan.

- [ ] **Step 2: Create BevOverlay.tsx**

```tsx
// src/components/annotator/BevOverlay.tsx
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useAnnotatorStore } from './annotatorStore'

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>
  cameraRef: React.RefObject<THREE.OrthographicCamera | null>
}

function getYCenter(pointCloud: Float32Array | null): number {
  if (!pointCloud || pointCloud.length === 0) return 0.75
  const ys: number[] = []
  for (let i = 1; i < pointCloud.length; i += 3) ys.push(pointCloud[i])
  ys.sort((a, b) => a - b)
  return ys[Math.floor(ys.length / 2)]
}

function pixelToWorld(
  clientX: number,
  clientY: number,
  el: HTMLElement,
  camera: THREE.OrthographicCamera,
): [number, number] {
  const rect = el.getBoundingClientRect()
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
  const v = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera)
  return [v.x, v.z]
}

export function BevOverlay({ containerRef, cameraRef }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null!)
  const dragging    = useRef(false)
  const startClient = useRef<[number, number]>([0, 0])

  const mode       = useAnnotatorStore((s) => s.mode)
  const addBox     = useAnnotatorStore((s) => s.addBox)
  const pointCloud = useAnnotatorStore((s) => s.pointCloud)

  // Keep canvas pixel size synced to display size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    observer.observe(canvas)
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const onDown = (e: PointerEvent) => {
      if (mode !== 'annotate') return
      dragging.current = true
      startClient.current = [e.clientX, e.clientY]
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return
      const rect = canvas.getBoundingClientRect()
      const sx = startClient.current[0] - rect.left
      const sy = startClient.current[1] - rect.top
      const ex = e.clientX - rect.left
      const ey = e.clientY - rect.top
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = '#ffaa00'
      ctx.lineWidth = 2
      ctx.strokeRect(sx, sy, ex - sx, ey - sy)
    }

    const onUp = (e: PointerEvent) => {
      if (!dragging.current) return
      dragging.current = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cam = cameraRef.current
      if (!cam) return
      const [wx0, wz0] = pixelToWorld(startClient.current[0], startClient.current[1], canvas, cam)
      const [wx1, wz1] = pixelToWorld(e.clientX, e.clientY, canvas, cam)

      const width = Math.abs(wx1 - wx0)
      const depth = Math.abs(wz1 - wz0)
      if (width < 0.2 || depth < 0.2) return   // too small, ignore

      const yc = getYCenter(pointCloud)
      addBox({
        position: [(wx0 + wx1) / 2, yc + 0.75, (wz0 + wz1) / 2],
        size: [width, depth, 1.5],
        rotation: 0,
        label: '',
      })
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup',   onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup',   onUp)
    }
  }, [mode, addBox, pointCloud, cameraRef])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: mode === 'annotate' ? 'all' : 'none',
        cursor: mode === 'annotate' ? 'crosshair' : 'default',
        zIndex: 10,
        background: 'transparent',
      }}
    />
  )
}
```

- [ ] **Step 3: Wire BevView and BevOverlay into annotator.tsx**

Add the import:
```tsx
import { BevView } from '../components/annotator/BevView'
import { BevOverlay } from '../components/annotator/BevOverlay'
```

Inside `AnnotatorRoute()`, add:
```tsx
const bevCameraRef = useRef<THREE.OrthographicCamera | null>(null)
```

Update the BEV container div (already has `position: 'relative'`) to include the overlay:
```tsx
<div ref={bevRef} style={{ flex: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
  <BevOverlay containerRef={bevRef} cameraRef={bevCameraRef} />
</div>
```

Replace the `<View track={bevRef}>` block with:
```tsx
<View track={bevRef}>
  <BevView cameraRef={bevCameraRef} />
</View>
```

Also add this `import * as THREE from 'three'` at the top if not already present.

- [ ] **Step 4: Verify in browser**

1. Load sample data — both viewports show point cloud; right viewport is now top-down BEV
2. Click "Annotate" mode toggle (placeholder button — does not exist yet; set mode via React DevTools)
3. Draw a box on the BEV by dragging — dashed yellow rect appears while dragging
4. On release, a blue wireframe box appears in BOTH views at the correct world position
5. Switch back to View mode — overlay deactivates, OrbitControls works in BEV

- [ ] **Step 5: Commit**

```bash
git add src/components/annotator/BevView.tsx src/components/annotator/BevOverlay.tsx src/routes/annotator.tsx
git commit -m "feat(annotator): add BEV orthographic view and canvas draw-box overlay"
```

---

## Task 7: BoxList

**Files:**
- Create: `src/components/annotator/BoxList.tsx`
- Modify: `src/routes/annotator.tsx`

- [ ] **Step 1: Create BoxList.tsx**

```tsx
// src/components/annotator/BoxList.tsx
import { useAnnotatorStore } from './annotatorStore'

const inputStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #333',
  color: '#fff',
  padding: '2px 6px',
  borderRadius: 4,
  width: 60,
  fontSize: 12,
}

export function BoxList() {
  const boxes     = useAnnotatorStore((s) => s.boxes)
  const selectedId = useAnnotatorStore((s) => s.selectedId)
  const selectBox = useAnnotatorStore((s) => s.selectBox)
  const updateBox = useAnnotatorStore((s) => s.updateBox)
  const deleteBox = useAnnotatorStore((s) => s.deleteBox)

  if (boxes.length === 0) {
    return (
      <div style={{ color: '#555', fontSize: 12, padding: '6px 4px' }}>
        No annotations yet — switch to Annotate mode and draw a box in the BEV view.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180,
                  overflowY: 'auto', paddingRight: 4 }}>
      {boxes.map((box, i) => (
        <div
          key={box.id}
          onClick={() => selectBox(box.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            borderRadius: 6,
            background: selectedId === box.id ? '#2a2a4a' : '#141424',
            border: `1px solid ${selectedId === box.id ? '#44aaff' : '#222'}`,
            cursor: 'pointer',
            fontSize: 12,
            color: '#ccc',
          }}
        >
          <span style={{ color: '#666', width: 20 }}>#{i + 1}</span>

          {/* Label */}
          <input
            style={{ ...inputStyle, width: 80 }}
            placeholder="label"
            value={box.label}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateBox(box.id, { label: e.target.value })}
          />

          {/* Size inputs: W / D / H */}
          <span style={{ color: '#555' }}>W</span>
          <input
            style={inputStyle}
            type="number" step="0.1" min="0.1"
            value={box.size[0].toFixed(1)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateBox(box.id, { size: [parseFloat(e.target.value) || 0.1, box.size[1], box.size[2]] })}
          />
          <span style={{ color: '#555' }}>D</span>
          <input
            style={inputStyle}
            type="number" step="0.1" min="0.1"
            value={box.size[1].toFixed(1)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateBox(box.id, { size: [box.size[0], parseFloat(e.target.value) || 0.1, box.size[2]] })}
          />
          <span style={{ color: '#555' }}>H</span>
          <input
            style={inputStyle}
            type="number" step="0.1" min="0.1"
            value={box.size[2].toFixed(1)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateBox(box.id, { size: [box.size[0], box.size[1], parseFloat(e.target.value) || 0.1] })}
          />

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); deleteBox(box.id) }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none',
                     color: '#f55', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add BoxList to annotator.tsx**

Add import:
```tsx
import { BoxList } from '../components/annotator/BoxList'
```

Below the viewport row div and before the Canvas, add:
```tsx
<BoxList />
```

- [ ] **Step 3: Verify in browser**

1. Load sample, draw a box in BEV annotate mode
2. Box appears in BoxList at the bottom
3. Edit label — type "car" → label updates on the row
4. Edit W/D/H — box geometry updates in both viewports immediately
5. Click row → box turns orange in viewports (selection sync)
6. Click × → box removed from both viewports and list

- [ ] **Step 4: Commit**

```bash
git add src/components/annotator/BoxList.tsx src/routes/annotator.tsx
git commit -m "feat(annotator): add BoxList with label and size editing"
```

---

## Task 8: Toolbar

**Files:**
- Create: `src/components/annotator/Toolbar.tsx`
- Modify: `src/routes/annotator.tsx`

- [ ] **Step 1: Create Toolbar.tsx**

```tsx
// src/components/annotator/Toolbar.tsx
import { useRef } from 'react'
import { useAnnotatorStore } from './annotatorStore'
import { parsePCD } from './pcdParser'
import { toCustomJson, toNuScenes, downloadJson } from './exportUtils'

const btnStyle = (active?: boolean): React.CSSProperties => ({
  padding: '5px 14px',
  borderRadius: 6,
  border: `1px solid ${active ? '#44aaff' : '#333'}`,
  background: active ? '#1a3a5a' : '#1a1a2e',
  color: active ? '#44aaff' : '#aaa',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
})

export function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null!)
  const mode        = useAnnotatorStore((s) => s.mode)
  const setMode     = useAnnotatorStore((s) => s.setMode)
  const loadSample  = useAnnotatorStore((s) => s.loadSample)
  const loadPointCloud = useAnnotatorStore((s) => s.loadPointCloud)
  const boxes       = useAnnotatorStore((s) => s.boxes)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    try {
      loadPointCloud(parsePCD(buf))
    } catch (err) {
      alert(`PCD parse error: ${(err as Error).message}`)
    }
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {/* Mode toggle */}
      <button style={btnStyle(mode === 'view')}
              onClick={() => setMode('view')}>View</button>
      <button style={btnStyle(mode === 'annotate')}
              onClick={() => setMode('annotate')}>Annotate</button>

      <div style={{ width: 1, height: 20, background: '#333', margin: '0 4px' }} />

      {/* Load data */}
      <button style={btnStyle()} onClick={() => loadSample()}>Sample Data</button>
      <button style={btnStyle()} onClick={() => fileRef.current.click()}>Load PCD</button>
      <input
        ref={fileRef}
        type="file"
        accept=".pcd"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ width: 1, height: 20, background: '#333', margin: '0 4px' }} />

      {/* Export */}
      <button
        style={btnStyle()}
        disabled={boxes.length === 0}
        onClick={() => downloadJson(toCustomJson(boxes), 'annotations.json')}
      >
        Export JSON
      </button>
      <button
        style={btnStyle()}
        disabled={boxes.length === 0}
        onClick={() => downloadJson(toNuScenes(boxes), 'annotations_nuscenes.json')}
      >
        Export nuScenes
      </button>

      <span style={{ marginLeft: 'auto', color: '#555', fontSize: 12 }}>
        {boxes.length} annotation{boxes.length !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Replace placeholder in annotator.tsx with Toolbar**

Add import:
```tsx
import { Toolbar } from '../components/annotator/Toolbar'
```

Remove the temporary placeholder div:
```tsx
// DELETE this:
<div style={{ color: '#fff', fontSize: 12 }}>
  <button onClick={() => loadSample()} style={{ marginRight: 8 }}>Load Sample</button>
  Annotator
</div>
```

Replace with:
```tsx
<Toolbar />
```

Also remove the `loadSample` import from `useAnnotatorStore` at the top of `AnnotatorRoute` if it's no longer used directly.

- [ ] **Step 3: Verify in browser**

1. "Sample Data" button → point cloud appears
2. "Load PCD" → file picker opens; load any `.pcd` file → point cloud updates
3. "View" / "Annotate" buttons toggle mode (BEV overlay cursor changes to crosshair in Annotate)
4. Draw several boxes, type labels in BoxList
5. "Export JSON" → browser downloads `annotations.json` with correct fields
6. Open the file — verify `version: "1.0"`, `position`, `size`, `rotation_yaw` present
7. "Export nuScenes" → downloads `annotations_nuscenes.json`
8. Open the file — verify `translation`, `size`, `rotation` (quaternion), `category_name` present
9. Export buttons are disabled when no annotations exist

- [ ] **Step 4: Commit**

```bash
git add src/components/annotator/Toolbar.tsx src/routes/annotator.tsx
git commit -m "feat(annotator): add Toolbar with mode toggle, PCD load, and dual-format export"
```

---

## Task 9: Final Integration + Verification

**Goal:** Confirm the full flow works end-to-end, run all tests, final commit.

- [ ] **Step 1: Run all tests**

```bash
pnpm test:run
```

Expected: `Tests  19 passed` (all 19 tests across 3 test files pass)

- [ ] **Step 2: Full end-to-end walkthrough in browser**

```bash
pnpm dev
```

Navigate to `/annotator` and verify this complete flow:

1. **Sample data load**: Click "Sample Data" → ~7600 blue points appear in left (3D) and right (BEV) viewports
2. **3D navigation**: Orbit, zoom, pan in left viewport with mouse; right viewport stays top-down
3. **BEV navigation**: Middle-click drag or right-drag in right viewport → pans BEV; scroll → zooms
4. **Draw box**: Click "Annotate" → cursor becomes crosshair in BEV → drag a rectangle around a vehicle cluster → orange dashed rect during drag → blue wireframe box appears in BOTH viewports on release
5. **Select box**: Click the box in 3D view → box turns orange, TransformControls arrows appear
6. **Translate box**: Drag the X/Z axis arrows → box moves in both views; BoxList shows updated position values
7. **Rotate box**: Press `R` key while TransformControls active → switch to rotate mode → drag to rotate yaw
8. **Edit in BoxList**: Type "car" in label field → box label updates; adjust W/D/H → box size changes in both views
9. **Delete box**: Click × in BoxList → box disappears from both views
10. **PCD file load**: Drag-and-drop a real `.pcd` file onto the Load PCD button → point cloud replaces sample data
11. **Export**: Draw 2-3 boxes, export both JSON and nuScenes → verify downloaded files are valid JSON with correct structure

- [ ] **Step 3: Verify no TypeScript errors in annotator files**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "annotator|Annotator" | head -20
```

Expected: no errors in annotator-related files (pre-existing errors in other files are acceptable).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(annotator): complete 3D point cloud annotation tool

- Dual-viewport layout: perspective 3D + BEV orthographic via drei View
- BEV draw-box overlay with pixel→world unprojection
- TransformControls for translate/rotate with OrbitControls conflict handling
- BoxList with label, size editing and delete
- Toolbar: mode toggle, PCD file load, sample data, export
- Export: custom JSON and nuScenes-compatible formats
- 19 unit tests: store (8), PCD parser (5), export utils (6)"
```
