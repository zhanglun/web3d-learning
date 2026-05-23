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
