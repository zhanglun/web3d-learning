import { useState } from 'react';
import { rosBridge } from '../../ros/bridge';
import { useRosStatus, useTopicHz, useRosTopic } from '../../ros/hooks';
import type { TFMessage } from '../../ros/types';

const TOPICS = ['/joint_states', '/pointcloud', '/tf'] as const;

function TopicRow({ topic }: { topic: string }) {
  const hz = useTopicHz(topic);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: 11, marginBottom: 3 }}>
      <span style={{ fontFamily: 'monospace' }}>{topic}</span>
      <span style={{
        color: hz > 0 ? '#4f4' : '#444',
        fontFamily: 'monospace',
        minWidth: 40,
        textAlign: 'right',
      }}>
        {hz > 0 ? `${hz} Hz` : '—'}
      </span>
    </div>
  );
}

function TFFrameList() {
  const msg = useRosTopic<TFMessage>('/tf');
  const frames = msg?.transforms ?? [];
  if (frames.length === 0) return <div style={{ color: '#444', fontSize: 11 }}>No frames</div>;
  return (
    <div style={{ maxHeight: 100, overflowY: 'auto' }}>
      {frames.map(tf => (
        <div key={tf.child_frame_id} style={{ fontSize: 10, color: '#888', fontFamily: 'monospace', marginBottom: 1 }}>
          <span style={{ color: '#666' }}>{tf.header.frame_id}</span>
          <span style={{ color: '#555' }}> → </span>
          <span style={{ color: '#aaa' }}>{tf.child_frame_id}</span>
        </div>
      ))}
    </div>
  );
}

function validateWsUrl(url: string): string | null {
  if (!url.trim()) return 'URL is required';
  if (!/^wss?:\/\/.+/.test(url)) return 'Must start with ws:// or wss://';
  return null;
}

interface Props {
  showPointCloud: boolean;
  onTogglePointCloud: (v: boolean) => void;
  rosJointControl: boolean;
  onToggleRosJoints: (v: boolean) => void;
  showTF: boolean;
  onToggleTF: (v: boolean) => void;
}

export function RosPanel({
  showPointCloud, onTogglePointCloud,
  rosJointControl, onToggleRosJoints,
  showTF, onToggleTF,
}: Props) {
  const [url, setUrl] = useState('ws://localhost:8765');
  const [urlError, setUrlError] = useState<string | null>(null);
  const status = useRosStatus();
  const connected = status === 'connected';

  const handleConnect = () => {
    const err = validateWsUrl(url);
    if (err) { setUrlError(err); return; }
    setUrlError(null);
    rosBridge.connect(url);
  };

  const handleDisconnect = () => {
    rosBridge.disconnect();
  };

  const statusColor: Record<typeof status, string> = {
    connected: '#4f4',
    connecting: '#ff0',
    error: '#f44',
    disconnected: '#555',
  };

  return (
    <div style={{ padding: 10, color: '#ccc', fontSize: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#fff' }}>ROS2 Bridge</h3>

      {/* URL input */}
      <input
        value={url}
        onChange={e => { setUrl(e.target.value); setUrlError(null); }}
        onKeyDown={e => { if (e.key === 'Enter' && !connected) handleConnect(); }}
        disabled={connected || status === 'connecting'}
        style={{
          width: '100%',
          marginBottom: urlError ? 2 : 6,
          background: urlError ? '#3a1a1a' : '#2a2a3a',
          color: '#fff',
          border: `1px solid ${urlError ? '#f44' : '#555'}`,
          padding: '4px 6px',
          boxSizing: 'border-box',
          borderRadius: 3,
          fontSize: 11,
        }}
        placeholder="ws://localhost:8765"
      />
      {urlError && (
        <div style={{ color: '#f66', fontSize: 10, marginBottom: 4 }}>{urlError}</div>
      )}

      {/* Connect / Disconnect */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {!connected ? (
          <button
            onClick={handleConnect}
            disabled={status === 'connecting'}
            style={{ flex: 1, background: '#224', color: '#aef', border: '1px solid #446', padding: '5px 0', cursor: 'pointer', borderRadius: 3, fontSize: 12 }}
          >
            {status === 'connecting' ? 'Connecting…' : 'Connect'}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            style={{ flex: 1, background: '#422', color: '#faa', border: '1px solid #644', padding: '5px 0', cursor: 'pointer', borderRadius: 3, fontSize: 12 }}
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: statusColor[status],
          boxShadow: status === 'connected' ? `0 0 6px ${statusColor.connected}` : 'none',
        }} />
        <span style={{ color: '#888', fontSize: 11 }}>{status}</span>
        {status === 'error' && (
          <span style={{ color: '#f44', fontSize: 10, marginLeft: 4 }}>↻ retrying…</span>
        )}
      </div>

      {/* Topics */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: '#555', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Topics</div>
        {TOPICS.map(t => <TopicRow key={t} topic={t} />)}
      </div>

      {/* TF frame tree */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: '#555', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>TF Frames</div>
        <TFFrameList />
      </div>

      {/* Toggles */}
      <div style={{ borderTop: '1px solid #333', paddingTop: 8 }}>
        <div style={{ color: '#555', fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Visualization</div>
        {([
          ['Drive joints from /joint_states', rosJointControl, onToggleRosJoints],
          ['Show point cloud', showPointCloud, onTogglePointCloud],
          ['Show TF frames', showTF, onToggleTF],
        ] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter]) => (
          <label key={label} style={{ display: 'flex', gap: 8, cursor: 'pointer', marginBottom: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} />
            <span style={{ fontSize: 11 }}>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
