import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { TFMessage } from '../../ros/types';
import { useRosTopicRef } from '../../ros/hooks';

interface Props {
  visible: boolean;
}

const AXIS_SIZE = 0.08;
// ROS uses Z-up; Three.js uses Y-up. R_x(-PI/2) maps ROS→Three.js.
const ROS_TO_THREEJS = new THREE.Euler(-Math.PI / 2, 0, 0);

export function TFVisualizer({ visible }: Props) {
  const tfRef = useRosTopicRef<TFMessage>('/tf');
  const tfStaticRef = useRosTopicRef<TFMessage>('/tf_static');
  const groupRef = useRef<THREE.Group>(null);
  const helpersRef = useRef<Map<string, THREE.AxesHelper>>(new Map());

  useEffect(() => {
    return () => {
      helpersRef.current.forEach(h => h.parent?.remove(h));
      helpersRef.current.clear();
    };
  }, []);

  useFrame(() => {
    if (!visible || !groupRef.current) return;

    const allTransforms = [
      ...(tfRef.current?.transforms ?? []),
      ...(tfStaticRef.current?.transforms ?? []),
    ];
    if (allTransforms.length === 0) return;

    allTransforms.forEach(tf => {
      const id = tf.child_frame_id;
      let helper = helpersRef.current.get(id);
      if (!helper) {
        helper = new THREE.AxesHelper(AXIS_SIZE);
        groupRef.current!.add(helper);
        helpersRef.current.set(id, helper);
      }

      const t = tf.transform.translation;
      const q = tf.transform.rotation;
      helper.position.set(t.x, t.y, t.z);
      helper.quaternion.set(q.x, q.y, q.z, q.w);
      helper.visible = true;
    });
  });

  // group rotation converts ROS Z-up space → Three.js Y-up
  return <group ref={groupRef} visible={visible} rotation={ROS_TO_THREEJS} />;
}
