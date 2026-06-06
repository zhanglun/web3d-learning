#!/bin/bash
set -e

source /opt/ros/humble/setup.bash

echo "[ros2-bridge] Starting foxglove_bridge on ws://0.0.0.0:8765"

exec ros2 run foxglove_bridge foxglove_bridge \
  --ros-args \
  -p port:=8765 \
  -p address:=0.0.0.0 \
  -p send_buffer_limit:=10000000
