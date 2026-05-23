# ROS2 Web 机器人可视化与控制 Demo — 设计文档

**日期：** 2026-05-23
**项目：** web3d-learning
**目标：** 在现有 React + Three.js 项目中新增 `/robot` 路由，通过 rosbridge WebSocket 连接 ROS2，实现机器人 3D 可视化与浏览器端基础运动控制。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 仿真环境 | ROS2 + Gazebo + TurtleBot3 |
| ROS2-Web 桥接 | rosbridge_suite（rosbridge_websocket，端口 9090） |
| Web 客户端 ROS 通信 | roslibjs |
| 前端框架 | React + TypeScript（现有项目） |
| 3D 渲染 | Three.js via React Three Fiber（现有项目） |
| 状态管理 | Zustand |

---

## 整体架构

```
┌─────────────────────────────────────────┐
│           ROS2 + Gazebo 环境             │
│  TurtleBot3 仿真 → /odom, /scan 话题     │
│  ← /cmd_vel 话题接收控制指令             │
│         rosbridge_websocket:9090         │
└──────────────────┬──────────────────────┘
                   │ WebSocket
┌──────────────────▼──────────────────────┐
│        web3d-learning 项目               │
│  新增路由 /robot                         │
│  roslibjs — 订阅/发布 ROS2 话题          │
│  R3F (Three.js) — 渲染机器人 3D 场景    │
│  虚拟摇杆 — 发布 cmd_vel 指令           │
└─────────────────────────────────────────┘
```

### ROS2 话题

| 方向 | 话题 | 消息类型 | 用途 |
|------|------|----------|------|
| 订阅 | `/odom` | `nav_msgs/Odometry` | 机器人位置 + 姿态，驱动 3D 模型 |
| 订阅 | `/scan` | `sensor_msgs/LaserScan` | 激光雷达点云，渲染为散点 |
| 发布 | `/cmd_vel` | `geometry_msgs/Twist` | 线速度 + 角速度，控制移动 |

---

## 前端组件结构

```
RobotPage
├── ConnectionPanel        # WebSocket 连接状态 + rosbridge 地址输入
├── RobotScene (R3F Canvas)
│   ├── RosSubscriber      # 订阅话题，写入 Zustand store（无渲染）
│   ├── RobotModel         # 读 odom，更新机器人几何体位置/旋转
│   ├── LaserScanPoints    # 读 scan，渲染激光点云
│   ├── GroundGrid         # 参考地面网格
│   └── OrbitControls      # 自由视角
└── ControlPanel
    ├── VirtualJoystick    # 拖拽发布 cmd_vel
    └── SpeedSlider        # 最大速度限制（默认 0.2 m/s）
```

---

## 状态管理（Zustand）

```ts
interface RobotStore {
  ros: Ros | null
  connected: boolean
  odom: OdometryMessage | null
  scan: LaserScanMessage | null
  connect: (url: string) => void
  disconnect: () => void
  setOdom: (data: OdometryMessage) => void
  setScan: (data: LaserScanMessage) => void
}
```

- `RosSubscriber` 是唯一写入 `odom` 和 `scan` 的组件，挂载时订阅话题，卸载时取消订阅。
- `RobotModel`、`LaserScanPoints` 等渲染组件只读 store，不感知 ROS 细节。
- `ConnectionPanel` 调用 `connect` / `disconnect`，读取 `connected` 状态。

---

## 数据流

```
rosbridge WebSocket
    ↓ roslibjs
    RosSubscriber
    ├── setOdom()  → store.odom  → RobotModel (position, quaternion)
    └── setScan()  → store.scan  → LaserScanPoints (points array)

VirtualJoystick (pointer events)
    → 计算 linear.x / angular.z
    → roslibjs Topic.publish()
    → /cmd_vel → ROS2 → Gazebo TurtleBot3
```

### LaserScan 坐标转换

`/scan` 的 `ranges` 数组中每个元素对应一个角度，转换为 3D 坐标：

```
angle = angle_min + i * angle_increment
x = ranges[i] * cos(angle)
y = ranges[i] * sin(angle)
z = 0
```

无效值（`Infinity` 或超出 `range_max`）过滤掉，不渲染。

### 机器人模型

第一版用简单几何体表示 TurtleBot3 轮廓，不加载 URDF：
- 车身：`BoxGeometry(0.28, 0.14, 0.19)`
- 两轮：`CylinderGeometry(0.033, 0.033, 0.018)`

位置和旋转直接映射 `odom.pose.pose`（position.x/y/z + orientation 四元数）。

---

## 开发阶段

### 阶段一：连通性
1. 安装 ROS2 Humble + TurtleBot3 + Gazebo + rosbridge_suite
2. 项目安装依赖：`roslibjs`、`zustand`、`@types/roslib`
3. 实现 `useRobotStore`
4. 实现 `ConnectionPanel`（输入 `ws://localhost:9090`，连接/断开）
5. **验收：** 浏览器控制台能打印出 `/odom` 原始数据

### 阶段二：可视化
1. 实现 `RosSubscriber`，订阅 `/odom` 和 `/scan`，写入 store
2. 实现 `RobotModel`，读取 odom 驱动几何体变换
3. 实现 `LaserScanPoints`，将 ranges 转换为 Three.js Points
4. 添加 `GroundGrid` 和 `OrbitControls`
5. **验收：** Gazebo 里机器人运动，浏览器 3D 场景同步，周围有激光点云

### 阶段三：控制
1. 实现 `VirtualJoystick`（pointer events，拖拽计算速度分量；松开时立即发布零速指令停止机器人）
2. 实现 `SpeedSlider`，限制 `linear.x` 和 `angular.z` 上限
3. **验收：** 拖动摇杆，Gazebo 里 TurtleBot3 跟着运动

---

## 文件结构

```
src/
  routes/
    robot.tsx              # 路由入口，组合所有组件
  components/
    robot/
      ConnectionPanel.tsx
      RosSubscriber.tsx
      RobotModel.tsx
      LaserScanPoints.tsx
      VirtualJoystick.tsx
      SpeedSlider.tsx
  store/
    robotStore.ts          # Zustand store
```

新路由注册到 `src/main.tsx`：`{ path: "/robot", element: <RobotRoute /> }`

---

## 依赖

```bash
pnpm add roslib zustand
pnpm add -D @types/roslib
```

---

## 范围边界

本 Demo **不包含**：
- URDF 模型加载（用简单几何体替代）
- 2D 占用栅格地图（`/map` 话题）
- 导航目标点设置（`/move_base` 或 Nav2）
- 真实机器人适配

这些可以作为后续学习阶段扩展。
