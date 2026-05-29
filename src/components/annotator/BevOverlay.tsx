import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useAnnotatorStore } from './annotatorStore'

interface Props {
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

export function BevOverlay({ cameraRef }: Props) {
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
      // +0.75 = half the default box height (1.5m) so the bottom sits on the median ground point
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
