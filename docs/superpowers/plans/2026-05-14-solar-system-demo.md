# 太阳系 Demo 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 web3d-learning 项目中实现一个基于 R3F 的真实比例太阳系 3D Demo，包含完整行星、卫星、小行星带，以及对数深度缓冲 + 导航辅助系统。

**Spec:** `docs/superpowers/specs/2026-05-14-solar-system-demo-design.md`

**Tech Stack:** React 19 + TypeScript + Vite + @react-three/fiber + @react-three/drei + Three.js

**Important Constraints:**
- 所有代码注释使用简体中文
- 每次修改前需要和用户确认
- 真实天文比例（1 单位 = 1000 km），不做缩放
- 全局状态用 useState 上提，不引入 Context
- 飞行动画用 useFrame 插值，不引入动画库

---

## File Structure

```
src/
  routes/
    solar-system.tsx                    # 路由入口（修改）
  components/
    solar-system/
      SolarSystem.tsx                   # 主场景（Canvas + 控制面板 + 行星列表）
      Sun.tsx                           # 太阳（自发光球体 + PointLight）
      Planet.tsx                        # 通用行星组件（公转 + 自转 + 纹理 + onClick）
      PlanetMarker.tsx                  # 远距离发光点标记
      OrbitLine.tsx                     # 轨道线
      PlanetLabel.tsx                   # 行星名称标签
      PlanetInfoCard.tsx                # 信息卡片
      PlanetList.tsx                    # 行星列表面板（HTML overlay）
      CameraController.tsx             # 相机控制（飞行动画 + 动态缩放）
      AsteroidBelt.tsx                  # 小行星带（InstancedMesh）
      Moon.tsx                          # 卫星组件
      constants.ts                      # 行星数据常量
      types.ts                          # TypeScript 类型定义
public/
  textures/                             # 纹理贴图目录
```

---

## Task 1: 安装依赖 + 类型定义 + 天文数据常量

**Files:**
- `src/components/solar-system/types.ts` (新建)
- `src/components/solar-system/constants.ts` (新建)
- `package.json` (修改)

### Step 1: 安装 R3F 依赖

```bash
npm install @react-three/fiber @react-three/drei
```

### Step 2: 创建类型定义文件 `src/components/solar-system/types.ts`

```typescript
// 天体数据的 TypeScript 类型定义

export interface MoonData {
  name: string;           // 卫星名称
  radius: number;         // 卫星半径（Three.js 单位，1 单位 = 1000 km）
  orbitRadius: number;    // 轨道半径（Three.js 单位）
  orbitSpeed: number;     // 公转速度（弧度/秒）
  textureUrl: string;     // 纹理贴图路径
}

export interface PlanetInfo {
  diameter: string;           // 直径
  distanceFromSun: string;    // 距太阳距离
  orbitalPeriod: string;      // 公转周期
  description: string;        // 简短描述
}

export interface PlanetData {
  name: string;              // 行星名称（中文）
  nameEn: string;            // 英文名
  radius: number;            // 球体半径（Three.js 单位）
  orbitRadius: number;       // 轨道半径（Three.js 单位）
  orbitSpeed: number;        // 公转速度（弧度/秒）
  rotationSpeed: number;     // 自转速度（弧度/秒）
  textureUrl: string;        // 纹理贴图路径
  tilt: number;              // 自转轴倾斜角（弧度）
  color: string;             // 标识颜色（用于行星列表和标记）
  hasRing?: boolean;         // 是否有行星环
  ringTextureUrl?: string;   // 行星环纹理路径
  ringInnerRadius?: number;  // 行星环内径
  ringOuterRadius?: number;  // 行星环外径
  info: PlanetInfo;          // 行星详细信息
  moons?: MoonData[];        // 卫星列表
}

export interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  description: string;
}
```

### Step 3: 创建天文数据常量 `src/components/solar-system/constants.ts`

所有数据基于真实天文参数，换算基准：1 Three.js 单位 = 1000 km。

