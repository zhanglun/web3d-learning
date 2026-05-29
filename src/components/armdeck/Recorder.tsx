import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import type { TrajectoryFrame } from '../../recording/trajectory';

const _eeWorld = new THREE.Vector3();
const SAMPLE_HZ = 30;
const SAMPLE_INTERVAL = 1 / SAMPLE_HZ;

interface Props {
  robot: URDFRobot;
  toolFrame?: string;
  eePoseRef: React.RefObject<THREE.Vector3>;
  isRecording: boolean;
  framesRef: React.MutableRefObject<TrajectoryFrame[]>;
  onTick: (count: number) => void;
}

export function Recorder({ robot, eePoseRef, isRecording, framesRef, onTick }: Props) {
  const lastSampleTime = useRef(0);
  const lastNotifyTime = useRef(0);
  const startTime = useRef(0);

  useFrame((_, delta) => {
    if (!isRecording) return;

    const now = performance.now() / 1000;
    if (startTime.current === 0) startTime.current = now;

    lastSampleTime.current += delta;
    if (lastSampleTime.current < SAMPLE_INTERVAL) return;
    lastSampleTime.current = 0;

    const joints: Record<string, number> = {};
    Object.entries(robot.joints).forEach(([name, joint]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const j = joint as any;
      if (j.jointType !== 'fixed') {
        joints[name] = j.angle ?? 0;
      }
    });

    const ee = eePoseRef.current ?? _eeWorld;
    const frame: TrajectoryFrame = {
      t: now - startTime.current,
      joints,
      ee: [ee.x, ee.y, ee.z],
      action: [ee.x, ee.y, ee.z],
    };
    framesRef.current.push(frame);

    // Throttle UI notification to 10Hz
    lastNotifyTime.current += delta;
    if (lastNotifyTime.current >= 0.1) {
      lastNotifyTime.current = 0;
      onTick(framesRef.current.length);
    }
  });

  return null;
}
