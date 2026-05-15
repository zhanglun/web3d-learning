// src/components/solar-system/AsteroidBelt.tsx
// 小行星带 — 火星和木星之间，使用 InstancedMesh 高效渲染

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 小行星带参数（基于真实天文数据）
const BELT_INNER_RADIUS = 300_000;     // 内径 ≈ 3 亿 km（火星轨道外）
const BELT_OUTER_RADIUS = 450_000;     // 外径 ≈ 4.5 亿 km（木星轨道内）
const ASTEROID_COUNT = 3000;           // 小行星数量（真实有数百万，取代表性样本）
const ASTEROID_MIN_SIZE = 0.01;        // 最小尺寸（Three.js 单位）
const ASTEROID_MAX_SIZE = 0.5;         // 最大尺寸

export function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 生成小行星的随机位置和大小
  const asteroids = useMemo(() => {
    return Array.from({ length: ASTEROID_COUNT }, () => {
      const radius = BELT_INNER_RADIUS + Math.random() * (BELT_OUTER_RADIUS - BELT_INNER_RADIUS);
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 10_000; // 上下散布
      const size = ASTEROID_MIN_SIZE + Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE);
      return { radius, angle, y, size, speed: 0.00001 + Math.random() * 0.00002 };
    });
  }, []);

  // 初始化实例位置
  useMemo(() => {
    if (!meshRef.current) return;
    asteroids.forEach((asteroid, i) => {
      dummy.position.set(
        Math.cos(asteroid.angle) * asteroid.radius,
        asteroid.y,
        Math.sin(asteroid.angle) * asteroid.radius
      );
      dummy.scale.setScalar(asteroid.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [asteroids, dummy]);

  // 公转动画
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    asteroids.forEach((asteroid, i) => {
      asteroid.angle += asteroid.speed * delta;
      dummy.position.set(
        Math.cos(asteroid.angle) * asteroid.radius,
        asteroid.y,
        Math.sin(asteroid.angle) * asteroid.radius
      );
      dummy.scale.setScalar(asteroid.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ASTEROID_COUNT]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#888888" roughness={0.9} />
    </instancedMesh>
  );
}