```typescript
import type { PlanetData, CameraPreset } from './types';

// 行星数据数组
export const PLANETS: PlanetData[] = [
  {
    name: '水星',
    nameEn: 'Mercury',
    radius: 2.44,           // 真实半径 2,439.7 km
    orbitRadius: 57_900,    // 真实轨道半径 57,900,000 km
    orbitSpeed: 0.000826,   // 公转周期 88 天 → 2π / (88 × 86400) 弧度/秒
    rotationSpeed: 0.000017, // 自转周期 58.6 天
    textureUrl: '/textures/mercury.jpg',
    tilt: 0.001,            // 几乎无倾斜
    color: '#b5b5b5',
    info: {
      diameter: '4,879 km',
      distanceFromSun: '5,790 万 km',
      orbitalPeriod: '88 天',
      description: '太阳系最小的行星，也是距离太阳最近的行星。表面布满陨石坑，温差极大。',
    },
  },
  {
    name: '金星',
    nameEn: 'Venus',
    radius: 6.05,           // 真实半径 6,051.8 km
    orbitRadius: 108_200,   // 108,200,000 km
    orbitSpeed: 0.000323,   // 公转周期 224.7 天
    rotationSpeed: 0.000004, // 自转周期 243 天（逆向自转）
    textureUrl: '/textures/venus.jpg',
    tilt: 3.096,            // 177.4° 倾斜（几乎倒转）
    color: '#e8cda0',
    info: {
      diameter: '12,104 km',
      distanceFromSun: '1.082 亿 km',
      orbitalPeriod: '224.7 天',
      description: '太阳系最热的行星，浓厚的大气层产生极强的温室效应。自转方向与多数行星相反。',
    },
  },
  {
    name: '地球',
    nameEn: 'Earth',
    radius: 6.37,           // 真实半径 6,371 km
    orbitRadius: 149_600,   // 149,600,000 km（1 AU）
    orbitSpeed: 0.000199,   // 公转周期 365.25 天
    rotationSpeed: 0.000073, // 自转周期 23.93 小时
    textureUrl: '/textures/earth.jpg',
    tilt: 0.409,            // 23.44° 倾斜
    color: '#4a90d9',
    info: {
      diameter: '12,742 km',
      distanceFromSun: '1.496 亿 km',
      orbitalPeriod: '365.25 天',
      description: '我们的家园，太阳系中唯一已知存在生命的行星。拥有液态水和保护性磁场。',
    },
    moons: [
      {
        name: '月球',
        radius: 1.737,       // 真实半径 1,737.4 km
        orbitRadius: 384,    // 384,400 km
        orbitSpeed: 0.00266, // 公转周期 27.3 天
        textureUrl: '/textures/moon.jpg',
      },
    ],
  },
  {
    name: '火星',
    nameEn: 'Mars',
    radius: 3.39,           // 真实半径 3,389.5 km
    orbitRadius: 227_900,   // 227,900,000 km
    orbitSpeed: 0.000106,   // 公转周期 687 天
    rotationSpeed: 0.000071, // 自转周期 24.6 小时
    textureUrl: '/textures/mars.jpg',
    tilt: 0.44,             // 25.19° 倾斜
    color: '#c1440e',
    info: {
      diameter: '6,779 km',
      distanceFromSun: '2.279 亿 km',
      orbitalPeriod: '687 天',
      description: '红色星球，拥有太阳系最高的山（奥林帕斯山）和最长的峡谷（水手号峡谷）。',
    },
  },
  {
    name: '木星',
    nameEn: 'Jupiter',
    radius: 69.9,           // 真实半径 69,911 km
    orbitRadius: 778_500,   // 778,500,000 km
    orbitSpeed: 0.0000167,  // 公转周期 11.86 年
    rotationSpeed: 0.00175, // 自转周期 9.93 小时（太阳系最快）
    textureUrl: '/textures/jupiter.jpg',
    tilt: 0.055,            // 3.13° 倾斜
    color: '#c88b3a',
    info: {
      diameter: '139,822 km',
      distanceFromSun: '7.785 亿 km',
      orbitalPeriod: '11.86 年',
      description: '太阳系最大的行星，质量是其他所有行星总和的 2.5 倍。大红斑是持续数百年的风暴。',
    },
  },
  {
    name: '土星',
    nameEn: 'Saturn',
    radius: 58.2,           // 真实半径 58,232 km
    orbitRadius: 1_434_000, // 1,434,000,000 km
    orbitSpeed: 0.00000676, // 公转周期 29.46 年
    rotationSpeed: 0.00163, // 自转周期 10.7 小时
    textureUrl: '/textures/saturn.jpg',
    tilt: 0.467,            // 26.73° 倾斜
    color: '#ead6a6',
    hasRing: true,
    ringTextureUrl: '/textures/saturn-ring.png',
    ringInnerRadius: 66.9,  // 土星环内径 ≈ 66,900 km
    ringOuterRadius: 140.2, // 土星环外径 ≈ 140,200 km（A 环外缘）
    info: {
      diameter: '116,464 km',
      distanceFromSun: '14.34 亿 km',
      orbitalPeriod: '29.46 年',
      description: '以壮观的环系统著称，主要由冰和岩石碎片组成。密度低于水，是太阳系密度最小的行星。',
    },
  },
  {
    name: '天王星',
    nameEn: 'Uranus',
    radius: 25.4,           // 真实半径 25,362 km
    orbitRadius: 2_871_000, // 2,871,000,000 km
    orbitSpeed: 0.00000236, // 公转周期 84 年
    rotationSpeed: 0.00101, // 自转周期 17.24 小时
    textureUrl: '/textures/uranus.jpg',
    tilt: 1.706,            // 97.77° 倾斜（几乎侧躺）
    color: '#7ec8e3',
    info: {
      diameter: '50,724 km',
      distanceFromSun: '28.71 亿 km',
      orbitalPeriod: '84 年',
      description: '冰巨星，自转轴几乎平躺在轨道面上。大气中的甲烷赋予其独特的蓝绿色。',
    },
  },
  {
    name: '海王星',
    nameEn: 'Neptune',
    radius: 24.6,           // 真实半径 24,622 km
    orbitRadius: 4_495_000, // 4,495,000,000 km
    orbitSpeed: 0.00000121, // 公转周期 165 年
    rotationSpeed: 0.00109, // 自转周期 16.11 小时
    textureUrl: '/textures/neptune.jpg',
    tilt: 0.494,            // 28.32° 倾斜
    color: '#4b70dd',
    info: {
      diameter: '49,244 km',
      distanceFromSun: '44.95 亿 km',
      orbitalPeriod: '165 年',
      description: '太阳系最远的行星，拥有太阳系最强的风速（可达 2,100 km/h）。深蓝色外观。',
    },
  },
  {
    name: '冥王星',
    nameEn: 'Pluto',
    radius: 1.19,           // 真实半径 1,188.3 km
    orbitRadius: 5_906_000, // 5,906,000,000 km
    orbitSpeed: 0.000000821, // 公转周期 248 年
    rotationSpeed: 0.000158, // 自转周期 6.39 天
    textureUrl: '/textures/pluto.jpg',
    tilt: 2.01,             // 115° 倾斜
    color: '#c4a882',
    info: {
      diameter: '2,377 km',
      distanceFromSun: '59.06 亿 km',
      orbitalPeriod: '248 年',
      description: '2006 年被重新分类为矮行星。拥有心形氮冰平原（汤博区），表面地质多样。',
    },
  },
];

// 太阳数据
export const SUN = {
  radius: 696,             // 真实半径 696,000 km
  textureUrl: '/textures/sun.jpg',
};

// 相机预设视角
export const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: '全景',
    position: [0, 300_000, 400_000],
    target: [0, 0, 0],
    description: '俯瞰内行星区域',
  },
  {
    name: '内行星',
    position: [0, 40_000, 60_000],
    target: [0, 0, 0],
    description: '水星~火星清晰可见',
  },
  {
    name: '外行星',
    position: [0, 1_000_000, 2_000_000],
    target: [0, 0, 0],
    description: '木星~海王星可见',
  },
  {
    name: '侧视图',
    position: [600_000, 0, 0],
    target: [0, 0, 0],
    description: '从黄道面水平观察',
  },
];
```

