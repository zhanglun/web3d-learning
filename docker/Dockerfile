FROM osrf/ros:humble-desktop

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ros-humble-foxglove-bridge \
 && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8765

ENTRYPOINT ["/entrypoint.sh"]
