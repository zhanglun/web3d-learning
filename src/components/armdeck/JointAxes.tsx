import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFRobot, URDFJoint } from 'urdf-loader';

interface Props {
  robot: URDFRobot;
  visible: boolean;
}

export function JointAxes({ robot, visible }: Props) {
  const { scene } = useThree();
  const helpersRef = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    if (!visible) {
      helpersRef.current.forEach(h => h.visible = false);
      return;
    }

    // Clear existing
    helpersRef.current.forEach(h => {
      h.parent?.remove(h);
    });
    helpersRef.current = [];

    Object.values(robot.joints as Record<string, URDFJoint>).forEach(joint => {
      const axes = new THREE.AxesHelper(0.05);
      joint.add(axes);
      helpersRef.current.push(axes);
    });

    return () => {
      helpersRef.current.forEach(h => {
        h.parent?.remove(h);
      });
      helpersRef.current = [];
    };
  }, [robot, visible, scene]);

  return null;
}
