import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';

const _worldPos = new THREE.Vector3();

interface InnerProps {
  robot: URDFRobot;
  toolFrame: string;
  poseRef: React.MutableRefObject<THREE.Vector3>;
}

// Canvas-inner: reads EE pose each frame, writes to shared ref (no React state → no re-renders)
export function EEPoseReader({ robot, toolFrame, poseRef }: InnerProps) {
  useFrame(() => {
    const link = robot.links[toolFrame];
    if (!link) return;
    link.getWorldPosition(_worldPos);
    poseRef.current.copy(_worldPos);
  });
  return null;
}

interface PanelProps {
  poseRef: React.MutableRefObject<THREE.Vector3>;
}

// Canvas-outer: polls ref via rAF for display
export function EEPosePanel({ poseRef }: PanelProps) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (divRef.current) {
        const p = poseRef.current;
        divRef.current.textContent = `EE  X:${p.x.toFixed(3)}  Y:${p.y.toFixed(3)}  Z:${p.z.toFixed(3)}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [poseRef]);

  return (
    <div
      ref={divRef}
      style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.55)',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '4px 10px',
        borderRadius: 4,
        pointerEvents: 'none',
      }}
    />
  );
}
