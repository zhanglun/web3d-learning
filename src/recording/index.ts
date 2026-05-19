import type { Trajectory } from './trajectory';
import * as local from './storage';
import * as remote from './backend';

async function useRemote(): Promise<boolean> {
  return remote.probeHealth();
}

export async function save(traj: Trajectory): Promise<void> {
  if (await useRemote()) {
    return remote.saveRemote(traj);
  }
  return local.saveTrajectory(traj);
}

export async function list(): Promise<Trajectory[]> {
  if (await useRemote()) {
    return remote.listRemote();
  }
  return local.listTrajectories();
}

export async function remove(id: string): Promise<void> {
  if (await useRemote()) {
    return remote.deleteRemote(id);
  }
  return local.deleteTrajectory(id);
}
