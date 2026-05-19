import type { Trajectory } from './trajectory';

const BASE = '/api';

export async function probeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveRemote(traj: Trajectory): Promise<void> {
  const res = await fetch(`${BASE}/trajectories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(traj),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
}

export async function listRemote(): Promise<Trajectory[]> {
  const res = await fetch(`${BASE}/trajectories`);
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return res.json();
}

export async function deleteRemote(id: string): Promise<void> {
  const res = await fetch(`${BASE}/trajectories/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}
