export interface TrajectoryFrame {
  t: number;
  joints: Record<string, number>;
  ee: [number, number, number];
  action: [number, number, number];
}

export interface Trajectory {
  id: string;
  name: string;
  robot: string;
  createdAt: string;
  frames: TrajectoryFrame[];
}

export function exportLeRobot(traj: Trajectory): string {
  const obs = traj.frames.map(f => ({
    timestamp: f.t,
    joints: f.joints,
    ee_position: f.ee,
  }));
  const actions = traj.frames.map(f => ({
    timestamp: f.t,
    target: f.action,
  }));
  return JSON.stringify(
    {
      metadata: {
        robot: traj.robot,
        name: traj.name,
        created_at: traj.createdAt,
        fps: 30,
        format: 'lerobot-v1',
      },
      observations: obs,
      actions,
    },
    null,
    2
  );
}
