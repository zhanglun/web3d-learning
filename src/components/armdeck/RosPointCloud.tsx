import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { PointCloud2Msg } from '../../ros/types';
import { useRosTopicRef } from '../../ros/hooks';

const MAX_POINTS = 100_000;

/** Decode PointCloud2.data — handles both raw Uint8Array (CDR) and base64 string (JSON) */
function toArrayBuffer(data: Uint8Array | string): ArrayBuffer {
  if (typeof data === 'string') {
    const bin = atob(data);
    const buf = new ArrayBuffer(bin.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
    return buf;
  }
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

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

    const buf = toArrayBuffer(msg.data);
    const view = new DataView(buf);
    const step = msg.point_step || 12;
    const count = Math.min(msg.width * Math.max(msg.height, 1), MAX_POINTS);

    const xOff = msg.fields?.find(f => f.name === 'x')?.offset ?? 0;
    const yOff = msg.fields?.find(f => f.name === 'y')?.offset ?? 4;
    const zOff = msg.fields?.find(f => f.name === 'z')?.offset ?? 8;
    const le = !msg.is_bigendian;

    for (let i = 0; i < count; i++) {
      const base = i * step;
      if (base + zOff + 4 > buf.byteLength) break;
      positions[i * 3 + 0] = view.getFloat32(base + xOff, le);
      positions[i * 3 + 1] = view.getFloat32(base + yOff, le);
      positions[i * 3 + 2] = view.getFloat32(base + zOff, le);
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
      <pointsMaterial size={0.008} color="#00ccff" sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}
