import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '../../store/robotStore'

export function RobotModel() {
  const groupRef = useRef<THREE.Group>(null)
  const odom = useRobotStore(s => s.odom)

  useEffect(() => {
    if (!odom || !groupRef.current) return
    const { position, orientation } = odom.pose.pose
    // ROS x=forward→Three.js x, ROS y=left→Three.js -z, ROS z=up→Three.js y
    groupRef.current.position.set(position.x, position.z, -position.y)
    // Flat-plane yaw: ROS rotates around z-axis, Three.js around y-axis
    const yaw = 2 * Math.atan2(orientation.z, orientation.w)
    groupRef.current.rotation.set(0, -yaw, 0)
  }, [odom])

  return (
    <group ref={groupRef}>
      {/* body */}
      <mesh>
        <boxGeometry args={[0.28, 0.14, 0.19]} />
        <meshStandardMaterial color="#4a90e2" />
      </mesh>
      {/* left wheel */}
      <mesh position={[0, -0.05, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.018, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* right wheel */}
      <mesh position={[0, -0.05, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.018, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}
