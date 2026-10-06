import { describe, it, expect } from 'vitest';
import { Trajectory } from '../src/core/physics.js';
import { SHOT_TYPES } from '../src/utils/constants.js';

describe('Trajectory', () => {
  it('creates parabolic flight curve from start to target', () => {
    const start = { x: 0, y: 1.5, z: -4.5 };
    const target = { x: 1.5, y: 0, z: 4.5 };
    const traj = new Trajectory(SHOT_TYPES.CLEAR, start, target, 1.0);

    expect(traj.duration).toBeGreaterThan(0);
    expect(traj.completed).toBe(false);

    // Initial position
    const p0 = traj.update(0);
    expect(p0.x).toBeCloseTo(0);
    expect(p0.z).toBeCloseTo(-4.5);

    // Mid flight position should reach apex height
    const pMid = traj.getPositionAt(0.5);
    expect(pMid.y).toBeGreaterThan(start.y);

    // End position
    const pEnd = traj.getPositionAt(1.0);
    expect(pEnd.x).toBeCloseTo(1.5);
    expect(pEnd.z).toBeCloseTo(4.5);
  });

  it('completes trajectory when duration is reached', () => {
    const start = { x: 0, y: 1.5, z: -4.5 };
    const target = { x: 0, y: 0, z: 4.5 };
    const traj = new Trajectory(SHOT_TYPES.SMASH, start, target, 1.0);

    traj.update(2.0); // leap past duration
    expect(traj.completed).toBe(true);
  });
});
