import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import type { IKSystem } from '../../ik/solver';

const _robotWorldInv = new THREE.Matrix4();
const _localTarget = new THREE.Vector3();

interface Props {
  robot: URDFRobot;
  ikSystem: IKSystem;
  targetWorldPos: React.RefObject<THREE.Vector3>;
  onStatus: (status: 'ok' | 'fail') => void;
}

export function IKRunner({ robot, ikSystem, targetWorldPos, onStatus }: Props) {
  useFrame(() => {
    const target = targetWorldPos.current;
    if (!target) return;

    // Transform world target → robot base-frame (account for ROS Z-up rotation)
    robot.updateMatrixWorld(true);
    _robotWorldInv.copy(robot.matrixWorld).invert();
    _localTarget.copy(target).applyMatrix4(_robotWorldInv);

    ikSystem.setWorldTarget(_localTarget.x, _localTarget.y, _localTarget.z);
    const ok = ikSystem.solve();
    ikSystem.apply();
    onStatus(ok ? 'ok' : 'fail');
  });

  return null;
}
