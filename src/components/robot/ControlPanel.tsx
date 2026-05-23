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
