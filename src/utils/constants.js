/**
 * Game constants for Court geometry, physics, timing, and rules.
 * 
 * 3D World Coordinates System:
 * X: Left (-2.59m) to Right (+2.59m)
 * Y: Ground (0m) to Ceiling (up to ~8m)
 * Z: Player baseline (-6.7m) -> Net (0m) -> Opponent baseline (+6.7m)
 */

export const COURT = {
  WIDTH: 5.18,          // Singles court width in meters
  TOTAL_LENGTH: 13.4,   // Total court length in meters
  HALF_LENGTH: 6.7,     // Distance from net (Z=0) to baseline
  NET_HEIGHT: 1.55,     // Net height at posts (1.524m at center)
  SHORT_SERVICE_DIST: 1.98, // Distance from net to short service line
  LONG_SERVICE_DIST: 6.7,   // Singles long service line is the baseline
};

export const SHOT_TYPES = {
  CLEAR: 'CLEAR',
  SMASH: 'SMASH',
  DROP: 'DROP',
  DRIVE: 'DRIVE',
  NET: 'NET',
  SERVE: 'SERVE',
};

export const GAME_STATES = {
  TITLE: 'TITLE',
  DIFFICULTY_SELECT: 'DIFFICULTY_SELECT',
  PRE_SERVE: 'PRE_SERVE',
  RALLY: 'RALLY',
  POINT_SCORED: 'POINT_SCORED',
  MATCH_OVER: 'MATCH_OVER',
};

export const SCORING = {
  POINTS_TO_WIN: 7,
  GAMES_TO_WIN: 2, // Best of 3
};

export const DIFFICULTY = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
  PRO: 'PRO',
};

export const DIFFICULTY_CONFIGS = {
  [DIFFICULTY.EASY]: {
    name: 'Beginner Ben',
    color: '#4ADE80',
    reactionTime: 0.7,
    accuracyErr: 0.6,
    speed: 3.5,
    smashChance: 0.2,
    description: 'Slow reaction, relaxed pacing.',
  },
  [DIFFICULTY.MEDIUM]: {
    name: 'Rally Robin',
    color: '#60A5FA',
    reactionTime: 0.45,
    accuracyErr: 0.3,
    speed: 4.8,
    smashChance: 0.4,
    description: 'Balanced player, good consistency.',
  },
  [DIFFICULTY.HARD]: {
    name: 'Smash Sarah',
    color: '#F59E0B',
    reactionTime: 0.28,
    accuracyErr: 0.15,
    speed: 6.0,
    smashChance: 0.7,
    description: 'Fast reflexes, aggressive smashes.',
  },
  [DIFFICULTY.PRO]: {
    name: 'Master Chen',
    color: '#EF4444',
    reactionTime: 0.15,
    accuracyErr: 0.05,
    speed: 7.2,
    smashChance: 0.85,
    description: 'Relentless speed, pinpoint accuracy.',
  },
};
