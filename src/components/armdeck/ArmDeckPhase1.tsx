import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows, Environment } from '@react-three/drei';
import { Suspense, useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';

import { ROBOTS, DEFAULT_ROBOT } from '../../robots';
import { useUrlState } from '../../hooks/useUrlState';
import { TopBar } from './TopBar';
import { URDFRobotModel } from './URDFRobotModel';
import { JointControls } from './JointControls';
import { JointAxes } from './JointAxes';
import { EEPoseReader, EEPosePanel } from './EEPose';

export default function ArmDeckPhase1() {
  const [urlState, setUrlState] = useUrlState({
    robot: DEFAULT_ROBOT.id,
    showAxes: false,
    joints: DEFAULT_ROBOT.defaultJoints,
  });

  const robotDef = ROBOTS.find(r => r.id === urlState.robot) ?? DEFAULT_ROBOT;
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const [joints, setJoints] = useState<Record<string, number>>(robotDef.defaultJoints);
  const eePoseRef = useRef<THREE.Vector3>(new THREE.Vector3());

  const handleRobotLoaded = useCallback((r: URDFRobot) => setRobot(r), []);

  const handleJointChange = (name: string, value: number) => {
    setJoints(prev => ({ ...prev, [name]: value }));
    setUrlState(s => ({ ...s, joints: { ...s.joints, [name]: value } }));
  };

  const handleRobotChange = (id: string) => {
    const def = ROBOTS.find(r => r.id === id) ?? DEFAULT_ROBOT;
    setRobot(null);
    setJoints(def.defaultJoints);
    setUrlState(s => ({ ...s, robot: id, joints: def.defaultJoints }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111', display: 'flex', flexDirection: 'column' }}>
      <PhaseLabel label="Phase 1 — URDF Viewer" />
      {robot && (
        <TopBar
          robotId={robotDef.id}
          onRobotChange={handleRobotChange}
          showAxes={urlState.showAxes ?? false}
          onToggleAxes={v => setUrlState(s => ({ ...s, showAxes: v }))}
          ikEnabled={false}
          onToggleIK={() => {}}
          onShare={() => navigator.clipboard.writeText(window.location.href)}
        />
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingTop: robot ? 40 : 0 }}>
        <div style={{ width: 220, background: '#1a1a2a', overflowY: 'auto', flexShrink: 0 }}>
          {robot && <JointControls robot={robot} joints={joints} onChange={handleJointChange} />}
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas camera={{ position: [1.2, 1, 1.2], fov: 45 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1} />
            <Suspense fallback={null}>
              <URDFRobotModel urdf={robotDef.urdf} joints={joints} onLoaded={handleRobotLoaded} />
              {robot && (
                <>
                  <EEPoseReader robot={robot} toolFrame={robotDef.toolFrame} poseRef={eePoseRef} />
                  {urlState.showAxes && <JointAxes robot={robot} visible />}
                </>
              )}
              <Grid args={[10, 10]} />
              <ContactShadows opacity={0.3} />
              <Environment preset="city" />
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>
          {robot && <EEPosePanel poseRef={eePoseRef} />}
        </div>
      </div>
    </div>
  );
}

function PhaseLabel({ label }: { label: string }) {
  return (
    <div style={{
      position: 'absolute', top: 44, right: 10, zIndex: 20,
      background: 'rgba(0,100,200,0.7)', color: '#fff',
      fontSize: 11, padding: '2px 8px', borderRadius: 3, pointerEvents: 'none',
    }}>
      {label}
    </div>
  );
}
