# Web3D Learning

基于 React Three Fiber 的 3D 机器人可视化与遥操作学习项目，包含 URDF 加载、逆运动学、轨迹录制回放、ROS2 实时通信等功能。

## 快速开始

```bash
pnpm install
pnpm dev
```

浏览器打开 `http://localhost:5173`。

---

## ArmDeck — 机械臂遥操作平台

入口：顶部导航 → **ArmDeck**，或直接访问 `/armdeck`。

### 界面布局

```
┌─────────┬───────────────────────┬────────────┐
│ 关节控制 │       3D 视口          │  Transport │
│  滑块   │  (可旋转/缩放/平移)     │  ROS Panel │
└─────────┴───────────────────────┴────────────┘
```

### 基本操控

| 操作 | 说明 |
|------|------|
| 左侧滑块 | 直接拖动各关节角度 |
| TopBar → IK | 开启逆运动学，3D 场景出现绿色目标球 |
| 拖动绿色球 | IK 自动求解关节角，机械臂跟随运动 |
| TopBar → Axes | 显示/隐藏各关节坐标轴 |
| TopBar → Share | 复制当前状态链接（关节角编码在 URL 中）|

### Recording 录制流程

右侧 **Transport** 面板：

```
1. 点击 Record          → 开始录制（红点闪烁，实时显示帧数）
2. 操控关节或拖动 IK 球   → 执行想要录制的动作
3. 点击 Stop            → 结束录制
4. 填写名称 → Save       → 保存到本地 IndexedDB
5. 列表中点 ▶            → 回放轨迹
6. 点 ↓                 → 导出为 LeRobot v1 格式 JSON
```

**Transport 面板右上角标签**：
- `Local` — 轨迹存储在浏览器 IndexedDB
- `Remote` — 检测到后端服务（`/api/health`）时自动切换为远端存储

---

## ROS2 集成

ArmDeck 通过 **Foxglove WebSocket 协议**（非 rosbridge v2）与 ROS2 通信。

### 订阅的 Topic

| Topic | 类型 | 用途 |
|-------|------|------|
| `/joint_states` | `sensor_msgs/JointState` | 驱动 3D 模型关节 |
| `/tf` | `tf2_msgs/TFMessage` | 显示 TF 坐标系树 |
| `/pointcloud` | `sensor_msgs/PointCloud2` | 渲染点云 |

### 发布的 Topic

| Topic | 类型 | 用途 |
|-------|------|------|
| `/joint_command` | `sensor_msgs/JointState` | 回放时向实机发送关节角指令 |

---

## 启动 ROS2 Bridge（Docker）

macOS 上通过 Docker 运行 ROS2 Humble + foxglove_bridge，无需本地安装 ROS2。

### 前置条件

- [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) 已安装并运行

### 一键启动

```bash
# 第一次运行会构建镜像（拉取 ~2GB，需要几分钟）
pnpm ros2:start
```

启动成功后输出：

```
WebSocket ready at  ws://localhost:8765
```

### 常用命令

```bash
pnpm ros2:start    # 启动（后台运行）
pnpm ros2:stop     # 停止
pnpm ros2:logs     # 实时查看日志
pnpm ros2:shell    # 进入容器 bash（发 topic、调试用）
```

或直接调用脚本（支持更多子命令）：

```bash
bash scripts/ros2-bridge.sh {start|stop|restart|logs|shell|status|rebuild}
```

### 连接 ArmDeck

1. 启动 Bridge 后，打开 ArmDeck
2. 右侧 **ROS2 Bridge** 面板 → URL 填 `ws://localhost:8765`
3. 点击 **Connect** → 状态指示灯变绿
4. 勾选需要的可视化选项：
   - **Drive joints from /joint_states** — ROS2 关节角实时驱动模型
   - **Show point cloud** — 渲染点云
   - **Show TF frames** — 显示坐标系树

Topics 区域显示对应 Hz 表示数据正常接收。

### 在容器内发布测试数据

```bash
# 进入容器
pnpm ros2:shell

# 模拟 6 轴机械臂发布 joint_states（30 Hz）
ros2 topic pub /joint_states sensor_msgs/msg/JointState \
  '{header: {stamp: {sec: 0}}, name: ["joint1","joint2","joint3","joint4","joint5","joint6"], position: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6], velocity: [], effort: []}' \
  --rate 30

# 查看所有可用 topic
ros2 topic list

# 查看某个 topic 的数据
ros2 topic echo /joint_states
```

### 接入真实机械臂

将机械臂的 ROS2 driver 启动在同一台运行 Bridge 的机器上，foxglove_bridge 会自动暴露所有 topic，ArmDeck 无需任何改动。

---

## 开发脚本

```bash
pnpm dev              # 启动 Vite 开发服务器
pnpm build            # 构建生产版本
pnpm typecheck        # TypeScript 类型检查
pnpm mock-ros         # 启动 mock ROS server（本地调试用）
pnpm dataset-server   # 启动轨迹数据后端（本地 REST API）
pnpm dev:all          # 同时启动 dev + dataset-server
```

---

## 项目结构

```
src/
  components/armdeck/   # ArmDeck 所有组件
  ros/                  # Foxglove WS bridge 客户端、CDR 编解码
  recording/            # 轨迹录制、IndexedDB 存储、LeRobot 导出
  ik/                   # 逆运动学求解器（closed-chain-ik）
  robots.ts             # 机器人定义（URDF 路径、默认关节、IK 参数）
docker/
  Dockerfile            # ROS2 Humble + foxglove_bridge 镜像
  docker-compose.yml
scripts/
  ros2-bridge.sh        # Docker 管理脚本
```
