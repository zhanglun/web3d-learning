# 太阳系 Demo 设计文档

## 概述

在 web3d-learning 项目中新增一个太阳系 3D Demo，使用 React Three Fiber（@react-three/fiber）+ drei 构建。展示完整太阳系（八大行星、冥王星、主要卫星、小行星带），采用真实纹理贴图和真实大小比例，支持丰富的交互功能。

**用途**：Three.js 学习 + Portfolio 作品展示。

**技术栈**：React 19 + TypeScript + Vite + @react-three/fiber + @react-three/drei + Three.js

## 新增依赖

| 包名 | 用途 |
|------|------|
| `@react-three/fiber` | React 渲染器，将 Three.js 组件化 |
| `@react-three/drei` | 工具集（OrbitControls、Stars、Html、useTexture、Line 等） |

## 文件结构

```
src/
  routes/
    solar-system.tsx              # 路由页面组件（入口）
  components/
    solar-system/
      SolarSystem.tsx             # 主场景组件（Canvas + 控制面板）
      Sun.tsx                     # 太阳（自发光球体 + PointLight）
      Planet.tsx                  # 通用行星组件（公转 + 自转 + 纹理 + onClick）
      PlanetMarker.tsx            # 远距离行星标记（发光点 + 名称，屏幕空间固定大小）
      OrbitLine.tsx               # 轨道线（drei <Line>）
      PlanetLabel.tsx             # 行星名称标签（drei <Html>）
      PlanetInfoCard.tsx          # 点击行星后弹出信息卡片（drei <Html>）
      PlanetList.tsx              # 行星列表面板（HTML overlay，Canvas 外部）
      CameraController.tsx        # 相机控制（飞行动画 + 动态缩放速度）
      AsteroidBelt.tsx            # 小行星带（InstancedMesh）
      Moon.tsx                    # 卫星组件（嵌套在行星坐标系内）
      constants.ts                # 行星数据（大小、距离、速度、纹理路径、信息）
      textures.ts                 # 纹理加载辅助（useTexture 封装）
```

## 天体范围

完整版太阳系：

- **太阳**：自发光球体 + PointLight 光源
- **八大行星**：水星、金星、地球、火星、木星、土星、天王星、海王星
- **冥王星**：矮行星
- **主要卫星**：月球（地球）、土卫六（土星）等主要卫星
- **小行星带**：火星和木星之间的小行星带，使用 InstancedMesh 实例化渲染
- **土星环**：使用 RingGeometry + 半透明纹理

## 大小与距离比例

**采用真实天文比例**，不做对数缩放或手动微调。行星半径和轨道半径基于真实天文数据。

> ⚡ 页面标注「大小和距离均为真实天文比例」。

**换算基准**：1 Three.js 单位 = 1,000 km。

这意味着：
- 太阳半径 ≈ 696 单位
- 地球半径 ≈ 6.37 单位，轨道半径 ≈ 149,600 单位
- 水星半径 ≈ 2.44 单位
- 木星半径 ≈ 69.9 单位，轨道半径 ≈ 778,500 单位
- 海王星半径 ≈ 24.6 单位，轨道半径 ≈ 4,495,000 单位

**核心挑战**：天体大小与轨道距离差异达数个数量级，需要特殊渲染和交互策略。

## 渲染策略

### 对数深度缓冲

Canvas 开启对数深度缓冲，解决极端 near/far 比值下的 Z-buffer 精度问题：

```tsx
<Canvas gl={{ logarithmicDepthBuffer: true }}>
```

标准线性深度缓冲在 near/far 比值超过 1:1000 时出现严重精度丢失，对数深度缓冲可将比值提升至 1:10^10，满足太阳系真实比例需求。

### 相机参数

```typescript
// PerspectiveCamera 配置
{
  fov: 60,
  near: 0.01,           // 足够小以支持近距离观察行星表面
  far: 10_000_000,      // 足够大以纵览海王星轨道
  position: [0, 300_000, 300_000]  // 初始位置：俯瞰内行星区域
}
```

### 动态相机控制

通过 OrbitControls 的 `minDistance` / `maxDistance` 限制缩放范围，配合以下策略：
- 鼠标滚轮缩放时，根据当前相机距离动态调整缩放速度（距离越远，每步缩放越大）
- 避免用户在极端距离间「缩放半天」

## 导航与交互辅助

真实比例下行星在全景视图中为亚像素尺寸，直接点击不可行。需要以下辅助机制：

### 行星列表面板（PlanetList）

- **位置**：Canvas 外部 HTML overlay，左侧或右侧侧边栏
- **内容**：所有天体的名称列表（带颜色圆点标识）
- **交互**：点击名称 → 触发相机飞行动画到该天体
- **始终可见**：不随缩放隐藏，是主要的行星选择方式

### 相机飞行动画（CameraFlyTo）

- 选中行星后，使用 `useFrame` 手动插值，平滑过渡相机到目标天体附近
- 飞行距离 = 行星半径 × 5（保证天体占据屏幕合理比例）
- 动画时长 1-2 秒，使用 easeInOut 缓动
- 飞行过程中 OrbitControls 的 target 同步更新为天体位置

### 远距离行星标记（PlanetMarker）

- 当相机与行星距离 > 行星半径 × 50 时，用 **发光点 + 名称标签** 替代真实球体渲染
- 发光点使用 `sprite` 或 `billboard` 技术，大小不随距离缩小（屏幕空间固定像素）
- 确保在全景视图下行星依然可见、可点击
- 近距离时自动切换为真实纹理球体渲染

### 预设视角按钮

控制面板提供快捷视角按钮：

