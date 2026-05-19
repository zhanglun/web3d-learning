/**
 * Mock ROS2 bridge server using Foxglove WebSocket protocol.
 * Publishes /joint_states at 20Hz and /pointcloud at 5Hz.
 *
 * Usage: node scripts/mock-ros-server.mjs
 */
import { WebSocketServer } from 'ws';
import { FoxgloveServer } from '@foxglove/ws-protocol';

const PORT = 8765;
const wss = new WebSocketServer({ port: PORT });

const JOINT_NAMES = [
  'shoulder_pan_joint',
  'shoulder_lift_joint',
  'elbow_joint',
  'wrist_1_joint',
  'wrist_2_joint',
  'wrist_3_joint',
];

let t = 0;

wss.on('connection', (ws) => {
  console.log('Client connected');

  const server = new FoxgloveServer({ name: 'mock-ros' });

  const jointChannelId = server.addChannel({
    topic: '/joint_states',
    encoding: 'json',
    schemaName: 'sensor_msgs/JointState',
    schema: '',
  });

  const cloudChannelId = server.addChannel({
    topic: '/pointcloud',
    encoding: 'json',
    schemaName: 'sensor_msgs/PointCloud2',
    schema: '',
  });

  server.handleConnection(ws, ws.remoteAddress ?? 'unknown');

  const jointInterval = setInterval(() => {
    t += 1 / 20;
    const positions = JOINT_NAMES.map((_, i) => Math.sin(t + i) * 0.5);
    server.sendMessage(
      jointChannelId,
      BigInt(Date.now()) * 1_000_000n,
      Buffer.from(JSON.stringify({
        name: JOINT_NAMES,
        position: positions,
        velocity: new Array(6).fill(0),
        effort: new Array(6).fill(0),
      }))
    );
  }, 50);

  const cloudInterval = setInterval(() => {
    const pts = [];
    for (let i = 0; i < 100; i++) {
      pts.push({
        x: (Math.random() - 0.5) * 2,
        y: Math.random() * 1.5,
        z: (Math.random() - 0.5) * 2,
      });
    }
    server.sendMessage(
      cloudChannelId,
      BigInt(Date.now()) * 1_000_000n,
      Buffer.from(JSON.stringify({ points: pts }))
    );
  }, 200);

  ws.on('close', () => {
    clearInterval(jointInterval);
    clearInterval(cloudInterval);
    console.log('Client disconnected');
  });
});

console.log(`Mock ROS server on ws://localhost:${PORT}`);
