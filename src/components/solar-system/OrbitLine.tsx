// src/components/solar-system/OrbitLine.tsx
// 轨道线 — 圆形轨道的可视化

import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface OrbitLineProps {
  radius: number;
  visible: boolean;
}

const SEGMENTS = 128;

export function OrbitLine({ radius, visible }: OrbitLineProps) {
  if (!visible) return null;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ));
  }

  return (
    <Line
      points={points}
      color="#ffffff"
      lineWidth={0.5}
      opacity={0.3}
      transparent
    />
  );
}