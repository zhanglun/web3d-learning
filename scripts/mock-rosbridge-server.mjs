/**
 * Mock rosbridge WebSocket server
 *
 * Implements the rosbridge v2 protocol so the /robot page can connect
 * without a real ROS2 installation.
 *
 * Topics published (server → browser):
 *   /odom   10 Hz  nav_msgs/Odometry     — robot circles the origin
 *   /scan   10 Hz  sensor_msgs/LaserScan — 360° lidar with fake obstacles
 *
 * Topics received (browser → server):
 *   /cmd_vel  geometry_msgs/Twist — logged to console
 *
 * Usage:
 *   node scripts/mock-rosbridge-server.mjs
 *   Then open /robot and connect to ws://localhost:9090
 */

import { WebSocketServer } from 'ws';

const PORT = 9090;

// ── Simulation state ────────────────────────────────────────────────────────

let t = 0;           // seconds elapsed
const RADIUS = 3;    // metres, orbit radius
const SPEED  = 0.4;  // rad/s, angular velocity

function odomMsg() {
  const yaw = t * SPEED;
  const x   = RADIUS * Math.cos(yaw);
  const y   = RADIUS * Math.sin(yaw);

  // yaw → quaternion (rotation around Z)
  const qz = Math.sin(yaw / 2);
  const qw = Math.cos(yaw / 2);

  return {
    header: { stamp: stamp(), frame_id: 'odom' },
    child_frame_id: 'base_link',
    pose: {
      pose: {
        position:    { x, y, z: 0 },
        orientation: { x: 0, y: 0, z: qz, w: qw },
      },
      covariance: Array(36).fill(0),
    },
    twist: {
      twist: {
        linear:  { x: RADIUS * SPEED, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: SPEED },
      },
      covariance: Array(36).fill(0),
    },
  };
}

function scanMsg() {
  const NUM_BEAMS    = 360;
  const RANGE_MAX    = 8.0;
  const RANGE_MIN    = 0.15;
  const ANGLE_MIN    = -Math.PI;
  const ANGLE_INC    = (2 * Math.PI) / NUM_BEAMS;

  // Three fake rectangular obstacles at fixed world positions.
  // We convert each to robot-local polar coords and paint ranges.
  const obstacles = [
    { wx: 4,  wy: 0,  hw: 0.5, hd: 0.5 },
    { wx: -3, wy: 2,  hw: 0.4, hd: 0.8 },
    { wx: 1,  wy: -4, hw: 0.6, hd: 0.4 },
  ];

  const robotX   = RADIUS * Math.cos(t * SPEED);
  const robotY   = RADIUS * Math.sin(t * SPEED);
  const robotYaw = t * SPEED + Math.PI / 2; // heading tangent to circle

  const ranges = Array(NUM_BEAMS).fill(RANGE_MAX);

  for (const obs of obstacles) {
    // corners of the obstacle box in world frame
    const corners = [
      [obs.wx - obs.hw, obs.wy - obs.hd],
      [obs.wx + obs.hw, obs.wy - obs.hd],
      [obs.wx + obs.hw, obs.wy + obs.hd],
      [obs.wx - obs.hw, obs.wy + obs.hd],
    ];

    for (const [cx, cy] of corners) {
      const dx = cx - robotX;
      const dy = cy - robotY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > RANGE_MAX) continue;

      // bearing in robot frame
      const bearing = Math.atan2(dy, dx) - robotYaw;
      const beamIdx = Math.round((bearing - ANGLE_MIN) / ANGLE_INC) % NUM_BEAMS;
      const idx     = (beamIdx + NUM_BEAMS) % NUM_BEAMS;

      if (dist < ranges[idx]) ranges[idx] = dist;
    }
  }

  // Add slight noise
  for (let i = 0; i < ranges.length; i++) {
    if (ranges[i] < RANGE_MAX) ranges[i] += (Math.random() - 0.5) * 0.05;
    ranges[i] = Math.max(RANGE_MIN, Math.min(RANGE_MAX, ranges[i]));
  }

  return {
    header:          { stamp: stamp(), frame_id: 'base_scan' },
    angle_min:       ANGLE_MIN,
    angle_max:       Math.PI,
    angle_increment: ANGLE_INC,
    time_increment:  0,
    scan_time:       0.1,
    range_min:       RANGE_MIN,
    range_max:       RANGE_MAX,
    ranges,
    intensities: [],
  };
}

function stamp() {
  const ms = Date.now();
  return { sec: Math.floor(ms / 1000), nanosec: (ms % 1000) * 1e6 };
}

// ── rosbridge protocol helpers ───────────────────────────────────────────────

function publish(ws, topic, msg) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ op: 'publish', topic, msg }));
}

// ── Server ───────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws, req) => {
  const addr = req.socket.remoteAddress ?? 'unknown';
  console.log(`[${new Date().toISOString()}] Client connected: ${addr}`);

  // Track which topics this client subscribed to
  const subscriptions = new Set();

  const odomTimer = setInterval(() => {
    t += 0.1;
    if (subscriptions.has('/odom')) publish(ws, '/odom', odomMsg());
    if (subscriptions.has('/scan')) publish(ws, '/scan', scanMsg());
  }, 100);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    const { op, topic } = msg;

    if (op === 'subscribe') {
      subscriptions.add(topic);
      console.log(`[subscribe] ${topic}`);
    } else if (op === 'unsubscribe') {
      subscriptions.delete(topic);
      console.log(`[unsubscribe] ${topic}`);
    } else if (op === 'advertise') {
      console.log(`[advertise]  ${topic}  (${msg.type})`);
    } else if (op === 'publish' && topic === '/cmd_vel') {
      const { linear, angular } = msg.msg ?? {};
      console.log(
        `[cmd_vel]    linear.x=${linear?.x?.toFixed(2) ?? 0}  ` +
        `angular.z=${angular?.z?.toFixed(2) ?? 0}`
      );
    }
  });

  ws.on('close', () => {
    clearInterval(odomTimer);
    console.log(`[${new Date().toISOString()}] Client disconnected: ${addr}`);
  });

  ws.on('error', (err) => console.error('WS error:', err.message));
});

wss.on('listening', () => {
  console.log(`\nMock rosbridge server listening on ws://localhost:${PORT}`);
  console.log('  /odom    10 Hz  nav_msgs/Odometry    (robot circles origin, r=3m)');
  console.log('  /scan    10 Hz  sensor_msgs/LaserScan (360° lidar, 3 fake obstacles)');
  console.log('  /cmd_vel        geometry_msgs/Twist   ← receives from browser\n');
  console.log('Open /robot in the browser and connect to ws://localhost:9090\n');
});
