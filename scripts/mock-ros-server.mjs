/**
 * Mock ROS2 bridge server (Foxglove WebSocket protocol)
 * Topics:
 *   /joint_states  — 20 Hz, sensor_msgs/JointState
 *   /pointcloud    — 5 Hz,  sensor_msgs/PointCloud2 (binary, base64 in JSON)
 *   /tf            — 20 Hz, tf2_msgs/TFMessage
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

// UR5e link lengths (metres) for TF positions
const LINK_ORIGINS = [
  { parent: 'world',          child: 'base_link',      xyz: [0,     0,     0      ], rpy: [0, 0, 0] },
  { parent: 'base_link',      child: 'shoulder_link',  xyz: [0,     0,     0.163  ], rpy: [0, 0, 0] },
  { parent: 'shoulder_link',  child: 'upper_arm_link', xyz: [0,     0.138, 0      ], rpy: [1.5708, 0, 0] },
  { parent: 'upper_arm_link', child: 'forearm_link',   xyz: [0,    -0.131, 0.425  ], rpy: [0, 0, 0] },
  { parent: 'forearm_link',   child: 'wrist_1_link',   xyz: [0,     0,     0.392  ], rpy: [1.5708, 0, 0] },
  { parent: 'wrist_1_link',   child: 'wrist_2_link',   xyz: [0,     0.127, 0      ], rpy: [0, 0, 0] },
  { parent: 'wrist_2_link',   child: 'wrist_3_link',   xyz: [0,     0,     0.1    ], rpy: [0, 0, 0] },
  { parent: 'wrist_3_link',   child: 'tool0',          xyz: [0,     0.1,   0      ], rpy: [-1.5708, 0, 0] },
];

/** Encode XYZ float32 point cloud as base64 */
function buildPointCloud2(numPoints = 500) {
  const pointStep = 12; // 3 × float32
  const buf = Buffer.allocUnsafe(numPoints * pointStep);
  for (let i = 0; i < numPoints; i++) {
    const off = i * pointStep;
    buf.writeFloatLE((Math.random() - 0.5) * 1.5, off + 0);
    buf.writeFloatLE(Math.random() * 1.8 + 0.1,   off + 4);
    buf.writeFloatLE((Math.random() - 0.5) * 1.5, off + 8);
  }
  return {
    header: { stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 }, frame_id: 'base_link' },
    height: 1,
    width: numPoints,
    fields: [
      { name: 'x', offset: 0, datatype: 7, count: 1 },
      { name: 'y', offset: 4, datatype: 7, count: 1 },
      { name: 'z', offset: 8, datatype: 7, count: 1 },
    ],
    is_bigendian: false,
    point_step: pointStep,
    row_step: numPoints * pointStep,
    data: buf.toString('base64'),
    is_dense: true,
  };
}

/** Build TFMessage with static link origins */
function buildTFMessage() {
  const now = { sec: Math.floor(Date.now() / 1000), nanosec: 0 };
  return {
    transforms: LINK_ORIGINS.map(({ parent, child, xyz, rpy }) => {
      // Convert RPY to quaternion
      const [r, p, y] = rpy;
      const cr = Math.cos(r / 2), sr = Math.sin(r / 2);
      const cp = Math.cos(p / 2), sp = Math.sin(p / 2);
      const cy = Math.cos(y / 2), sy = Math.sin(y / 2);
      return {
        header: { stamp: now, frame_id: parent },
        child_frame_id: child,
        transform: {
          translation: { x: xyz[0], y: xyz[1], z: xyz[2] },
          rotation: {
            x: sr * cp * cy - cr * sp * sy,
            y: cr * sp * cy + sr * cp * sy,
            z: cr * cp * sy - sr * sp * cy,
            w: cr * cp * cy + sr * sp * sy,
          },
        },
      };
    }),
  };
}

let t = 0;

wss.on('connection', (ws, req) => {
  const addr = req.socket.remoteAddress ?? 'unknown';
  console.log(`[${new Date().toISOString()}] Client connected: ${addr}`);

  const server = new FoxgloveServer({ name: 'mock-ros-armdeck' });

  const jointCh = server.addChannel({
    topic: '/joint_states',
    encoding: 'json',
    schemaName: 'sensor_msgs/JointState',
    schema: JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'array', items: { type: 'string' } },
        position: { type: 'array', items: { type: 'number' } },
        velocity: { type: 'array', items: { type: 'number' } },
        effort: { type: 'array', items: { type: 'number' } },
      },
    }),
  });

  const cloudCh = server.addChannel({
    topic: '/pointcloud',
    encoding: 'json',
    schemaName: 'sensor_msgs/PointCloud2',
    schema: '',
  });

  const tfCh = server.addChannel({
    topic: '/tf',
    encoding: 'json',
    schemaName: 'tf2_msgs/TFMessage',
    schema: '',
  });

  server.handleConnection(ws, addr);

  // /joint_states at 20 Hz
  const jointTimer = setInterval(() => {
    t += 1 / 20;
    const positions = JOINT_NAMES.map((_, i) => Math.sin(t * 0.5 + i) * 0.8);
    server.sendMessage(
      jointCh,
      BigInt(Date.now()) * 1_000_000n,
      Buffer.from(JSON.stringify({
        header: { stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 }, frame_id: '' },
        name: JOINT_NAMES,
        position: positions,
        velocity: Array(6).fill(0),
        effort: Array(6).fill(0),
      })),
    );
  }, 50);

  // /pointcloud at 5 Hz
  const cloudTimer = setInterval(() => {
    server.sendMessage(
      cloudCh,
      BigInt(Date.now()) * 1_000_000n,
      Buffer.from(JSON.stringify(buildPointCloud2(800))),
    );
  }, 200);

  // /tf at 20 Hz
  const tfTimer = setInterval(() => {
    server.sendMessage(
      tfCh,
      BigInt(Date.now()) * 1_000_000n,
      Buffer.from(JSON.stringify(buildTFMessage())),
    );
  }, 50);

  ws.on('close', () => {
    clearInterval(jointTimer);
    clearInterval(cloudTimer);
    clearInterval(tfTimer);
    console.log(`[${new Date().toISOString()}] Client disconnected: ${addr}`);
  });

  ws.on('error', err => console.error('WS error:', err.message));
});

wss.on('listening', () => {
  console.log(`Mock ROS2 server listening on ws://localhost:${PORT}`);
  console.log('  /joint_states  20 Hz');
  console.log('  /pointcloud     5 Hz  (PointCloud2 binary/base64)');
  console.log('  /tf            20 Hz');
});
