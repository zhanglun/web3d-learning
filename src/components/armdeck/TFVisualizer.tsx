import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { TFMessage } from '../../ros/types';
import { useRosTopicRef } from '../../ros/hooks';

interface Props {
  visible: boolean;
}

const AXIS_SIZE = 0.08;

export function TFVisualizer({ visible }: Props) {
  const msgRef = useRosTopicRef<TFMessage>('/tf');
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
    const msg = msgRef.current;
    if (!msg?.transforms) return;

    msg.transforms.forEach(tf => {
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

  return <group ref={groupRef} visible={visible} />;
}
