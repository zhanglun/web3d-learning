// src/components/solar-system/CameraController.tsx
// 相机控制 — 飞行动画 + 行星跟踪 + 自由缩放旋转

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { CameraPreset } from './types';

interface CameraControllerProps {
  flyToTarget: THREE.Vector3 | null;
  flyToDistance: number;
  onFlightComplete: () => void;
  preset: CameraPreset | null;
  followTarget: THREE.Vector3 | null;
  followDistance: number;
  isFollowing: boolean;
}

const FLIGHT_DURATION = 1.5;

export function CameraController({
  flyToTarget,
  flyToDistance,
  onFlightComplete,
  preset,
  followTarget,
  followDistance,
  isFollowing,
}: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const flightProgress = useRef<number | null>(null);
  const flightStart = useRef(new THREE.Vector3());
  const flightEnd = useRef(new THREE.Vector3());
  const flightTargetPoint = useRef(new THREE.Vector3());

  // 用 state 驱动 enabled，确保 React re-render
  const [isFlying, setIsFlying] = useState(false);

  useEffect(() => {
    if (flyToTarget) {
      flightStart.current.copy(camera.position);
      flightTargetPoint.current.copy(flyToTarget);
      const direction = new THREE.Vector3()
        .subVectors(camera.position, flyToTarget)
        .normalize();
      flightEnd.current.copy(flyToTarget).add(direction.multiplyScalar(flyToDistance));
      flightProgress.current = 0;
      setIsFlying(true);
    }
  }, [flyToTarget, flyToDistance, camera]);

  useEffect(() => {
    if (preset) {
      flightStart.current.copy(camera.position);
      flightEnd.current.set(...preset.position);
      flightTargetPoint.current.set(...preset.target);
      flightProgress.current = 0;
      setIsFlying(true);
    }
  }, [preset, camera]);

  useFrame((_, delta) => {
    if (flightProgress.current !== null) {
      flightProgress.current += delta / FLIGHT_DURATION;

      if (flightProgress.current >= 1) {
        flightProgress.current = null;
        camera.position.copy(flightEnd.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(flightTargetPoint.current);
          controlsRef.current.update();
        }
        setIsFlying(false);
        onFlightComplete();
      } else {
        const t = flightProgress.current;
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        camera.position.lerpVectors(flightStart.current, flightEnd.current, ease);
        if (controlsRef.current) {
          controlsRef.current.target.lerp(flightTargetPoint.current, ease);
          controlsRef.current.update();
        }
      }
      return;
    }

    // 跟踪模式：平滑移动 target 到行星位置，但不约束相机距离和角度
    if (isFollowing && followTarget && controlsRef.current) {
      controlsRef.current.target.lerp(followTarget, 0.05);
      controlsRef.current.update();
    }

    // 动态缩放速度：距离越远缩放步长越大
    if (controlsRef.current) {
      const distToTarget = camera.position.distanceTo(controlsRef.current.target);
      // 指数映射：近距离精细，远距离快速跨越
      controlsRef.current.zoomSpeed = Math.max(0.5, Math.pow(distToTarget, 0.4) * 0.3);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.1}
      maxDistance={15_000_000}
      enablePan
      enableRotate
      enableZoom
      enabled={!isFlying}
    />
  );
}
