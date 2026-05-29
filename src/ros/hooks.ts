import { useEffect, useRef, useState } from 'react';
import { rosBridge } from './bridge';

export function useRosTopic<T>(topic: string): T | null {
  const [msg, setMsg] = useState<T | null>(null);

  useEffect(() => {
    const handler = (m: T) => setMsg(m);
    rosBridge.subscribe(topic, handler);
    return () => rosBridge.unsubscribe(topic, handler);
  }, [topic]);

  return msg;
}

export function useRosTopicRef<T>(topic: string): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const handler = (m: T) => { ref.current = m; };
    rosBridge.subscribe(topic, handler);
    return () => rosBridge.unsubscribe(topic, handler);
  }, [topic]);

  return ref;
}

export function useTopicHz(topic: string): number {
  const [hz, setHz] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const handler = () => { countRef.current++; };
    rosBridge.subscribe(topic, handler);

    const interval = setInterval(() => {
      setHz(countRef.current);
      countRef.current = 0;
    }, 1000);

    return () => {
      rosBridge.unsubscribe(topic, handler);
      clearInterval(interval);
    };
  }, [topic]);

  return hz;
}

export function useRosStatus() {
  const [status, setStatus] = useState(rosBridge.status);

  useEffect(() => {
    rosBridge.onStatusChange = (s: string) => setStatus(s as typeof rosBridge.status);
    return () => { rosBridge.onStatusChange = undefined; };
  }, []);

  return status;
}
