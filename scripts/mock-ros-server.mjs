/**
 * Mock ROS2 bridge server (Foxglove WebSocket protocol)
 * Topics:
 *   /joint_states  — 20 Hz, sensor_msgs/JointState  (JSON)
 *   /pointcloud    — 5 Hz,  sensor_msgs/PointCloud2 (binary, base64 in JSON)
 *   /tf            — 20 Hz, tf2_msgs/TFMessage       (JSON, dynamic)
 *   /tf_static     — once on connect, tf2_msgs/TFMessage (JSON, static frames)
 *
 * Handles client publications:
 *   /joint_command  — logs incoming JointState commands from the browser
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

// UR5e link origins — static TF frames (sent once as /tf_static)
const STATIC_LINKS = [
  { parent: 'world',     child: 'base_link',     xyz: [0, 0, 0],       rpy: [0, 0, 0] },
];

// Dynamic link offsets animated per joint (simplified forward kinematics for demo)
const DYNAMIC_LINKS = [
  { parent: 'base_link',      child: 'shoulder_link',  xyz: [0,     0,     0.163  ], rpy: [0, 0, 0] },
  { parent: 'shoulder_link',  child: 'upper_arm_link', xyz: [0,     0.138, 0      ], rpy: [1.5708, 0, 0] },
  { parent: 'upper_arm_link', child: 'forearm_link',   xyz: [0,    -0.131, 0.425  ], rpy: [0, 0, 0] },
  { parent: 'forearm_link',   child: 'wrist_1_link',   xyz: [0,     0,     0.392  ], rpy: [1.5708, 0, 0] },
  { parent: 'wrist_1_link',   child: 'wrist_2_link',   xyz: [0,     0.127, 0      ], rpy: [0, 0, 0] },
  { parent: 'wrist_2_link',   child: 'wrist_3_link',   xyz: [0,     0,     0.1    ], rpy: [0, 0, 0] },
  { parent: 'wrist_3_link',   child: 'tool0',          xyz: [0,     0.1,   0      ], rpy: [-1.5708, 0, 0] },
];

function rpyToQuat(r, p, y) {
  const cr = Math.cos(r / 2), sr = Math.sin(r / 2);
  const cp = Math.cos(p / 2), sp = Math.sin(p / 2);
  const cy = Math.cos(y / 2), sy = Math.sin(y / 2);
  return {
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
    w: cr * cp * cy + sr * sp * sy,
  };
}

function buildTFMessage(links, t) {
  const now = { sec: Math.floor(Date.now() / 1000), nanosec: 0 };
  return {
    transforms: links.map(({ parent, child, xyz, rpy }, i) => ({
      header: { stamp: now, frame_id: parent },
      child_frame_id: child,
      transform: {
        translation: { x: xyz[0], y: xyz[1], z: xyz[2] },
        rotation: rpyToQuat(rpy[0] + Math.sin(t * 0.3 + i) * 0.05, rpy[1], rpy[2]),
      },
    })),
  };
}

/** PointCloud2 in ROS Z-up convention: x=forward, y=lateral, z=height */
function buildPointCloud2(numPoints = 500) {
  const pointStep = 12;
  const buf = Buffer.allocUnsafe(numPoints * pointStep);
  for (let i = 0; i < numPoints; i++) {
    const off = i * pointStep;
    buf.writeFloatLE((Math.random() - 0.5) * 1.5, off + 0);  // x: forward/lateral
    buf.writeFloatLE((Math.random() - 0.5) * 1.5, off + 4);  // y: lateral
    buf.writeFloatLE(Math.random() * 1.8 + 0.1,   off + 8);  // z: height (ROS Z-up)
  }
  return {
    header: { stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 }, frame_id: 'base_link' },
    height: 1,
    width: numPoints,
    fields: [
      { name: 'x', offset: 0,  datatype: 7, count: 1 },
      { name: 'y', offset: 4,  datatype: 7, count: 1 },
      { name: 'z', offset: 8,  datatype: 7, count: 1 },
    ],
    is_bigendian: false,
    point_step: pointStep,
    row_step: numPoints * pointStep,
    data: buf.toString('base64'),
    is_dense: true,
  };
}

/** Try to decode a CDR JointState for logging (best-effort) */
function tryDecodeCdrJointState(data) {
  try {
    if (data.byteLength < 16) return null;
    const view = new DataView(data);
    const le = view.getUint8(1) === 0x01;
    let off = 4;
    const align = (n) => { const r = off % n; if (r) off += n - r; };
    const readUint32 = () => { align(4); const v = view.getUint32(off, le); off += 4; return v; };
    const readInt32 = () => { align(4); const v = view.getInt32(off, le); off += 4; return v; };
    const readFloat64 = () => { align(8); const v = view.getFloat64(off, le); off += 8; return v; };
    const readString = () => { const len = readUint32(); if (!len) return ''; const b = new Uint8Array(data, off, len - 1); off += len; return Buffer.from(b).toString('utf8'); };
    readInt32(); readUint32(); readString(); // header
    const nameCount = readUint32();
    const names = [];
    for (let i = 0; i < nameCount; i++) names.push(readString());
    const posCount = readUint32();
    const positions = [];
    for (let i = 0; i < posCount; i++) positions.push(readFloat64().toFixed(3));
    return { names, positions };
  } catch { return null; }
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

  const tfStaticCh = server.addChannel({
    topic: '/tf_static',
    encoding: 'json',
    schemaName: 'tf2_msgs/TFMessage',
    schema: '',
  });

  server.handleConnection(ws, addr);

  // Send /tf_static once after connection is established
  setImmediate(() => {
    server.sendMessage(
      tfStaticCh,
      BigInt(Date.now()) * 1_000_000n,
      Buffer.from(JSON.stringify(buildTFMessage(STATIC_LINKS, 0))),
    );
  });

  // Handle messages published by the client (e.g. /joint_command)
  server.on('message', (event) => {
    const { channel, data } = event;
    const topic = channel?.topic ?? '(unknown)';
    if (topic === '/joint_command' || topic.includes('joint')) {
      // Try CDR decode first, then JSON
      const decoded = tryDecodeCdrJointState(data.buffer ?? data);
      if (decoded) {
        console.log(`[${new Date().toISOString()}] RX ${topic} CDR: ${decoded.names.join(',')} = [${decoded.positions.join(', ')}]`);
      } else {
        try {
          const text = Buffer.from(data).toString('utf8');
          const msg = JSON.parse(text);
          console.log(`[${new Date().toISOString()}] RX ${topic} JSON: positions=[${msg.position?.map(v => v.toFixed(3)).join(', ')}]`);
        } catch {
          console.log(`[${new Date().toISOString()}] RX ${topic}: ${data.byteLength ?? data.length} bytes`);
        }
      }
    } else {
      console.log(`[${new Date().toISOString()}] RX ${topic}: ${data.byteLength ?? data.length} bytes`);
    }
  });

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

  // /tf at 20 Hz (dynamic frames)
  const tfTimer = setInterval(() => {
    server.sendMessage(
      tfCh,
      BigInt(Date.now()) * 1_000_000n,
      Buffer.from(JSON.stringify(buildTFMessage(DYNAMIC_LINKS, t))),
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
  console.log('  /joint_states  20 Hz (JSON)');
  console.log('  /pointcloud     5 Hz (PointCloud2 base64, ROS Z-up)');
  console.log('  /tf            20 Hz (JSON, dynamic)');
  console.log('  /tf_static     once  (JSON, static)');
  console.log('  /joint_command  ←  receives CDR/JSON from browser during playback');
});
