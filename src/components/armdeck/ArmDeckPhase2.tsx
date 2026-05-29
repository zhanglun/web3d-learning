import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows, Environment } from '@react-three/drei';
import { Suspense, useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';

import { ROBOTS, DEFAULT_ROBOT } from '../../robots';
import { useUrlState } from '../../hooks/useUrlState';
import { createIK, type IKSystem } from '../../ik/solver';
import { TopBar } from './TopBar';
import { URDFRobotModel } from './URDFRobotModel';
import { JointControls } from './JointControls';
import { JointAxes } from './JointAxes';
import { EEPoseReader, EEPosePanel } from './EEPose';
import { IKTarget } from './IKTarget';
import { IKRunner } from './IKRunner';

export default function ArmDeckPhase2() {
  const [urlState, setUrlState] = useUrlState({
    robot: DEFAULT_ROBOT.id,
    showAxes: false,
    ikEnabled: false,
    joints: DEFAULT_ROBOT.defaultJoints,
    ikTarget: DEFAULT_ROBOT.ikDefaultTarget,
  });

  const robotDef = ROBOTS.find(r => r.id === urlState.robot) ?? DEFAULT_ROBOT;
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const [joints, setJoints] = useState<Record<string, number>>(robotDef.defaultJoints);
  const eePoseRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const ikTargetWorldPos = useRef<THREE.Vector3>(new THREE.Vector3(...(urlState.ikTarget ?? robotDef.ikDefaultTarget)));
  const [ikSystem, setIkSystem] = useState<IKSystem | null>(null);
  const [ikStatus, setIkStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  const handleRobotLoaded = useCallback((r: URDFRobot) => {
    setRobot(r);
    if (urlState.ikEnabled) setIkSystem(createIK(r, robotDef.toolFrame));
  }, [robotDef.toolFrame, urlState.ikEnabled]);

  const handleJointChange = (name: string, value: number) => {
    setJoints(prev => ({ ...prev, [name]: value }));
    setUrlState(s => ({ ...s, joints: { ...s.joints, [name]: value } }));
  };

  const handleRobotChange = (id: string) => {
    const def = ROBOTS.find(r => r.id === id) ?? DEFAULT_ROBOT;
    setRobot(null); setIkSystem(null);
    setJoints(def.defaultJoints);
    setUrlState(s => ({ ...s, robot: id, joints: def.defaultJoints }));
  };

  const handleToggleIK = (enabled: boolean) => {
    setUrlState(s => ({ ...s, ikEnabled: enabled }));
    if (enabled && robot) setIkSystem(createIK(robot, robotDef.toolFrame));
    else { setIkSystem(null); setIkStatus('idle'); }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111', display: 'flex', flexDirection: 'column' }}>
      <PhaseLabel label="Phase 2 — Inverse Kinematics" />
      {robot && (
        <TopBar
          robotId={robotDef.id}
          onRobotChange={handleRobotChange}
          showAxes={urlState.showAxes ?? false}
          onToggleAxes={v => setUrlState(s => ({ ...s, showAxes: v }))}
          ikEnabled={urlState.ikEnabled ?? false}
          onToggleIK={handleToggleIK}
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
                  {urlState.ikEnabled && ikSystem && (
                    <>
                      <IKTarget
                        initialPosition={urlState.ikTarget ?? robotDef.ikDefaultTarget}
                        onMove={pos => {
                          ikTargetWorldPos.current.copy(pos);
                          setUrlState(s => ({ ...s, ikTarget: [pos.x, pos.y, pos.z] }));
                        }}
                        status={ikStatus}
                      />
                      <IKRunner robot={robot} ikSystem={ikSystem} targetWorldPos={ikTargetWorldPos} onStatus={setIkStatus} />
                    </>
                  )}
                </>
              )}
              <Grid args={[10, 10]} />
              <ContactShadows opacity={0.3} />
              <Environment preset="city" />
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>
          {robot && <EEPosePanel poseRef={eePoseRef} />}
          {urlState.ikEnabled && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)', color: ikStatus === 'ok' ? '#0f0' : ikStatus === 'fail' ? '#f44' : '#888',
              fontSize: 12, padding: '3px 10px', borderRadius: 4, pointerEvents: 'none',
            }}>
              IK: {ikStatus === 'ok' ? 'Converged' : ikStatus === 'fail' ? 'Failed' : 'Idle'} — drag the sphere
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseLabel({ label }: { label: string }) {
  return (
    <div style={{
      position: 'absolute', top: 44, right: 10, zIndex: 20,
      background: 'rgba(0,150,80,0.7)', color: '#fff',
      fontSize: 11, padding: '2px 8px', borderRadius: 3, pointerEvents: 'none',
    }}>
      {label}
    </div>
  );
}
