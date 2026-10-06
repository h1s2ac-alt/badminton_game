/**
 * opponent.js — AI decision engine
 *
 * Given the current match state and a profile, selects a shot type and target zone.
 * Uses weighted random selection biased by:
 *   - Profile shot weights
 *   - Current game situation (score gap, stamina)
 *   - Shuttle height and player position
 *   - Player's pattern history
 *
 * Pure logic — no DOM or Canvas references.
 * Accepts optional rand() for testability.
 */

import { SHOT_TYPES, SHOT_DEFS, availableShots } from '../engine/shots.js';
import { OPPONENT_ZONES, validTargetZones } from '../engine/court.js';
import { isShuttleHigh } from '../engine/rules.js';
import { isSmashBlocked } from '../engine/stamina.js';

// ─── Main Decision Function ───────────────────────────────────────────────────

/**
 * AI picks a shot and target zone.
 *
 * @param {object} state — match state (same shape as in match.js)
 * @param {object} profile — from profiles.js
 * @param {PatternTracker} patternTracker
 * @param {Function} [rand] — Math.random by default
 * @returns {{ shotType: string, targetZone: string }}
 */
export function decideShot(state, profile, patternTracker, rand = Math.random) {
  // Build available shots for AI (from opponent's perspective — they're on their side)
  const aiShuttleHigh = isShuttleHigh(state.opponentLastShot ?? 'CLEAR');

  const available = availableShots({
    playerZone: state.opponentZone,
    shuttleIsHigh: aiShuttleHigh,
    stamina: state.opponentStamina,
  });

  // Get adjusted weights
  const weights = _buildWeights(available, profile, state, patternTracker);

  // Weighted random selection
  const shotType = _weightedRandom(weights, rand);

  // Pick target zone
  const targetZone = _pickTargetZone(shotType, profile, state, patternTracker, rand);

  return { shotType, targetZone };
}

// ─── Weight Building ──────────────────────────────────────────────────────────

function _buildWeights(available, profile, state, patternTracker) {
  const weights = {};

  for (const shot of available) {
    let w = profile.shotWeights[shot] ?? 1;

    // Situational adjustments ──────────────────────────────────────────────────

    // Smash if shuttle is high and AI is aggressive/powerful
    if (shot === SHOT_TYPES.SMASH) {
      if (state.shuttleIsHighForAI) w *= 1.5;
      else w *= 0.2; // heavily penalise smash from low shuttle
    }

    // Defensive when stamina is low — favour clears and lobs
    if (state.opponentStamina < 35) {
      if (shot === SHOT_TYPES.CLEAR || shot === SHOT_TYPES.LOB) w *= 1.6;
      if (shot === SHOT_TYPES.SMASH) w *= 0.4;
    }

    // When leading big, The Wall becomes even more conservative
    const scoreLead = state.currentGame.opponentScore - state.currentGame.playerScore;
    if (scoreLead >= profile.aggressionThreshold + 3) {
      if (shot === SHOT_TYPES.CLEAR) w *= 1.3;
      if (shot === SHOT_TYPES.SMASH) w *= 0.7;
    }

    // When behind, increase aggression
    if (scoreLead < -profile.aggressionThreshold) {
      if (shot === SHOT_TYPES.SMASH || shot === SHOT_TYPES.DROP) w *= 1.4;
    }

    // Counter player's dominant zone: if player often goes cross-court, AI covers it
    if (patternTracker?.dominantShot === SHOT_TYPES.CROSS_COURT) {
      if (shot === SHOT_TYPES.NET_SHOT) w *= 1.3; // cut off the net after cross-court
    }

    weights[shot] = Math.max(0.5, w);
  }

  return weights;
}

// ─── Target Zone Selection ────────────────────────────────────────────────────

function _pickTargetZone(shotType, profile, state, patternTracker, rand) {
  // Valid target zones for this shot (these are player-side zones)
  const valid = validTargetZones(state.opponentZone, shotType);
  if (valid.length === 0) return 'PBC'; // fallback

  // Convert to player zones (targets for AI = player side)
  // validTargetZones returns opponent zones (O*), but AI targets player (P*)
  const playerTargets = valid.map(z => z.replace(/^O/, 'P'));

  // Bias toward profile's preferred zones, but these are opponent zones in the profile
  // (The profile preferred zones describe zones on the court in general — map them)
  const preferred = profile.preferredTargetZones
    .map(z => z.replace(/^O/, 'P'));

  // Build zone weights
  const zoneWeights = {};
  for (const zone of playerTargets) {
    let w = 1;

    // Prefer profile-preferred zones
    if (preferred.includes(zone)) w *= 2.0;

    // Prefer zones away from player's current position (exploit gaps)
    if (!zone.includes(state.playerZone?.[1])) w *= 1.3;

    // Counter player pattern — if player always recovers to PMC, target PBL/PBR
    if (patternTracker?.dominantZone && zone !== patternTracker.dominantZone) w *= 1.1;

    zoneWeights[zone] = w;
  }

  return _weightedRandom(zoneWeights, rand);
}

// ─── Weighted Random ──────────────────────────────────────────────────────────

/**
 * Pick a key from an object of { key: weight } using weighted random.
 *
 * @param {Object.<string, number>} weights
 * @param {Function} rand
 * @returns {string}
 */
export function weightedRandom(weights, rand = Math.random) {
  return _weightedRandom(weights, rand);
}

function _weightedRandom(weights, rand) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;

  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }

  return entries[entries.length - 1][0]; // fallback
}
