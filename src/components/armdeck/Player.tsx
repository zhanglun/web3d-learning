import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { URDFRobot } from 'urdf-loader';
import type { Trajectory } from '../../recording/trajectory';

interface Props {
  robot: URDFRobot;
  trajectory: Trajectory;
  isPlaying: boolean;
  speed: number;
  onProgress: (t: number) => void;
  onEnd: () => void;
}

export function Player({ robot, trajectory, isPlaying, speed, onProgress, onEnd }: Props) {
  const playbackTime = useRef(0);
  const lastFrameIdx = useRef(0);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    const frames = trajectory.frames;
    if (frames.length === 0) return;

    playbackTime.current += delta * speed;
    const duration = frames[frames.length - 1].t;
    if (playbackTime.current >= duration) {
      playbackTime.current = duration;
      onEnd();
    }

    // Binary search for frame index
    let lo = 0, hi = frames.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (frames[mid].t <= playbackTime.current) lo = mid; else hi = mid - 1;
    }
    lastFrameIdx.current = lo;

    const a = frames[lo];
    const b = frames[Math.min(lo + 1, frames.length - 1)];
    const alpha = b.t === a.t ? 0 : (playbackTime.current - a.t) / (b.t - a.t);

    // Interpolate and apply joints
    Object.keys(a.joints).forEach(name => {
      const va = a.joints[name];
      const vb = b.joints[name] ?? va;
      robot.setJointValue(name, va + (vb - va) * alpha);
    });

    onProgress(playbackTime.current);
  });

  return null;
}
