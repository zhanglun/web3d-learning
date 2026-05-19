import { useCallback, useEffect, useRef, useState } from 'react';

interface UrlState {
  joints?: Record<string, number>;
  robot?: string;
  ikTarget?: [number, number, number];
  showAxes?: boolean;
  ikEnabled?: boolean;
}

function encode(state: UrlState): string {
  return btoa(JSON.stringify(state));
}

function decode(hash: string): UrlState {
  try {
    return JSON.parse(atob(hash.replace(/^#/, '')));
  } catch {
    return {};
  }
}

export function useUrlState(initial: UrlState = {}) {
  const [state, setState] = useState<UrlState>(() => {
    const hash = window.location.hash;
    return hash ? { ...initial, ...decode(hash) } : initial;
  });

  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStateAndSync = useCallback((updater: (prev: UrlState) => UrlState) => {
    setState(prev => {
      const next = updater(prev);
      if (throttleRef.current) clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(() => {
        window.history.replaceState(null, '', '#' + encode(next));
      }, 200);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (throttleRef.current) clearTimeout(throttleRef.current);
    };
  }, []);

  return [state, setStateAndSync] as const;
}
