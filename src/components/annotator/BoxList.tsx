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
  const boxes      = useAnnotatorStore((s) => s.boxes)
  const selectedId = useAnnotatorStore((s) => s.selectedId)
  const selectBox  = useAnnotatorStore((s) => s.selectBox)
  const updateBox  = useAnnotatorStore((s) => s.updateBox)
  const deleteBox  = useAnnotatorStore((s) => s.deleteBox)

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
