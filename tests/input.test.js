import { describe, it, expect } from 'vitest';
import { InputManager } from '../src/core/input.js';
import { Player } from '../src/entities/player.js';

describe('Input Controls Separation & Jump Smash', () => {
  it('separates WASD movement from Arrow Key shot placement', () => {
    // Mock minimal canvas
    const canvas = {
      addEventListener: () => {},
    };

    const input = new InputManager(canvas);

    // 1. WASD controls movement
    input.keys['KeyW'] = true;
    input.keys['KeyA'] = true;
    const move = input.getMovementVector();
    expect(move.active).toBe(true);
    expect(move.dz).toBeGreaterThan(0);
    expect(move.dx).toBeLessThan(0);

    // Arrow keys should NOT contaminate movement
    input.keys['KeyW'] = false;
    input.keys['KeyA'] = false;
    input.keys['ArrowUp'] = true;
    input.keys['ArrowLeft'] = true;
    const moveArrowOnly = input.getMovementVector();
    expect(moveArrowOnly.active).toBe(false);

    // 2. Arrow keys control shot aim direction
    const aim = input.getAimDirection();
    expect(aim.active).toBe(true);
    expect(aim.aimZ).toBe(1); // Deep / Smash
    expect(aim.aimX).toBe(-1); // Left
  });

  it('elevates player y coordinate during smash swing', () => {
    const player = new Player();
    player.triggerSwing('SMASH');
    expect(player.animState).toBe('SWINGING');
    expect(player.currentShotType).toBe('SMASH');

    // Midway through smash swing (t ~ 0.35)
    player.update(0.18, null, true, null);
    expect(player.y).toBeGreaterThan(0.4); // Player is airborne!

    // After swing completes
    player.update(0.40, null, true, null);
    expect(player.animState).toBe('IDLE');
    expect(player.y).toBe(0); // Safely landed
  });
});