### Step 4: 验证

```bash
npx tsc --noEmit src/components/solar-system/types.ts src/components/solar-system/constants.ts
```

预期：无类型错误。

---

## Task 2: 基础 UI 组件（PlanetList + PlanetInfoCard + PlanetLabel + OrbitLine）

这些组件无 3D 依赖或依赖简单，可并行开发。

### Step 2.1: 创建 `PlanetList.tsx`（HTML overlay 组件）

```typescript
// src/components/solar-system/PlanetList.tsx
// 行星列表面板 — Canvas 外部的 HTML overlay，真实比例下的核心导航入口

import type { PlanetData } from './types';

interface PlanetListProps {
  planets: PlanetData[];
  selectedPlanet: PlanetData | null;
  onSelect: (planet: PlanetData) => void;
}

export function PlanetList({ planets, selectedPlanet, onSelect }: PlanetListProps) {
  return (
    <div style={{
      position: 'absolute',
      top: '60px',
      left: '10px',
      zIndex: 10,
      background: 'rgba(0, 0, 0, 0.75)',
      borderRadius: '8px',
      padding: '12px',
      color: 'white',
      fontFamily: 'sans-serif',
      maxHeight: 'calc(100vh - 80px)',
      overflowY: 'auto',
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>天体列表</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {planets.map((planet) => (
          <li
            key={planet.nameEn}
            onClick={() => onSelect(planet)}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              borderRadius: '4px',
              marginBottom: '2px',
              background: selectedPlanet?.nameEn === planet.nameEn
                ? 'rgba(255, 255, 255, 0.2)'
                : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: planet.color,
              display: 'inline-block',
              flexShrink: 0,
            }} />
            {planet.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Step 2.2: 创建 `PlanetLabel.tsx`

```typescript
// src/components/solar-system/PlanetLabel.tsx
// 行星名称标签 — 使用 drei <Html> 在 3D 空间中渲染

