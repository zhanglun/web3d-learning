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
  const mode           = useAnnotatorStore((s) => s.mode)
  const setMode        = useAnnotatorStore((s) => s.setMode)
  const loadSample     = useAnnotatorStore((s) => s.loadSample)
  const loadPointCloud = useAnnotatorStore((s) => s.loadPointCloud)
  const boxes          = useAnnotatorStore((s) => s.boxes)

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
