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