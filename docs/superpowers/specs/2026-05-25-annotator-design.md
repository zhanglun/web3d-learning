# 3D Point Cloud Annotation Tool — Design Spec

Date: 2026-05-25  
Route: `/annotator`  
Purpose: Portfolio piece demonstrating Three.js depth for robotics annotation platform interviews.

---

## 1. Layout

Three-row layout, single R3F Canvas:

```
┌──────────────────────────────────────────────────────┐
│  Toolbar: [View|Annotate] [Load PCD] [Sample] [Export▼] │
├─────────────────────────┬────────────────────────────┤
│                         │                            │
│   3D Perspective View   │   BEV Top-Down View        │
│   PerspectiveCamera     │   OrthographicCamera       │
│   OrbitControls         │   Canvas 2D draw overlay   │
│   TransformControls     │   (annotate mode only)     │
│   (when box selected)   │                            │
│                         │                            │
├─────────────────────────┴────────────────────────────┤
│  BoxList: label input / select highlight / delete     │
└──────────────────────────────────────────────────────┘
```

The two viewports share one R3F Canvas via `@react-three/drei` `<View>`. Point cloud BufferGeometry is created once and rendered in both viewports.

---

## 2. File Structure

```
src/
├── routes/annotator.tsx
├── components/annotator/
│   ├── types.ts
│   ├── annotatorStore.ts
│   ├── pcdParser.ts
│   ├── sampleData.ts
│   ├── exportUtils.ts
│   ├── Toolbar.tsx
│   ├── PointCloud.tsx
│   ├── AnnotationBox3D.tsx
│   ├── BevView.tsx
│   ├── BevOverlay.tsx
│   └── BoxList.tsx
```

Registered in `src/main.tsx` as `{ path: "/annotator", element: <AnnotatorRoute /> }` and linked from root nav.

---

## 3. Core Types

```ts
// types.ts
export interface AnnotationBox {
  id: string
  position: [number, number, number]  // center x, y, z (Three.js coords)
  size: [number, number, number]       // width, depth, height (meters)
  rotation: number                     // yaw in radians (around Y axis)
  label: string
}

export interface AnnotatorState {
  pointCloud: Float32Array | null      // flat [x,y,z, x,y,z, ...] array
  boxes: AnnotationBox[]
  selectedId: string | null
  mode: 'view' | 'annotate'
}
```

---

## 4. Zustand Store (`annotatorStore.ts`)

```ts
interface AnnotatorStore extends AnnotatorState {
  loadPointCloud: (data: Float32Array) => void
  loadSample: () => void
  addBox: (box: Omit<AnnotationBox, 'id'>) => void
  updateBox: (id: string, patch: Partial<Omit<AnnotationBox, 'id'>>) => void
  deleteBox: (id: string) => void
  selectBox: (id: string | null) => void
  setMode: (mode: 'view' | 'annotate') => void
}
```

IDs generated via `crypto.randomUUID()`.

---

## 5. PCD Parser (`pcdParser.ts`)

Supports ASCII and binary PCD files (ROS standard). Binary-compressed is out of scope.

**Algorithm:**
1. Read file header lines to extract: `FIELDS`, `TYPE`, `SIZE`, `DATA` (ascii | binary)
2. Locate column indices for `x`, `y`, `z` in the FIELDS list
3. **ASCII**: split data section line by line, parse floats at the x/y/z indices
4. **Binary**: use `DataView` to read each point's x/y/z as `float32` at the correct byte offset (stride = sum of all field sizes)
5. Return `Float32Array` of flat `[x, y, z, x, y, z, ...]` values

Invalid/NaN points are filtered out.

---

## 6. Sample Data (`sampleData.ts`)

Programmatically generates a "parking lot" scene (~8000 points, no external file):
- Ground plane: random XZ points at y ≈ 0
- Three vehicle clusters: rectangular dense point groups at known positions
- Slight Gaussian noise added to all points

Returns `Float32Array` in the same format as the PCD parser.

---

## 7. BEV Coordinate Conversion (`BevOverlay.tsx`)

BEV uses OrthographicCamera looking straight down (position `[0, 20, 0]`, lookAt `[0, 0, 0]`).

Draw-box flow:
1. `pointerdown` on overlay → record start pixel `(px0, py0)`
2. `pointermove` → draw dashed rectangle on Canvas 2D context
3. `pointerup` → convert two corner pixels to world XZ:
   ```
   ndcX = (px / width) * 2 - 1
   ndcZ = -(py / height) * 2 + 1
   worldX = ndcX * frustumHalfWidth   (frustumHalfWidth = ortho camera right)
   worldZ = ndcZ * frustumHalfHeight
   ```
4. Compute center and size from the two corners
5. Call `addBox({ position: [cx, yCenter, cz], size: [w, 2.0, d], rotation: 0, label: '' })`

`yCenter` is estimated as the median Y of the loaded point cloud.

---

## 8. 3D Box + TransformControls (`AnnotationBox3D.tsx`)

Each box renders as a wireframe using `EdgesGeometry` wrapping a `BoxGeometry` (12 edges, clean lines, no diagonal faces).

When the box is selected (`id === selectedId`):
- Mount `<TransformControls>` in **translate** or **rotate** mode (user toggles with `T` / `R` keys, or toolbar buttons). Scale mode is intentionally disabled — box size is edited via numeric inputs in BoxList instead.
- Listen to `onChange` event → read `object.position` and `object.rotation.y` → call `updateBox` (size is not touched by TransformControls)
- While TransformControls is dragging (`onMouseDown`/`onMouseUp`), set OrbitControls `enabled={false}` to prevent camera movement conflict

Box color: default `#44aaff`, selected `#ffaa00`.

---

## 9. Export (`exportUtils.ts`)

**Custom JSON:**
```json
{
  "version": "1.0",
  "annotations": [
    {
      "id": "uuid",
      "label": "car",
      "position": { "x": 1.2, "y": 0.75, "z": -3.4 },
      "size": { "width": 2.0, "depth": 4.5, "height": 1.5 },
      "rotation_yaw": 0.523
    }
  ]
}
```

**nuScenes-compatible JSON:**
```json
[
  {
    "token": "uuid",
    "translation": [1.2, 0.75, -3.4],
    "size": [2.0, 4.5, 1.5],
    "rotation": [0.966, 0, 0, 0.259],
    "category_name": "car",
    "velocity": [0, 0]
  }
]
```

Yaw → quaternion: `qw = cos(yaw/2)`, `qz = sin(yaw/2)`, `qx = qy = 0`.

Both formats use `URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))` to trigger browser download.

---

## 10. Testing

| File | Tests |
|------|-------|
| `pcdParser.test.ts` | ASCII parse, binary parse, missing fields graceful error, NaN filtering |
| `exportUtils.test.ts` | Custom JSON field names, nuScenes quaternion conversion, empty annotations |
| `annotatorStore.test.ts` | addBox generates ID, updateBox partial patch, deleteBox, selectBox, setMode |

---

## 11. Dependencies

No new npm packages needed. All already in project:
- `three`, `@react-three/fiber`, `@react-three/drei` — 3D rendering + View + TransformControls
- `zustand` — state management
- `react-router-dom` — routing
- `vitest` + `jsdom` — testing
