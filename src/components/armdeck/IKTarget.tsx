import { useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  initialPosition: [number, number, number];
  onMove: (pos: THREE.Vector3) => void;
  status: 'idle' | 'ok' | 'fail';
}

export function IKTarget({ initialPosition, onMove, status }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);

  const color = status === 'ok' ? '#00ff88' : status === 'fail' ? '#ff3333' : '#ffff00';

  return (
    <TransformControls
      mode="translate"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onObjectChange={(e: any) => {
        const obj = e?.target?.object as THREE.Object3D | undefined;
        if (obj) onMove(obj.position);
      }}
    >
      <mesh ref={meshRef} position={initialPosition}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
    </TransformControls>
  );
}
