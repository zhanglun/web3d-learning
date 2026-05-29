import { useState, useEffect } from 'react';
import { probeHealth } from './backend';

export type BackendStatus = 'checking' | 'remote' | 'local';

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');
  useEffect(() => {
    probeHealth().then(ok => setStatus(ok ? 'remote' : 'local'));
  }, []);
  return status;
}
