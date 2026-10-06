import { describe, it, expect } from 'vitest';
import { Shuttlecock } from '../src/entities/shuttlecock.js';
import { SHOT_TYPES } from '../src/utils/constants.js';

describe('Shuttlecock Net Fault & Trail', () => {
  it('detects net fault when shuttlecock crosses net below net height', () => {
    const s = new Shuttlecock();
    // Launch low net shot from Z=-1.5 to Z=+0.5 with height below 1.55m
    s.launch(SHOT_TYPES.NET, { x: 0, y: 0.8, z: -1.5 }, { x: 0, y: 0, z: 0.5 }, 0.5, 'player');

    // Simulate flight across net (Z=0)
    for (let i = 0; i < 20; i++) {
      s.update(0.05);
      if (s.landed) break;
    }

    expect(s.hitNet).toBe(true);
    expect(s.landed).toBe(true);
  });

  it('records trail history during flight', () => {
    const s = new Shuttlecock();
    s.launch(SHOT_TYPES.CLEAR, { x: 0, y: 1.5, z: -4.5 }, { x: 0, y: 0, z: 4.5 }, 1.0, 'player');

    s.update(0.1);
    s.update(0.1);

    expect(s.trailHistory.length).toBeGreaterThan(0);
  });
});
