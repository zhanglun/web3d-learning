// src/components/solar-system/PlanetLabel.tsx
// 行星名称标签 — 使用 drei Html 在 3D 空间中渲染

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