// closed-chain-ik: const enum in d.ts conflicts with isolatedModules.
// Use numeric literals that mirror the runtime JS object values.
// DOF: X=0, Y=1, Z=2, EX=3, EY=4, EZ=5
// SOLVE_STATUS: CONVERGED=0, STALLED=1, DIVERGED=2, TIMEOUT=3

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFrame = any;

import type { URDFRobot } from 'urdf-loader';
import { urdfRobotToIKRoot, setUrdfFromIK, Goal, Solver } from 'closed-chain-ik';

export interface IKSystem {
  goal: AnyFrame;
  solver: InstanceType<typeof Solver>;
  setWorldTarget: (x: number, y: number, z: number) => void;
  solve: () => boolean;
  apply: () => void;
}

export function createIK(robot: URDFRobot, toolFrame: string): IKSystem | null {
  try {
    // Returns __world_joint__ (a Joint) even though d.ts says Link
    const ikRoot = urdfRobotToIKRoot(robot as never, false as never) as AnyFrame;
    if (!ikRoot) return null;

    // Fix the base — world joint should not translate/rotate
    ikRoot.clearDoF();

    // Find the end-effector link by name
    let eeLink: AnyFrame = null;
    ikRoot.traverse((node: AnyFrame) => {
      if (String(node.name) === toolFrame) {
        eeLink = node;
        return false;
      }
      return true;
    });

    if (!eeLink) {
      console.warn(`[IK] tool frame "${toolFrame}" not found in IK tree`);
      return null;
    }

    // Create goal at current EE world position
    const goal = new Goal() as AnyFrame;
    const pos: number[] = [0, 0, 0];
    eeLink.getWorldPosition(pos);
    goal.position[0] = pos[0];
    goal.position[1] = pos[1];
    goal.position[2] = pos[2];

    // Constrain only position (DOF X=0, Y=1, Z=2)
    goal.setGoalDoF(0, 1, 2);

    // Closed-chain: goal constrains the EE link
    goal.makeClosure(eeLink);

    const solver = new Solver(ikRoot);
    (solver as AnyFrame).maxIterations = 20;

    return {
      goal,
      solver,
      setWorldTarget(x: number, y: number, z: number) {
        goal.position[0] = x;
        goal.position[1] = y;
        goal.position[2] = z;
        goal.setMatrixWorldNeedsUpdate();
      },
      solve(): boolean {
        const results: number[] = solver.solve() as unknown as number[];
        return results.some(r => r === 0); // CONVERGED = 0
      },
      apply() {
        setUrdfFromIK(robot as never, ikRoot);
      },
    };
  } catch (err) {
    console.error('[IK] createIK failed:', err);
    return null;
  }
}
