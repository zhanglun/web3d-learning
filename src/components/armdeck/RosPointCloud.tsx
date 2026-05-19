import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { PointCloud2Msg } from '../../ros/types';
import { useRosTopicRef } from '../../ros/hooks';

const MAX_POINTS = 100_000;

interface Props {
  visible: boolean;
}

export function RosPointCloud({ visible }: Props) {
  const msgRef = useRosTopicRef<PointCloud2Msg>('/pointcloud');
  const geomRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => new Float32Array(MAX_POINTS * 3), []);

  useFrame(() => {
    if (!visible || !geomRef.current) return;
    const msg = msgRef.current;
    if (!msg?.data) return;

    const view = new DataView(
      msg.data instanceof Uint8Array ? msg.data.buffer : msg.data
    );
    const step = msg.point_step;
    const count = Math.min(msg.width * msg.height, MAX_POINTS);

    const xOff = msg.fields.find(f => f.name === 'x')?.offset ?? 0;
    const yOff = msg.fields.find(f => f.name === 'y')?.offset ?? 4;
    const zOff = msg.fields.find(f => f.name === 'z')?.offset ?? 8;

    for (let i = 0; i < count; i++) {
      const base = i * step;
      positions[i * 3 + 0] = view.getFloat32(base + xOff, true);
      positions[i * 3 + 1] = view.getFloat32(base + yOff, true);
      positions[i * 3 + 2] = view.getFloat32(base + zOff, true);
    }

    const attr = geomRef.current.attributes.position as THREE.BufferAttribute;
    attr.needsUpdate = true;
    geomRef.current.setDrawRange(0, count);
  });

  return (
    <points visible={visible}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={MAX_POINTS} />
      </bufferGeometry>
      <pointsMaterial size={0.01} color="#00ccff" sizeAttenuation />
    </points>
  );
}
