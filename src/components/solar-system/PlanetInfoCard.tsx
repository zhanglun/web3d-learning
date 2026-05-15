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