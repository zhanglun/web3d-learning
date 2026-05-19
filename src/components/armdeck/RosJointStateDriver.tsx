import { useFrame } from '@react-three/fiber';
import type { URDFRobot } from 'urdf-loader';
import type { JointStateMsg } from '../../ros/types';
import { useRosTopicRef } from '../../ros/hooks';

interface Props {
  robot: URDFRobot;
  enabled: boolean;
}

export function RosJointStateDriver({ robot, enabled }: Props) {
  // All hooks must be called before any early return (Rules of Hooks)
  const msgRef = useRosTopicRef<JointStateMsg>('/joint_states');

  useFrame(() => {
    if (!enabled) return;
    const msg = msgRef.current;
    if (!msg) return;
    msg.name.forEach((name, i) => {
      robot.setJointValue(name, msg.position[i]);
    });
  });

  return null;
}
