import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreTracker } from '../src/core/scoring.js';
import { SCORING } from '../src/utils/constants.js';

describe('ScoreTracker', () => {
  let score;

  beforeEach(() => {
    score = new ScoreTracker();
  });

  it('initializes with default zero scores', () => {
    expect(score.playerScore).toBe(0);
    expect(score.opponentScore).toBe(0);
    expect(score.playerGames).toBe(0);
    expect(score.opponentGames).toBe(0);
    expect(score.currentGameNumber).toBe(1);
    expect(score.matchWinner).toBeNull();
  });

  it('increments point for player and sets server', () => {
    const res = score.addPoint('player');
    expect(score.playerScore).toBe(1);
    expect(score.server).toBe('player');
    expect(res.type).toBe('POINT_SCORED');
  });

  it('wins game when player reaches 7 points with >=2 point lead', () => {
    for (let i = 0; i < 6; i++) {
      score.addPoint('player');
    }
    const res = score.addPoint('player'); // 7th point vs 0
    expect(res.type).toBe('GAME_WON');
    expect(res.winner).toBe('player');
    expect(score.playerGames).toBe(1);
    expect(score.playerScore).toBe(0); // reset for game 2
    expect(score.currentGameNumber).toBe(2);
  });

  it('wins match when winning 2 games (best of 3)', () => {
    // Win game 1
    for (let i = 0; i < 7; i++) score.addPoint('player');
    // Win game 2
    for (let i = 0; i < 6; i++) score.addPoint('player');
    const res = score.addPoint('player');

    expect(res.type).toBe('MATCH_WON');
    expect(res.winner).toBe('player');
    expect(score.playerGames).toBe(2);
    expect(score.matchWinner).toBe('player');
  });
});
