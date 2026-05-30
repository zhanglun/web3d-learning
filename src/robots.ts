import { assetUrl } from './assetUrl';

export interface RobotDef {
  id: string;
  name: string;
  urdf: string;
  toolFrame: string;
  defaultJoints: Record<string, number>;
  ikDefaultTarget: [number, number, number];
}

export const ROBOTS: RobotDef[] = [
  {
    id: 'ur5e',
    name: 'UR5e',
    urdf: assetUrl('/urdf/ur5e/ur5e.urdf'),
    toolFrame: 'tool0',
    defaultJoints: {
      shoulder_pan_joint: 0,
      shoulder_lift_joint: -1.57,
      elbow_joint: 1.57,
      wrist_1_joint: -1.57,
      wrist_2_joint: -1.57,
      wrist_3_joint: 0,
    },
    ikDefaultTarget: [0.3, 0.5, 0.3],
  },
];

export const DEFAULT_ROBOT = ROBOTS[0];
