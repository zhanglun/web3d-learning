// 太阳 — 自发光球体 + 点光源

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SUN } from './constants';
import { assetUrl } from '../../assetUrl';

export function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(assetUrl(SUN.textureUrl));

  // 自转动画
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01 * delta;
    }
  });

  return (
    <group>
      {/* 自发光球体 */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[SUN.radius, 64, 64]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {/* 点光源 — 照亮所有行星 */}
      <pointLight
        intensity={2}
        decay={0}
        distance={0}
      />
      {/* 环境光补充 — 保证背阴面不完全黑暗 */}
      <ambientLight intensity={0.08} />
    </group>
  );
}