import { Html } from '@react-three/drei';

interface PlanetLabelProps {
  name: string;
  visible: boolean;
}

export function PlanetLabel({ name, visible }: PlanetLabelProps) {
  if (!visible) return null;

  return (
    <Html
      position={[0, 5, 0]}
      center
      style={{
        color: 'white',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        textShadow: '0 0 4px rgba(0,0,0,0.8)',
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </Html>
  );
}
```

### Step 2.3: 创建 `PlanetInfoCard.tsx`

```typescript
// src/components/solar-system/PlanetInfoCard.tsx
// 行星信息卡片 — 选中行星后在行星旁弹出

import { Html } from '@react-three/drei';
import type { PlanetData } from './types';

interface PlanetInfoCardProps {
  planet: PlanetData;
  onClose: () => void;
}

export function PlanetInfoCard({ planet, onClose }: PlanetInfoCardProps) {
  return (
    <Html
      position={[0, planet.radius * 1.5 + 5, 0]}
      center
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '8px',
        padding: '16px',
        color: 'white',
        fontFamily: 'sans-serif',
        minWidth: '220px',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{planet.name}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px',
          }}
        >
          ✕
        </button>
      </div>
      <table style={{ fontSize: '12px', borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <tr><td style={{ color: '#aaa', paddingRight: '8px' }}>直径</td><td>{planet.info.diameter}</td></tr>
          <tr><td style={{ color: '#aaa', paddingRight: '8px' }}>距太阳</td><td>{planet.info.distanceFromSun}</td></tr>
          <tr><td style={{ color: '#aaa', paddingRight: '8px' }}>公转周期</td><td>{planet.info.orbitalPeriod}</td></tr>
        </tbody>
      </table>
      <p style={{ fontSize: '12px', color: '#ccc', marginTop: '8px', lineHeight: '1.4' }}>
        {planet.info.description}
      </p>
    </Html>
  );
}
```

### Step 2.4: 创建 `OrbitLine.tsx`

```typescript
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
```

### Step 2.5: 验证

```bash
npx tsc --noEmit
```

预期：无类型错误。

---

## Task 3: 太阳组件 + 行星组件 + 卫星组件 + 远距离标记

核心 3D 渲染组件。

### Step 3.1: 创建 `Sun.tsx`

```typescript
// src/components/solar-system/Sun.tsx
// 太阳 — 自发光球体 + 点光源

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SUN } from './constants';

export function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(SUN.textureUrl);

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
```

### Step 3.2: 创建 `Moon.tsx`

```typescript
// src/components/solar-system/Moon.tsx
// 卫星组件 — 嵌套在行星坐标系内，自动绕行星公转

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { MoonData } from './types';

interface MoonProps {
  data: MoonData;
  speedMultiplier: number;
}

export function Moon({ data, speedMultiplier }: MoonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(data.textureUrl);

  useFrame((_, delta) => {
    // 公转
    if (groupRef.current) {
      groupRef.current.rotation.y += data.orbitSpeed * delta * speedMultiplier;
    }
    // 自转
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02 * delta * speedMultiplier;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        position={[data.orbitRadius, 0, 0]}
      >
        <sphereGeometry args={[data.radius, 32, 32]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
}
```

### Step 3.3: 创建 `PlanetMarker.tsx`

```typescript
// src/components/solar-system/PlanetMarker.tsx
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
```

### Step 3.4: 创建 `Planet.tsx`（核心行星组件）

```typescript
// src/components/solar-system/Planet.tsx
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
}

export function Planet({
  data,
  speedMultiplier,
  showOrbits,
  showLabels,
  isSelected,
  onSelect,
  onDeselect,
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
```

### Step 3.5: 验证

```bash
npx tsc --noEmit
```

预期：无类型错误。

---

## Task 4: 相机控制器 + 小行星带

### Step 4.1: 创建 `CameraController.tsx`

```typescript
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
const CAMERA_SPEED_EXPONENT = 1.5;     // 缩放速度指数（越大，远距离缩放越快）

export function CameraController({
  flyToTarget,
  flyToDistance,
  onFlightComplete,
  preset,
}: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null); // OrbitControls ref
  const flightProgress = useRef<number | null>(null);  // null = 未在飞行
  const flightStart = useRef(new THREE.Vector3());
  const flightEnd = useRef(new THREE.Vector3());

  // 预设视角切换
  useEffect(() => {
    if (!preset) return;
    flightStart.current.copy(camera.position);
    flightEnd.current.set(...preset.position);
    flightProgress.current = 0;
  }, [preset, camera]);

  // 飞行动画触发
  useEffect(() => {
    if (!flyToTarget) return;

    flightStart.current.copy(camera.position);

    // 计算飞行终点：在目标位置附近，偏移一定距离
    const direction = new THREE.Vector3()
      .subVectors(camera.position, flyToTarget)
      .normalize();
    flightEnd.current.copy(
      flyToTarget.clone().add(direction.multiplyScalar(flyToDistance))
    );

    flightProgress.current = 0;
  }, [flyToTarget, flyToDistance, camera]);

  useFrame((_, delta) => {
    // 飞行动画
    if (flightProgress.current !== null) {
      flightProgress.current += delta / FLIGHT_DURATION;

      if (flightProgress.current >= 1) {
        flightProgress.current = null;
        camera.position.copy(flightEnd.current);
        if (controlsRef.current && flyToTarget) {
          controlsRef.current.target.copy(flyToTarget);
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
      if (controlsRef.current && flyToTarget) {
        controlsRef.current.target.lerp(flyToTarget, ease);
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
```

### Step 4.2: 创建 `AsteroidBelt.tsx`

```typescript
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
```

### Step 4.3: 验证

```bash
npx tsc --noEmit
```

---

## Task 5: 主场景组件 + 路由注册

### Step 5.1: 创建 `SolarSystem.tsx`（主场景）

```typescript
// src/components/solar-system/SolarSystem.tsx
// 太阳系主场景 — Canvas + 控制面板 + 行星列表 + 全局状态

import { useState, useCallback } from 'react';
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
```

注意：需要在文件顶部添加 `import { Suspense } from 'react';`。

### Step 5.2: 创建路由入口 `src/routes/solar-system.tsx`

```typescript
// src/routes/solar-system.tsx
// 太阳系 Demo 路由入口

import SolarSystem from '../components/solar-system/SolarSystem';

export default function SolarSystemRoute() {
  return <SolarSystem />;
}
```

### Step 5.3: 注册路由 — 修改 `src/main.tsx`

在 import 区域添加：
```typescript
import SolarSystemRoute from "./routes/solar-system";
```

在 `children` 数组中添加：
```typescript
{
  path: "/solar-system",
  element: <SolarSystemRoute />,
},
```

### Step 5.4: 添加导航链接 — 修改 `src/routes/root.tsx`

在 `<nav>` 的 `<ul>` 列表中添加：
```html
<li>
  <a href="/solar-system">Solar System</a>
</li>
```

### Step 5.5: 验证

```bash
npx tsc --noEmit
```

---

## Task 6: 纹理资源

### Step 6.1: 创建纹理目录

```bash
mkdir -p public/textures
```

### Step 6.2: 下载纹理

从 Solar System Scope 免费纹理库下载 2K 分辨率纹理：

```bash
# 太阳系纹理（来自 solarsystemscope.com/textures/）
# 下载地址：https://www.solarsystemscope.com/textures/
# 需要 2K 分辨率版本

# 建议文件列表（手动下载后放入 public/textures/）：
# sun.jpg, mercury.jpg, venus.jpg, earth.jpg, mars.jpg
# jupiter.jpg, saturn.jpg, saturn-ring.png, uranus.jpg
# neptune.jpg, pluto.jpg, moon.jpg
```

> ⚡ 注意：纹理需要手动从 https://www.solarsystemscope.com/textures/ 下载并放入 `public/textures/` 目录。代码中已使用 `useTexture` hook 加载，支持 Suspense loading。

### Step 6.3: 验证

```bash
ls public/textures/
```

预期：12 个纹理文件。

---

## Task 7: 端到端验证

### Step 7.1: TypeScript 编译检查

```bash
npx tsc --noEmit
```

预期：0 错误。

### Step 7.2: Vite 开发服务器启动

```bash
npm run dev
```

预期：服务器正常启动，无编译错误。

### Step 7.3: 浏览器功能验证

访问 `http://localhost:5173/solar-system`，验证：

- [ ] Canvas 渲染正常（星空背景 + 太阳 + 行星可见）
- [ ] 行星列表面板显示在左侧
- [ ] 点击行星名称 → 相机飞行动画正常
- [ ] 飞到行星附近后 → 纹理球体可见
- [ ] 点击行星 → 信息卡片弹出
- [ ] 控制面板 slider 控制速度正常
- [ ] 轨道线 / 标签开关正常
- [ ] 预设视角按钮正常
- [ ] 土星环可见
- [ ] 小行星带可见
- [ ] 月球绕地球公转
- [ ] 页面底部标注「大小和距离均为真实天文比例」
- [ ] 导航栏链接可正常跳转

---

## Execution Order & Parallelization

```
Task 1 (依赖安装 + 类型 + 常量)
  ↓
Task 2 (UI 组件) ── 并行 ── Task 3 (3D 组件) ── 并行 ── Task 4 (相机 + 小行星带)
  ↓                 ↓                    ↓
  └─────────────── 汇合 ─────────────────┘
                     ↓
              Task 5 (主场景 + 路由)
                     ↓
              Task 6 (纹理资源)
                     ↓
              Task 7 (端到端验证)
```

Task 1 必须先完成（提供类型和常量）。Task 2/3/4 可并行。Task 5 依赖 2/3/4。Task 6 独立（可在任意时间完成）。Task 7 最后执行。
