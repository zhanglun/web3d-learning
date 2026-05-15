// src/components/solar-system/CameraController.tsx
// 相机控制 — 飞行动画 + OrbitControls 动态缩放速度

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { CameraPreset } from './types';

interface CameraControllerProps {
  flyToTarget: THREE.Vector3 | null;  // 飞行目标位置（世界坐标）
  flyToDistance: number;               // 飞行到目标后的观察距离
  onFlightComplete: () => void;
  preset: CameraPreset | null;         // 预设视角
}

// 飞行动画参数
const FLIGHT_DURATION = 1.5;           // 飞行时间（秒）

export function CameraController({
  flyToTarget,
  flyToDistance,
  onFlightComplete,
  preset,
}: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null); // OrbitControls 引用
  const flightProgress = useRef<number | null>(null);
  const flightStart = useRef(new THREE.Vector3());
  const flightEnd = useRef(new THREE.Vector3());
  const flyToTargetRef = useRef<THREE.Vector3 | null>(null);

  // 处理飞向行星的请求
  useEffect(() => {
    if (flyToTarget) {
      flyToTargetRef.current = flyToTarget.clone();
      flightStart.current.copy(camera.position);
      // 计算终点：在目标位置偏移一定距离
      const direction = new THREE.Vector3().subVectors(camera.position, flyToTarget).normalize();
      flightEnd.current.copy(flyToTarget).add(direction.multiplyScalar(flyToDistance));
      flightProgress.current = 0;
    }
  }, [flyToTarget, flyToDistance, camera]);

  // 处理预设视角
  useEffect(() => {
    if (preset) {
      flightStart.current.copy(camera.position);
      flightEnd.current.set(...preset.position);
      flyToTargetRef.current = new THREE.Vector3(...preset.target);
      flightProgress.current = 0;
    }
  }, [preset, camera]);

  useFrame((_, delta) => {
    // 飞行动画
    if (flightProgress.current !== null) {
      flightProgress.current += delta / FLIGHT_DURATION;

      if (flightProgress.current >= 1) {
        flightProgress.current = null;
        camera.position.copy(flightEnd.current);
        if (controlsRef.current && flyToTargetRef.current) {
          controlsRef.current.target.copy(flyToTargetRef.current);
          controlsRef.current.update();
        }
        onFlightComplete();
        return;
      }

      // easeInOutCubic 缓动
      const t = flightProgress.current;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      camera.position.lerpVectors(flightStart.current, flightEnd.current, ease);

      // 同步 OrbitControls target
      if (controlsRef.current && flyToTargetRef.current) {
        controlsRef.current.target.lerp(flyToTargetRef.current, ease);
        controlsRef.current.update();
      }
    }

    // 动态缩放速度（根据距离调整 OrbitControls 缩放灵敏度）
    if (controlsRef.current) {
      const distance = camera.position.length();
      // 指数缩放：距离越远，缩放步长越大
      controlsRef.current.zoomSpeed = Math.pow(distance, 0.3) * 0.01;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={0.1}
      maxDistance={15_000_000}
      // 禁用飞行时的用户控制
      enabled={flightProgress.current === null}
    />
  );
}