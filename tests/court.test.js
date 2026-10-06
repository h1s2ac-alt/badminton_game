import { describe, it, expect } from 'vitest';
import { Court } from '../src/entities/court.js';

describe('Court Boundaries', () => {
  it('correctly identifies points inside court bounds', () => {
    expect(Court.isInBounds(0, 0)).toBe(true);
    expect(Court.isInBounds(2.0, -5.0)).toBe(true);
    expect(Court.isInBounds(-2.0, 5.0)).toBe(true);
  });

  it('identifies out of bounds points', () => {
    expect(Court.isInBounds(3.0, 0)).toBe(false);  // Too wide
    expect(Court.isInBounds(0, 7.0)).toBe(false);  // Too long
    expect(Court.isInBounds(-3.0, -7.0)).toBe(false);
  });

  it('checks side specific court boundaries', () => {
    expect(Court.isInBounds(1.0, -3.0, 'player')).toBe(true);
    expect(Court.isInBounds(1.0, 3.0, 'player')).toBe(false); // On opponent side
    expect(Court.isInBounds(1.0, 3.0, 'opponent')).toBe(true);
  });
});
