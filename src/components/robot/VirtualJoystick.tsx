import { useRef, useEffect, useCallback } from 'react'
import { Topic } from 'roslib'
import { useRobotStore } from '../../store/robotStore'

const SIZE = 120
const KNOB_R = 18
const MAX_OFFSET = SIZE / 2 - KNOB_R - 4

export function VirtualJoystick() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)
  const knob = useRef({ x: 0, y: 0 })
  const cmdVelRef = useRef<Topic | null>(null)

  const ros = useRobotStore(s => s.ros)
  const maxLinearSpeed = useRobotStore(s => s.maxLinearSpeed)
  const maxAngularSpeed = useRobotStore(s => s.maxAngularSpeed)

  useEffect(() => {
    if (!ros) { cmdVelRef.current = null; return }
    cmdVelRef.current = new Topic({
      ros,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/Twist',
    })
    return () => { cmdVelRef.current = null }
  }, [ros])

  const publish = useCallback((nx: number, ny: number) => {
    cmdVelRef.current?.publish({
      linear: { x: -ny * maxLinearSpeed, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: -nx * maxAngularSpeed },
    })
  }, [maxLinearSpeed, maxAngularSpeed])

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2)
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#111'
    ctx.fill()
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
        publish(0, 0)  // IMPORTANT: stop the robot on release
        draw()
      }}
    />
  )
}
