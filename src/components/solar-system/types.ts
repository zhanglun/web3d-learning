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