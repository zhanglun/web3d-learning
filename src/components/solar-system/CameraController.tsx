// src/components/solar-system/CameraController.tsx
// 相机控制 — 飞行动画 + 行星跟踪 + OrbitControls 动态缩放

import { useRef, useEffect } from 'react';
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
  const isFlying = useRef(false);

  // 飞向指定位置
  useEffect(() => {
    if (flyToTarget) {
      flightStart.current.copy(camera.position);
      flightTargetPoint.current.copy(flyToTarget);
      const direction = new THREE.Vector3()
        .subVectors(camera.position, flyToTarget)
        .normalize();
      flightEnd.current.copy(flyToTarget).add(direction.multiplyScalar(flyToDistance));
      flightProgress.current = 0;
      isFlying.current = true;
    }
  }, [flyToTarget, flyToDistance, camera]);

  // 预设视角飞行
  useEffect(() => {
    if (preset) {
      flightStart.current.copy(camera.position);
      flightEnd.current.set(...preset.position);
      flightTargetPoint.current.set(...preset.target);
      flightProgress.current = 0;
      isFlying.current = true;
    }
  }, [preset, camera]);

  useFrame((_, delta) => {
    // 飞行动画阶段
    if (flightProgress.current !== null) {
      flightProgress.current += delta / FLIGHT_DURATION;

      if (flightProgress.current >= 1) {
        flightProgress.current = null;
        isFlying.current = false;
        camera.position.copy(flightEnd.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(flightTargetPoint.current);
          controlsRef.current.update();
        }
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

    // 跟踪模式：持续跟随行星运动
    if (isFollowing && followTarget && controlsRef.current) {
      controlsRef.current.target.lerp(followTarget, 0.05);

      // 保持相机与目标的相对距离
      const currentDist = camera.position.distanceTo(followTarget);
      const ratio = followDistance / Math.max(currentDist, 0.001);
      if (Math.abs(ratio - 1) > 0.05) {
        const dir = new THREE.Vector3().subVectors(camera.position, followTarget).normalize();
        camera.position.copy(followTarget).add(dir.multiplyScalar(followDistance));
      }

      controlsRef.current.update();
    }

    // 动态缩放速度：基于相机到 OrbitControls target 的距离，对数映射
    if (controlsRef.current) {
      const distToTarget = camera.position.distanceTo(controlsRef.current.target);
      controlsRef.current.zoomSpeed = Math.max(0.1, Math.log10(Math.max(distToTarget, 1)) * 0.5);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={0.1}
      maxDistance={15_000_000}
      enabled={!isFlying.current}
    />
  );
}
