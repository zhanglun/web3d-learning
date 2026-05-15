// 太阳系主场景 — Canvas + 控制面板 + 行星列表 + 全局状态

import { useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Sun } from './Sun';
import { Planet } from './Planet';
import { AsteroidBelt } from './AsteroidBelt';
import { CameraController } from './CameraController';
import { PlanetList } from './PlanetList';
import { PLANETS, CAMERA_PRESETS } from './constants';
import type { PlanetData, CameraPreset } from './types';

export default function SolarSystem() {
  // 全局状态（useState 上提，不引入 Context）
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<THREE.Vector3 | null>(null);
  const [flyToDistance, setFlyToDistance] = useState(0);
  const [activePreset, setActivePreset] = useState<CameraPreset | null>(null);

  // 飞到指定行星
  const handlePlanetSelect = useCallback((planet: PlanetData) => {
    setSelectedPlanet(planet);
    // 计算行星当前轨道位置（简化：使用初始角度 0）
    const position = new THREE.Vector3(planet.orbitRadius, 0, 0);
    setFlyToTarget(position);
    setFlyToDistance(planet.radius * 5);
  }, []);

  // 预设视角切换
  const handlePresetChange = useCallback((preset: CameraPreset) => {
    setActivePreset({ ...preset });  // 触发 re-render
    setSelectedPlanet(null);
  }, []);

  // 飞行完成回调
  const handleFlightComplete = useCallback(() => {
    setFlyToTarget(null);
    setActivePreset(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#000' }}>
      {/* 页面标注 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '11px',
        fontFamily: 'sans-serif',
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        ⚡ 大小和距离均为真实天文比例（1 单位 = 1,000 km）
      </div>

      {/* 行星列表面板 */}
      <PlanetList
        planets={PLANETS}
        selectedPlanet={selectedPlanet}
        onSelect={handlePlanetSelect}
      />

      {/* 控制面板 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10,
        background: 'rgba(0, 0, 0, 0.75)',
        borderRadius: '8px',
        padding: '12px',
        color: 'white',
        fontFamily: 'sans-serif',
        minWidth: '200px',
      }}>
        {/* 速度控制 */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            速度: {speedMultiplier.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* 开关按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setShowOrbits(!showOrbits)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: showOrbits ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            轨道线
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: showLabels ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            标签
          </button>
        </div>

        {/* 预设视角 */}
        <div>
          <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>预设视角</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetChange(preset)}
                style={{
                  padding: '3px 6px',
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        gl={{ logarithmicDepthBuffer: true }}
        camera={{
          fov: 60,
          near: 0.01,
          far: 10_000_000,
          position: [0, 300_000, 400_000],
        }}
        onPointerMissed={() => setSelectedPlanet(null)}
      >
        <Suspense fallback={null}>
          <CameraController
            flyToTarget={flyToTarget}
            flyToDistance={flyToDistance}
            onFlightComplete={handleFlightComplete}
            preset={activePreset}
          />
          <Stars radius={8_000_000} depth={50} count={5000} factor={4} />
          <Sun />
          {PLANETS.map((planet) => (
            <Planet
              key={planet.nameEn}
              data={planet}
              speedMultiplier={speedMultiplier}
              showOrbits={showOrbits}
              showLabels={showLabels}
              isSelected={selectedPlanet?.nameEn === planet.nameEn}
              onSelect={handlePlanetSelect}
              onDeselect={() => setSelectedPlanet(null)}
            />
          ))}
          <AsteroidBelt />
        </Suspense>
      </Canvas>
    </div>
  );
}