| 预设 | 相机位置（大致） | 说明 |
|------|-----------------|------|
| 全景 | 俯瞰，距原点 600,000 | 可见内行星轨道 |
| 内行星 | 距原点 50,000 | 水星~火星清晰可见 |
| 外行星 | 距原点 2,000,000 | 木星~海王星可见 |
| 侧视图 | y=0 平面 | 从黄道面水平观察 |

## 数据模型

```typescript
// constants.ts
interface MoonData {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  textureUrl: string;
}

interface PlanetData {
  name: string;              // 行星名称（中文）
  nameEn: string;            // 英文名
  radius: number;            // 球体半径（Three.js 单位）
  orbitRadius: number;       // 轨道半径（Three.js 单位）
  orbitSpeed: number;        // 公转速度（弧度/秒，useFrame 中乘以 delta）
  rotationSpeed: number;     // 自转速度（弧度/秒，useFrame 中乘以 delta）
  textureUrl: string;        // 纹理贴图路径
  tilt: number;              // 自转轴倾斜角（弧度）
  hasRing?: boolean;         // 是否有行星环
  ringTextureUrl?: string;   // 行星环纹理路径
  info: {
    diameter: string;        // 直径
    distanceFromSun: string; // 距太阳距离
    orbitalPeriod: string;   // 公转周期
    description: string;     // 简短描述
  };
  moons?: MoonData[];        // 卫星列表
}
```

## 组件层级

```
SolarSystem（Canvas + useState 全局控制状态）
  ├── 行星列表面板（HTML overlay，Canvas 外部，PlanetList）
  ├── 控制面板（HTML overlay：速度 slider、暂停、轨道线开关、标签开关、预设视角按钮）
  ├── 标注「大小和距离均为真实天文比例」
  ├── <Canvas gl={{ logarithmicDepthBuffer: true }}>
  │   ├── <CameraController />（飞行动画 + 动态缩放速度）
  │   ├── <Stars />（drei 星空背景）
  │   ├── <Sun />（自发光 + PointLight）
  │   ├── <Planet /> × N（遍历 planets 数组）
  │   │   ├── <PlanetMarker />（远距离时显示发光点标记）
  │   │   ├── 球体 mesh（近距离时显示纹理贴图 + onClick）
  │   │   ├── 土星环（条件渲染）
  │   │   ├── <OrbitLine />（条件渲染）
  │   │   ├── <PlanetLabel />（条件渲染）
  │   │   ├── <Moon /> × N（卫星嵌套在行星组内）
  │   │   └── <PlanetInfoCard />（选中时渲染）
  │   ├── <AsteroidBelt />（InstancedMesh）
  │   └── <OrbitControls />（drei，带阻尼）
  └── </Canvas>
```

## 全局状态

使用 `useState` 上提至 `SolarSystem` 组件，不引入 Context：

| 状态 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `speedMultiplier` | `number` | `1` | 动画速度倍率（0 = 暂停） |
| `showOrbits` | `boolean` | `true` | 是否显示轨道线 |
| `showLabels` | `boolean` | `true` | 是否显示行星名称标签 |
| `selectedPlanet` | `PlanetData \| null` | `null` | 当前选中的行星（显示信息卡 + 触发飞行） |
| `cameraTarget` | `Vector3 \| null` | `null` | 飞行动画目标位置（由 PlanetList 点击触发） |

## 交互功能

### 轨道控制器（OrbitControls）
- 使用 drei `<OrbitControls>` 组件
- 启用阻尼效果（enableDamping）
- 适当的缩放范围（minDistance / maxDistance）

### 点击行星展示信息
- 行星 mesh 绑定 `onClick` 事件
- 点击后设置 `selectedPlanet` 状态
- 通过 drei `<Html>` 组件在行星旁渲染信息卡片
- 信息卡片包含：名称、直径、距日距离、公转周期、描述
- 点击空白区域或关闭按钮清除选中状态

### 动画速度控制
- 顶部控制面板包含 slider（范围 0x - 10x）
- 0x 即暂停
- 速度倍率通过 props 传递给每个 `<Planet />`，在 `useFrame` 中乘以基础速度

### 轨道线和标签切换
- 控制面板包含两个 toggle 按钮
- `showOrbits` 控制 `<OrbitLine />` 的渲染
- `showLabels` 控制 `<PlanetLabel />` 的渲染

## 纹理资源

纹理来源：Solar System Scope（solarsystemscope.com）免费纹理。

纹理存放在 `public/textures/` 目录下，2K 分辨率 jpg/png 格式。通过 drei 的 `useTexture` hook 加载，支持 suspense loading。

## 路由注册

在 `src/main.tsx` 中新增路由：

```typescript
{
  path: "/solar-system",
  element: <SolarSystem />,
}
```

在 `src/routes/root.tsx` 的导航栏中新增链接：

```html
<li><a href="/solar-system">Solar System</a></li>
```

## 注意事项

- 真实比例下太阳会极大，需要合理设置相机参数（PerspectiveCamera far 值要足够大）
- **必须开启对数深度缓冲** `logarithmicDepthBuffer: true`，否则远距离渲染精度崩溃
- 小行星带使用 `InstancedMesh` 优化性能，避免数千个独立 mesh
- 土星环使用 `RingGeometry` + 双面渲染材质
- 纹理加载使用 React Suspense + drei `useTexture`，需要 `<Suspense>` 包裹
- 所有中文注释
- 行星列表面板是真实比例下的核心交互入口，远比直接点击 3D 场景重要
- 远距离行星标记（PlanetMarker）确保全景视图下行星依然可发现、可交互
- 飞行动画使用 `useFrame` 插值实现，不引入额外动画库（如 tween.js）
- 页面需标注「大小和距离均为真实天文比例」
