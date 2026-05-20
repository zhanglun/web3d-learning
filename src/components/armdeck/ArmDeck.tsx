import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows, Environment } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';

import { ROBOTS, DEFAULT_ROBOT } from '../../robots';
import { useUrlState } from '../../hooks/useUrlState';
import { createIK } from '../../ik/solver';
import type { IKSystem } from '../../ik/solver';
import type { Trajectory, TrajectoryFrame } from '../../recording/trajectory';
import * as storage from '../../recording/index';

import { TopBar } from './TopBar';
import { URDFRobotModel } from './URDFRobotModel';
import { JointControls } from './JointControls';
import { JointAxes } from './JointAxes';
import { EEPoseReader, EEPosePanel } from './EEPose';
import { IKTarget } from './IKTarget';
import { IKRunner } from './IKRunner';
import { Recorder } from './Recorder';
import { Player } from './Player';
import { TransportPanel } from './TransportPanel';
import { RosJointStateDriver } from './RosJointStateDriver';
import { RosPointCloud } from './RosPointCloud';
import { TFVisualizer } from './TFVisualizer';
import { RosPanel } from './RosPanel';

export default function ArmDeck() {
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

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const framesRef = useRef<TrajectoryFrame[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [savedList, setSavedList] = useState<Trajectory[]>([]);
  const [playingTraj, setPlayingTraj] = useState<Trajectory | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ROS
  const [rosJointControl, setRosJointControl] = useState(false);
  const [showPointCloud, setShowPointCloud] = useState(false);
  const [showTF, setShowTF] = useState(false);

  // Load saved trajectories on mount
  useEffect(() => { storage.list().then(setSavedList); }, []);

  const handleRobotLoaded = useCallback((r: URDFRobot) => {
    setRobot(r);
    if (urlState.ikEnabled) {
      setIkSystem(createIK(r, robotDef.toolFrame));
    }
  }, [robotDef.toolFrame, urlState.ikEnabled]);

  const handleJointChange = (name: string, value: number) => {
    setJoints(prev => ({ ...prev, [name]: value }));
    setUrlState(s => ({ ...s, joints: { ...s.joints, [name]: value } }));
  };

  const handleRobotChange = (id: string) => {
    const def = ROBOTS.find(r => r.id === id) ?? DEFAULT_ROBOT;
    setRobot(null);
    setIkSystem(null);
    setJoints(def.defaultJoints);
    setUrlState(s => ({ ...s, robot: id, joints: def.defaultJoints }));
  };

  const handleToggleIK = (enabled: boolean) => {
    setUrlState(s => ({ ...s, ikEnabled: enabled }));
    if (enabled && robot) setIkSystem(createIK(robot, robotDef.toolFrame));
    else { setIkSystem(null); setIkStatus('idle'); }
  };

  const refreshList = async () => setSavedList(await storage.list());

  const handleSave = async (name: string) => {
    const traj: Trajectory = {
      id: crypto.randomUUID(),
      name,
      robot: robotDef.id,
      createdAt: new Date().toISOString(),
      frames: [...framesRef.current],
    };
    await storage.save(traj);
    framesRef.current = [];
    setFrameCount(0);
    await refreshList();
  };

  const playbackDuration =
    playingTraj?.frames.length
      ? playingTraj.frames[playingTraj.frames.length - 1].t
      : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111', display: 'flex', flexDirection: 'column' }}>

      {/* Phase label */}
      <div style={{
        position: 'absolute', top: robot ? 44 : 8, right: 10, zIndex: 20,
        background: 'rgba(120,0,180,0.75)', color: '#fff',
        fontSize: 11, padding: '2px 8px', borderRadius: 3, pointerEvents: 'none',
      }}>
        Phase 4 — ROS2 + Dataset Backend
      </div>

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

        {/* Left — joint controls */}
        <div style={{ width: 220, background: '#1a1a2a', overflowY: 'auto', flexShrink: 0 }}>
          {robot && <JointControls robot={robot} joints={joints} onChange={handleJointChange} />}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas camera={{ position: [1.2, 1, 1.2], fov: 45 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
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
                  <Recorder
                    robot={robot}
                    eePoseRef={eePoseRef}
                    isRecording={isRecording}
                    framesRef={framesRef}
                    onTick={setFrameCount}
                  />
                  {playingTraj && (
                    <Player
                      robot={robot}
                      trajectory={playingTraj}
                      isPlaying
                      speed={playbackSpeed}
                      onProgress={setPlaybackTime}
                      onEnd={() => setPlayingTraj(null)}
                    />
                  )}
                  <RosJointStateDriver robot={robot} enabled={rosJointControl} />
                </>
              )}
              <RosPointCloud visible={showPointCloud} />
              <TFVisualizer visible={showTF} />
              <Grid args={[10, 10]} />
              <ContactShadows opacity={0.3} />
              <Environment preset="city" />
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>
          {robot && <EEPosePanel poseRef={eePoseRef} />}
        </div>

        {/* Right — transport + ROS */}
        <div style={{ width: 210, background: '#1a1a2a', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <TransportPanel
            frameCount={frameCount}
            isRecording={isRecording}
            onStartRecord={() => { framesRef.current = []; setIsRecording(true); }}
            onStopRecord={() => setIsRecording(false)}
            onSave={handleSave}
            onDiscard={() => { framesRef.current = []; setFrameCount(0); }}
            savedList={savedList}
            onPlay={t => { setPlayingTraj(t); setPlaybackTime(0); }}
            onStopPlay={() => setPlayingTraj(null)}
            isPlaying={!!playingTraj}
            playbackTime={playbackTime}
            playbackDuration={playbackDuration}
            playbackSpeed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
            onRefreshList={refreshList}
            onDelete={async id => { await storage.remove(id); refreshList(); }}
          />
          <div style={{ borderTop: '1px solid #2a2a3a' }}>
            <RosPanel
              showPointCloud={showPointCloud}
              onTogglePointCloud={setShowPointCloud}
              rosJointControl={rosJointControl}
              onToggleRosJoints={setRosJointControl}
              showTF={showTF}
              onToggleTF={setShowTF}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
