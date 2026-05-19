import { useState } from 'react';
import { rosBridge } from '../../ros/bridge';
import { useRosStatus, useTopicHz } from '../../ros/hooks';

const TOPICS = ['/joint_states', '/pointcloud', '/tf'];

interface Props {
  showPointCloud: boolean;
  onTogglePointCloud: (v: boolean) => void;
  rosJointControl: boolean;
  onToggleRosJoints: (v: boolean) => void;
}

function TopicRow({ topic }: { topic: string }) {
  const hz = useTopicHz(topic);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: 11, marginBottom: 3 }}>
      <span>{topic}</span>
      <span style={{ color: hz > 0 ? '#0f0' : '#555' }}>{hz} Hz</span>
    </div>
  );
}

export function RosPanel({ showPointCloud, onTogglePointCloud, rosJointControl, onToggleRosJoints }: Props) {
  const [url, setUrl] = useState('ws://localhost:8765');
  const status = useRosStatus();

  const connected = status === 'connected';

  return (
    <div style={{ padding: 10, color: '#ccc', fontSize: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>ROS2 Bridge</h3>

      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        style={{ width: '100%', marginBottom: 6, background: '#333', color: '#fff', border: '1px solid #555', padding: '4px 6px', boxSizing: 'border-box' }}
        placeholder="ws://localhost:8765"
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => connected ? rosBridge.disconnect() : rosBridge.connect(url)}
          style={{
            flex: 1,
            background: connected ? '#553' : '#335',
            color: '#fff',
            border: 'none',
            padding: '5px 0',
            cursor: 'pointer',
            borderRadius: 3,
          }}
        >
          {connected ? 'Disconnect' : status === 'connecting' ? 'Connecting…' : 'Connect'}
        </button>
      </div>

      <div style={{
        display: 'inline-block',
        width: 8, height: 8, borderRadius: '50%',
        background: status === 'connected' ? '#0f0' : status === 'connecting' ? '#ff0' : status === 'error' ? '#f00' : '#555',
        marginRight: 6,
      }} />
      <span style={{ color: '#888' }}>{status}</span>

      <div style={{ marginTop: 12 }}>
        <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>Topics</div>
        {TOPICS.map(t => <TopicRow key={t} topic={t} />)}
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
          <input type="checkbox" checked={rosJointControl} onChange={e => onToggleRosJoints(e.target.checked)} />
          Drive joints from ROS
        </label>
        <label style={{ display: 'flex', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={showPointCloud} onChange={e => onTogglePointCloud(e.target.checked)} />
          Show point cloud
        </label>
      </div>
    </div>
  );
}
