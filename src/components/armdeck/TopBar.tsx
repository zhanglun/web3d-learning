import { ROBOTS } from '../../robots';

interface Props {
  robotId: string;
  onRobotChange: (id: string) => void;
  showAxes: boolean;
  onToggleAxes: (v: boolean) => void;
  ikEnabled: boolean;
  onToggleIK: (v: boolean) => void;
  onShare: () => void;
}

export function TopBar({ robotId, onRobotChange, showAxes, onToggleAxes, ikEnabled, onToggleIK, onShare }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 40,
        background: 'rgba(20,20,30,0.9)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 12px',
        zIndex: 10,
        fontSize: 13,
        color: '#ccc',
      }}
    >
      <span style={{ fontWeight: 600, color: '#fff' }}>ArmDeck</span>

      <select
        value={robotId}
        onChange={e => onRobotChange(e.target.value)}
        style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '2px 6px', borderRadius: 3 }}
      >
        {ROBOTS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      <label style={{ display: 'flex', gap: 5, cursor: 'pointer' }}>
        <input type="checkbox" checked={showAxes} onChange={e => onToggleAxes(e.target.checked)} />
        Axes
      </label>

      <label style={{ display: 'flex', gap: 5, cursor: 'pointer' }}>
        <input type="checkbox" checked={ikEnabled} onChange={e => onToggleIK(e.target.checked)} />
        IK
      </label>

      <div style={{ flex: 1 }} />

      <button
        onClick={onShare}
        style={{ background: '#334', color: '#aef', border: '1px solid #446', padding: '3px 10px', cursor: 'pointer', borderRadius: 3 }}
      >
        Share
      </button>
    </div>
  );
}
