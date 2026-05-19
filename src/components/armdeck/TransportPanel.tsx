import { useState } from 'react';
import type { Trajectory } from '../../recording/trajectory';
import { exportLeRobot } from '../../recording/trajectory';

type PanelState = 'idle' | 'recording' | 'reviewing' | 'playback';

interface Props {
  frameCount: number;
  isRecording: boolean;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onSave: (name: string) => Promise<void>;
  onDiscard: () => void;
  savedList: Trajectory[];
  onPlay: (traj: Trajectory) => void;
  onStopPlay: () => void;
  isPlaying: boolean;
  playbackTime: number;
  playbackDuration: number;
  playbackSpeed: number;
  onSpeedChange: (s: number) => void;
  onRefreshList: () => void;
  onDelete: (id: string) => void;
}

export function TransportPanel({
  frameCount,
  isRecording,
  onStartRecord,
  onStopRecord,
  onSave,
  onDiscard,
  savedList,
  onPlay,
  onStopPlay,
  isPlaying,
  playbackTime,
  playbackDuration,
  playbackSpeed,
  onSpeedChange,
  onRefreshList,
  onDelete,
}: Props) {
  const [saveName, setSaveName] = useState('take-1');
  const [saving, setSaving] = useState(false);

  const panel: PanelState = isPlaying
    ? 'playback'
    : isRecording
    ? 'recording'
    : frameCount > 0
    ? 'reviewing'
    : 'idle';

  const handleSave = async () => {
    setSaving(true);
    await onSave(saveName);
    setSaving(false);
    onRefreshList();
  };

  return (
    <div style={{ padding: 10, color: '#ccc', fontSize: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>Transport</h3>

      {panel === 'idle' && (
        <>
          <button
            onClick={onStartRecord}
            style={{ background: '#c00', color: '#fff', border: 'none', padding: '6px 14px', cursor: 'pointer', borderRadius: 4 }}
          >
            Record
          </button>
          <div style={{ marginTop: 10 }}>
            <div style={{ color: '#888', marginBottom: 4 }}>Saved ({savedList.length})</div>
            {savedList.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <button onClick={() => onPlay(t)} style={btnStyle}>▶</button>
                <button
                  onClick={() => {
                    const blob = new Blob([exportLeRobot(t)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${t.name}.json`;
                    a.click();
                  }}
                  style={btnStyle}
                >
                  ↓
                </button>
                <button onClick={() => onDelete(t.id)} style={{ ...btnStyle, color: '#f55' }}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {panel === 'recording' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f00', animation: 'pulse 1s infinite' }} />
            <span>Recording — {frameCount} frames</span>
          </div>
          <button onClick={onStopRecord} style={btnStyle}>Stop</button>
        </div>
      )}

      {panel === 'reviewing' && (
        <div>
          <div style={{ marginBottom: 8 }}>{frameCount} frames captured</div>
          <input
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            style={{ width: '100%', marginBottom: 6, background: '#333', color: '#fff', border: '1px solid #555', padding: '4px 6px' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, flex: 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={onDiscard} style={{ ...btnStyle, flex: 1, color: '#f88' }}>Discard</button>
          </div>
        </div>
      )}

      {panel === 'playback' && (
        <div>
          <div style={{ marginBottom: 6 }}>
            {playbackTime.toFixed(2)}s / {playbackDuration.toFixed(2)}s
          </div>
          <input
            type="range"
            min={0}
            max={playbackDuration}
            step={0.01}
            value={playbackTime}
            readOnly
            style={{ width: '100%', marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={onStopPlay} style={btnStyle}>■ Stop</button>
            <label style={{ color: '#aaa' }}>
              Speed
              <select
                value={playbackSpeed}
                onChange={e => onSpeedChange(parseFloat(e.target.value))}
                style={{ marginLeft: 4, background: '#333', color: '#fff', border: '1px solid #555' }}
              >
                {[0.25, 0.5, 1, 2].map(s => (
                  <option key={s} value={s}>{s}x</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.2 } }`}</style>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#333',
  color: '#ccc',
  border: '1px solid #555',
  padding: '3px 8px',
  cursor: 'pointer',
  borderRadius: 3,
};
