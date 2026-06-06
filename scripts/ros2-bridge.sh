#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/../docker"
COMPOSE="docker compose -f $DOCKER_DIR/docker-compose.yml"

CMD="${1:-start}"

case "$CMD" in
  start)
    echo ">>> Building image (first run takes a few minutes)..."
    $COMPOSE build --quiet
    echo ">>> Starting ros2-bridge..."
    $COMPOSE up -d
    echo ""
    echo "  WebSocket ready at  ws://localhost:8765"
    echo "  Logs:  $0 logs"
    echo "  Stop:  $0 stop"
    ;;

  stop)
    echo ">>> Stopping ros2-bridge..."
    $COMPOSE down
    ;;

  restart)
    $0 stop
    $0 start
    ;;

  logs)
    $COMPOSE logs -f ros2-bridge
    ;;

  shell)
    echo ">>> Opening shell in ros2-bridge container..."
    docker exec -it ros2-bridge bash
    ;;

  status)
    $COMPOSE ps
    ;;

  rebuild)
    echo ">>> Rebuilding image from scratch..."
    $COMPOSE build --no-cache
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|logs|shell|status|rebuild}"
    exit 1
    ;;
esac
