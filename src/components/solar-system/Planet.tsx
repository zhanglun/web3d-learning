// 通用行星组件 — 公转、自转、纹理、点击交互、卫星、标记

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { PlanetData } from './types';
import { Moon } from './Moon';
import { PlanetMarker } from './PlanetMarker';
import { PlanetLabel } from './PlanetLabel';
import { PlanetInfoCard } from './PlanetInfoCard';
import { OrbitLine } from './OrbitLine';

interface PlanetProps {
  data: PlanetData;
  speedMultiplier: number;
  showOrbits: boolean;
  showLabels: boolean;
  isSelected: boolean;
  onSelect: (planet: PlanetData) => void;
  onDeselect: () => void;
  onPositionUpdate?: (nameEn: string, position: THREE.Vector3) => void;
}

export function Planet({
  data,
  speedMultiplier,
  showOrbits,
  showLabels,
  isSelected,
  onSelect,
  onDeselect,
  onPositionUpdate,
}: PlanetProps) {
  // orbitGroup 绕太阳公转，meshGroup 在轨道位置上
  const orbitGroupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useTexture(data.textureUrl);

  // 获取行星在世界空间中的当前位置（用于 PlanetMarker）
  const worldPosition = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    // 公转
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += data.orbitSpeed * delta * speedMultiplier;
    }
    // 自转
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed * delta * speedMultiplier;
    }
    // 更新世界坐标
    if (meshRef.current) {
      meshRef.current.getWorldPosition(worldPosition.current);
      // 上报实时位置给父组件（用于相机跟踪）
      onPositionUpdate?.(data.nameEn, worldPosition.current);
    }
  });

  return (
    <>
      {/* 轨道线 */}
      <OrbitLine radius={data.orbitRadius} visible={showOrbits} />

      {/* 公转组 — 绕原点（太阳）旋转 */}
      <group ref={orbitGroupRef}>
        <group position={[data.orbitRadius, 0, 0]}>
          {/* 行星球体 */}
          <mesh
            ref={meshRef}
            rotation={[data.tilt, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(data);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = 'auto';
            }}
          >
            <sphereGeometry args={[data.radius, 64, 64]} />
            <meshStandardMaterial
              map={texture}
              emissive={hovered ? new THREE.Color(data.color) : undefined}
              emissiveIntensity={hovered ? 0.15 : 0}
            />
          </mesh>

          {/* 土星环 */}
          {data.hasRing && data.ringTextureUrl && (
            <mesh rotation={[Math.PI / 2 + data.tilt, 0, 0]}>
              <ringGeometry args={[
                data.ringInnerRadius ?? data.radius * 1.2,
                data.ringOuterRadius ?? data.radius * 2.3,
                64
              ]} />
              <meshStandardMaterial
                map={useTexture(data.ringTextureUrl)}
                side={THREE.DoubleSide}
                transparent
                opacity={0.8}
              />
            </mesh>
          )}

          {/* 名称标签 */}
          <PlanetLabel name={data.name} visible={showLabels} />

          {/* 信息卡片 */}
          {isSelected && (
            <PlanetInfoCard planet={data} onClose={onDeselect} />
          )}

          {/* 卫星 */}
          {data.moons?.map((moon) => (
            <Moon key={moon.name} data={moon} speedMultiplier={speedMultiplier} />
          ))}
        </group>
      </group>

      {/* 远距离标记 — 需要世界坐标，放在组件顶层 */}
      <PlanetMarker planet={data} planetPosition={worldPosition.current} />
    </>
  );
}