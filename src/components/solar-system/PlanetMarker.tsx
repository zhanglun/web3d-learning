// 远距离行星标记 — 当行星在当前视距下不可见时，显示固定像素大小的发光点

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetData } from './types';

interface PlanetMarkerProps {
  planet: PlanetData;
  planetPosition: THREE.Vector3;
}

// 切换阈值：相机距离 > 行星半径 × 50 时显示标记
const MARKER_THRESHOLD = 50;

export function PlanetMarker({ planet, planetPosition }: PlanetMarkerProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();

  // 创建发光点纹理（运行时生成，不依赖外部资源）
  const spriteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    // 绘制发光点
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, planet.color);
    gradient.addColorStop(0.3, planet.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, [planet.color]);

  useFrame(() => {
    if (!spriteRef.current) return;

    const distance = camera.position.distanceTo(planetPosition);
    const threshold = planet.radius * MARKER_THRESHOLD;

    if (distance > threshold) {
      spriteRef.current.visible = true;
      // 固定屏幕空间大小（根据距离缩放 sprite）
      const scale = distance * 0.01;
      spriteRef.current.scale.set(scale, scale, 1);
    } else {
      spriteRef.current.visible = false;
    }
  });

  return (
    <sprite ref={spriteRef} position={planetPosition}>
      <spriteMaterial
        map={spriteTexture}
        transparent
        depthTest={false}
        sizeAttenuation
      />
    </sprite>
  );
}