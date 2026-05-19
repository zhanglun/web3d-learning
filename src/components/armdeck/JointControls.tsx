import type { URDFRobot, URDFJoint } from 'urdf-loader';

interface Props {
  robot: URDFRobot;
  joints: Record<string, number>;
  onChange: (name: string, value: number) => void;
}

export function JointControls({ robot, joints, onChange }: Props) {
  const movable = Object.values(robot.joints as Record<string, URDFJoint>).filter(
    j => j.jointType !== 'fixed'
  );

  return (
    <div style={{ padding: '8px', overflowY: 'auto', maxHeight: '100%' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#ccc' }}>Joints</h3>
      {movable.map(joint => {
        const lo = joint.limit?.lower ?? -Math.PI;
        const hi = joint.limit?.upper ?? Math.PI;
        const val = joints[joint.name] ?? 0;
        return (
          <div key={joint.name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa' }}>
              <span>{joint.name}</span>
              <span>{val.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={lo}
              max={hi}
              step={0.001}
              value={val}
              style={{ width: '100%' }}
              onChange={e => onChange(joint.name, parseFloat(e.target.value))}
            />
          </div>
        );
      })}
    </div>
  );
}
