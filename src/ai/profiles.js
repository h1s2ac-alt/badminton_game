/**
 * profiles.js — AI opponent personality definitions
 *
 * Each profile defines weighted shot preferences and strategic tendencies.
 * The AI opponent.js uses these to make decisions.
 *
 * Pure logic — no DOM or Canvas references.
 */

import { SHOT_TYPES } from '../engine/shots.js';
import { OPPONENT_ZONES } from '../engine/court.js';

// ─── Profile Definitions ──────────────────────────────────────────────────────

/**
 * Shot weights — relative probability of choosing each shot type.
 * Higher = more likely. Values don't need to sum to 1 (normalized in opponent.js).
 *
 * Also defines:
 *  - stats: AI's effective stats (0–10)
 *  - description: shown on opponent select screen
 *  - preferredTargetZones: list of opponent zones the AI likes to target
 *  - reactionSpeed: how quickly AI adapts to patterns (0–1)
 *  - aggressionThreshold: score lead at which AI switches from defensive to aggressive
 */

export const PROFILES = {
  THE_WALL: {
    id: 'THE_WALL',
    name: 'The Wall',
    subtitle: 'Defensive Specialist',
    difficulty: 1,
    description: 'Returns everything. Waits patiently for you to make mistakes. Low smash threat but will grind you down.',
    color: '#06b6d4',  // cyan

    stats: {
      control: 8,
      speed: 7,
      power: 4,
      stamina: 9,
      deception: 4,
    },

    shotWeights: {
      [SHOT_TYPES.CLEAR]:       35,
      [SHOT_TYPES.LOB]:         25,
      [SHOT_TYPES.DROP]:        15,
      [SHOT_TYPES.DRIVE]:       10,
      [SHOT_TYPES.NET_SHOT]:    8,
      [SHOT_TYPES.SMASH]:       4,
      [SHOT_TYPES.CROSS_COURT]: 2,
      [SHOT_TYPES.SLICE]:       1,
    },

    preferredTargetZones: ['OBC', 'OBL', 'OBR'], // deep clears
    reactionSpeed: 0.5,   // slow to adapt to patterns
    aggressionThreshold: 5, // only turns aggressive if losing by 5+
  },

  THUNDER: {
    id: 'THUNDER',
    name: 'Thunder',
    subtitle: 'Power Aggressor',
    difficulty: 2,
    description: 'Smashes relentlessly and pressures the net. Burns stamina fast — outlast the onslaught and exploit the fatigue.',
    color: '#f43f5e',  // coral

    stats: {
      control: 6,
      speed: 8,
      power: 10,
      stamina: 6,
      deception: 5,
    },

    shotWeights: {
      [SHOT_TYPES.SMASH]:       35,
      [SHOT_TYPES.DRIVE]:       20,
      [SHOT_TYPES.DROP]:        15,
      [SHOT_TYPES.NET_SHOT]:    12,
      [SHOT_TYPES.CLEAR]:       8,
      [SHOT_TYPES.CROSS_COURT]: 6,
      [SHOT_TYPES.LOB]:         3,
      [SHOT_TYPES.SLICE]:       1,
    },

    preferredTargetZones: ['OML', 'OMR', 'ONL', 'ONR'], // corners to force movement
    reactionSpeed: 0.7,
    aggressionThreshold: 0, // always aggressive
  },

  THE_FOX: {
    id: 'THE_FOX',
    name: 'The Fox',
    subtitle: 'Deceptive Tactician',
    difficulty: 3,
    description: 'Reads your patterns and counter-attacks with deceptive slices and cross-courts. Vary your strategy or get exploited.',
    color: '#f59e0b',  // amber

    stats: {
      control: 9,
      speed: 7,
      power: 6,
      stamina: 7,
      deception: 10,
    },

    shotWeights: {
      [SHOT_TYPES.SLICE]:       25,
      [SHOT_TYPES.CROSS_COURT]: 20,
      [SHOT_TYPES.DROP]:        18,
      [SHOT_TYPES.NET_SHOT]:    15,
      [SHOT_TYPES.DRIVE]:       10,
      [SHOT_TYPES.CLEAR]:       7,
      [SHOT_TYPES.SMASH]:       3,
      [SHOT_TYPES.LOB]:         2,
    },

    preferredTargetZones: ['ONL', 'ONR', 'OBL', 'OBR'], // angles and extremes
    reactionSpeed: 0.9, // highly adaptive
    aggressionThreshold: -3, // plays aggressively even when ahead
  },
};

/**
 * Get a profile by ID.
 * @param {string} profileId
 * @returns {object}
 */
export function getProfile(profileId) {
  const profile = PROFILES[profileId];
  if (!profile) throw new Error(`Unknown AI profile: ${profileId}`);
  return profile;
}

/**
 * All profile IDs in order of difficulty.
 */
export const PROFILE_IDS = Object.keys(PROFILES);
