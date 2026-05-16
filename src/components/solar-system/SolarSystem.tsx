// 太阳系主场景 — Canvas + 控制面板 + 行星列表 + 全局状态

import { useState, useCallback, useRef, Suspense } from 'react';
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
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<THREE.Vector3 | null>(null);
  const [flyToDistance, setFlyToDistance] = useState(0);
  const [activePreset, setActivePreset] = useState<CameraPreset | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  // 行星实时位置缓存（ref 避免高频 setState）
  const planetPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  const [followTarget, setFollowTarget] = useState<THREE.Vector3 | null>(null);

  // 行星实时位置回调（每帧触发）
  const handlePositionUpdate = useCallback((nameEn: string, position: THREE.Vector3) => {
    planetPositions.current.set(nameEn, position.clone());
    // 跟踪模式下同步更新 followTarget
    if (isFollowing && selectedPlanet?.nameEn === nameEn) {
      setFollowTarget(position.clone());
    }
  }, [isFollowing, selectedPlanet]);

  // 飞到指定行星（使用实时位置）
  const handlePlanetSelect = useCallback((planet: PlanetData) => {
    setSelectedPlanet(planet);
    setActivePreset(null);

    const currentPos = planetPositions.current.get(planet.nameEn)
      ?? new THREE.Vector3(planet.orbitRadius, 0, 0);

    setFlyToTarget(currentPos.clone());
    setFlyToDistance(planet.radius * 5);
    setIsFollowing(false);
  }, []);

  const handlePresetChange = useCallback((preset: CameraPreset) => {
    setActivePreset({ ...preset });
    setSelectedPlanet(null);
    setIsFollowing(false);
    setFollowTarget(null);
  }, []);

  const handleFlightComplete = useCallback(() => {
    setFlyToTarget(null);
    setActivePreset(null);
    // 飞行完成后进入跟踪模式
    if (selectedPlanet) {
      setIsFollowing(true);
    }
  }, [selectedPlanet]);

  const handleDeselect = useCallback(() => {
    setSelectedPlanet(null);
    setIsFollowing(false);
    setFollowTarget(null);
  }, []);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 8px',
    fontSize: '12px',
    background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
  });

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#000' }}>
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
        maxHeight: 'calc(100vh - 20px)',
        overflowY: 'auto',
      }}>
        {/* 行星聚焦按钮 */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>聚焦行星</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {PLANETS.map((planet) => (
              <button
                key={planet.nameEn}
                onClick={() => handlePlanetSelect(planet)}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  background: selectedPlanet?.nameEn === planet.nameEn
                    ? planet.color
                    : 'transparent',
                  color: 'white',
                  border: `1px solid ${planet.color}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                {planet.name}
              </button>
            ))}
          </div>
        </div>

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

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button onClick={() => setShowOrbits(!showOrbits)} style={btnStyle(showOrbits)}>
            轨道线
          </button>
          <button onClick={() => setShowLabels(!showLabels)} style={btnStyle(showLabels)}>
            标签
          </button>
          {selectedPlanet && (
            <button onClick={handleDeselect} style={{
              ...btnStyle(false),
              borderColor: selectedColor,
              color: selectedColor,
            }}>
              取消跟踪
            </button>
          )}
        </div>

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
        onPointerMissed={handleDeselect}
      >
        <Suspense fallback={null}>
          <CameraController
            flyToTarget={flyToTarget}
            flyToDistance={flyToDistance}
            onFlightComplete={handleFlightComplete}
            preset={activePreset}
            followTarget={followTarget}
            followDistance={selectedPlanet ? selectedPlanet.radius * 5 : 0}
            isFollowing={isFollowing}
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
              onDeselect={handleDeselect}
              onPositionUpdate={handlePositionUpdate}
            />
          ))}
          <AsteroidBelt />
        </Suspense>
      </Canvas>
    </div>
  );
}
