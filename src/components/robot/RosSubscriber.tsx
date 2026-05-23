import { useEffect } from 'react'
import { Topic } from 'roslib'
import { useRobotStore } from '../../store/robotStore'
import type { OdometryMessage, LaserScanMessage } from './types'

export function RosSubscriber() {
  const ros = useRobotStore(s => s.ros)
  const setOdom = useRobotStore(s => s.setOdom)
  const setScan = useRobotStore(s => s.setScan)

  useEffect(() => {
    if (!ros) return

    const odomTopic = new Topic({
      ros,
      name: '/odom',
      messageType: 'nav_msgs/Odometry',
    })
    odomTopic.subscribe((msg: unknown) => {
      setOdom(msg as unknown as OdometryMessage)
    })

    const scanTopic = new Topic({
      ros,
      name: '/scan',
      messageType: 'sensor_msgs/LaserScan',
    })
    scanTopic.subscribe((msg: unknown) => {
      setScan(msg as unknown as LaserScanMessage)
    })

    return () => {
      odomTopic.unsubscribe()
      scanTopic.unsubscribe()
    }
  }, [ros, setOdom, setScan])

  return null
}
