import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import URDFLoader from 'urdf-loader';
import type { URDFRobot } from 'urdf-loader';
import * as THREE from 'three';

interface Props {
  urdf: string;
  joints: Record<string, number>;
  onLoaded: (robot: URDFRobot) => void;
}

export function URDFRobotModel({ urdf, joints, onLoaded }: Props) {
  const { scene } = useThree();
  const robotRef = useRef<URDFRobot | null>(null);
  const groupRef = useRef<THREE.Group>(new THREE.Group());

  useEffect(() => {
    const loader = new URDFLoader();
    loader.load(urdf, (robot: URDFRobot) => {
      // ROS uses Z-up; Three.js uses Y-up
      robot.rotation.x = -Math.PI / 2;
      robot.updateMatrixWorld(true);
      groupRef.current.add(robot);
      robotRef.current = robot;
      onLoaded(robot);
    });

    const group = groupRef.current;
    scene.add(group);
    return () => {
      scene.remove(group);
    };
  }, [urdf, scene, onLoaded]);

  useEffect(() => {
    const robot = robotRef.current;
    if (!robot) return;
    Object.entries(joints).forEach(([name, value]) => {
      robot.setJointValue(name, value);
    });
  }, [joints]);

  return null;
}
