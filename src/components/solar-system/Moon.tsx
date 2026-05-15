// 卫星组件 — 嵌套在行星坐标系内，自动绕行星公转

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { MoonData } from './types';

interface MoonProps {
  data: MoonData;
  speedMultiplier: number;
}

export function Moon({ data, speedMultiplier }: MoonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(data.textureUrl);

  useFrame((_, delta) => {
    // 公转
    if (groupRef.current) {
      groupRef.current.rotation.y += data.orbitSpeed * delta * speedMultiplier;
    }
    // 自转（同步自转，与公转周期相同）
    if (meshRef.current) {
      meshRef.current.rotation.y += data.orbitSpeed * delta * speedMultiplier;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        position={[data.orbitRadius, 0, 0]}
      >
        <sphereGeometry args={[data.radius, 32, 32]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
}