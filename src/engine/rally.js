/**
 * rally.js — Rally resolution engine
 *
 * Orchestrates a single exchange within a rally:
 *   1. Player selects a shot and target zone
 *   2. Calculate success / fault / winner / return outcome
 *   3. AI picks a response shot
 *   4. Return a structured result describing what happened
 *
 * Pure logic — no DOM or Canvas references.
 * Accepts an optional `rand` function (default: Math.random) for testability.
 */

import { SHOT_DEFS, shotSuccessChance, winnerChance, movementDistance, availableShots } from './shots.js';
import { calculateDrain, applyDrain, recoverIdle } from './stamina.js';
import { isShotOut, isShuttleHigh, isServeLet } from './rules.js';
import { recoveryZone, validTargetZones, mirrorZone } from './court.js';

// ─── Result Types ─────────────────────────────────────────────────────────────

export const RALLY_OUTCOMES = {
  WINNER:    'WINNER',     // player's shot unreturnable — point to player
  ERROR:     'ERROR',      // player's shot faulted — point to opponent
  RETURNED:  'RETURNED',   // opponent reached and hit back — rally continues
  LET:       'LET',        // serve let — replay
};

// ─── Main Exchange Function ───────────────────────────────────────────────────

/**
 * Resolve one exchange in a rally (player shoots, AI responds).
 *
 * @param {object} state — current game state snapshot
 * @param {string} state.playerZone        — player's current zone
 * @param {string} state.opponentZone      — opponent's current zone
 * @param {number} state.playerStamina     — player's stamina (0–100)
 * @param {number} state.opponentStamina   — opponent's stamina (0–100)
 * @param {object} state.playerStats       — { control, speed, power, stamina, deception } (all 0–10)
 * @param {object} state.opponentStats     — same shape
 * @param {string} state.opponentLastShot  — SHOT_TYPES key of opponent's previous shot (for shuttle height)
 * @param {number} state.patternBonus      — AI pattern prediction bonus (0–0.15)
 * @param {number} state.anticipationPenalty — AI anticipation modifier (0–0.2)
 * @param {boolean} state.isServe          — is this the first shot of the rally (a serve)?
 *
 * @param {object} playerDecision
 * @param {string} playerDecision.shotType   — SHOT_TYPES key
 * @param {string} playerDecision.targetZone — opponent zone ID to aim at
 *
 * @param {Function} aiDecide — function(state) => { shotType, targetZone }
 * @param {Function} [rand]   — random number generator [0,1], default Math.random
 *
 * @returns {object} exchange result
 */
export function resolveExchange(state, playerDecision, aiDecide, rand = Math.random) {
  const { shotType, targetZone } = playerDecision;
  const def = SHOT_DEFS[shotType];

  // ── Check serve let ─────────────────────────────────────────────────────────
  if (state.isServe && isServeLet(rand())) {
    return {
      outcome: RALLY_OUTCOMES.LET,
      description: 'The serve clipped the net and landed in — let, replay the point.',
      newPlayerZone: state.playerZone,
      newOpponentZone: state.opponentZone,
      playerStaminaAfter: state.playerStamina,
      opponentStaminaAfter: state.opponentStamina,
      playerShot: null,
      opponentShot: null,
    };
  }

  // ── Calculate player movement & stamina drain ────────────────────────────────
  // Determine where shuttle is landing on player side (for serve it's a forward lunge)
  const shuttleIsHigh = isShuttleHigh(state.opponentLastShot);
  const distanceTraveled = movementDistance(state.playerZone, targetZone.replace(/^O/, 'P'));
  // (We mirror the target zone letter positions to compute how far player reached)

  const drain = calculateDrain({
    shotStaminaCost: def.staminaCost,
    distanceTraveled,
    currentStamina: state.playerStamina,
    speedStat: state.playerStats.speed,
  });
  const playerStaminaAfter = applyDrain(state.playerStamina, drain);

  // ── Shot success check ───────────────────────────────────────────────────────
  const successP = shotSuccessChance({
    shotType,
    stamina: state.playerStamina,
    controlStat: state.playerStats.control,
    distanceTraveled,
    deceptionStat: state.playerStats.deception,
    anticipationPenalty: state.anticipationPenalty,
  });

  if (isShotOut(successP, rand())) {
    // Player's shot faulted — error
    return {
      outcome: RALLY_OUTCOMES.ERROR,
      description: _errorDescription(shotType),
      newPlayerZone: recoveryZone(shotType, state.playerZone),
      newOpponentZone: state.opponentZone,
      playerStaminaAfter,
      opponentStaminaAfter: recoverIdle(state.opponentStamina),
      playerShot: { shotType, targetZone },
      opponentShot: null,
    };
  }

  // ── Winner check ─────────────────────────────────────────────────────────────
  const winP = winnerChance({
    shotType,
    targetZone,
    opponentZone: state.opponentZone,
    opponentSpeed: state.opponentStats.speed,
    opponentStamina: state.opponentStamina,
    playerDeception: state.playerStats.deception,
    patternBonus: state.patternBonus,
  });

  if (rand() < winP) {
    return {
      outcome: RALLY_OUTCOMES.WINNER,
      description: _winnerDescription(shotType, targetZone),
      newPlayerZone: recoveryZone(shotType, state.playerZone),
      newOpponentZone: state.opponentZone,
      playerStaminaAfter,
      opponentStaminaAfter: recoverIdle(state.opponentStamina),
      playerShot: { shotType, targetZone },
      opponentShot: null,
    };
  }

  // ── Opponent returns ─────────────────────────────────────────────────────────
  const aiResponse = aiDecide({
    ...state,
    playerZone: state.opponentZone,   // AI is now the "shooter"
    opponentZone: recoveryZone(shotType, state.playerZone),
    opponentLastShot: shotType,       // shuttle height = what player just hit
    playerStamina: state.opponentStamina,
  });

  // AI drain
  const aiDist = movementDistance(state.opponentZone, targetZone);
  const aiDef = SHOT_DEFS[aiResponse.shotType];
  const aiDrain = calculateDrain({
    shotStaminaCost: aiDef.staminaCost,
    distanceTraveled: aiDist,
    currentStamina: state.opponentStamina,
    speedStat: state.opponentStats.speed,
  });
  const opponentStaminaAfter = applyDrain(state.opponentStamina, aiDrain);

  return {
    outcome: RALLY_OUTCOMES.RETURNED,
    description: _returnDescription(shotType, targetZone, aiResponse.shotType, aiResponse.targetZone),
    // Player's next position = where the opponent's shot lands (they run to receive it there)
    newPlayerZone: aiResponse.targetZone,
    newOpponentZone: mirrorZone(recoveryZone(aiResponse.shotType, state.opponentZone)),
    shuttleLandingZone: aiResponse.targetZone,  // where shuttle is heading for player's next shot
    opponentLastShot: aiResponse.shotType,
    playerStaminaAfter,
    opponentStaminaAfter,
    playerShot: { shotType, targetZone },
    opponentShot: { shotType: aiResponse.shotType, targetZone: aiResponse.targetZone },
    shuttleIsHighForPlayer: isShuttleHigh(aiResponse.shotType),
  };
}

// ─── Description Helpers ──────────────────────────────────────────────────────

const ZONE_LABELS = {
  ONL: 'opponent net-left', ONC: 'opponent net-center', ONR: 'opponent net-right',
  OML: 'opponent mid-left', OMC: 'opponent mid-center', OMR: 'opponent mid-right',
  OBL: 'opponent back-left', OBC: 'opponent back-center', OBR: 'opponent back-right',
  PNL: 'your net-left', PNC: 'your net-center', PNR: 'your net-right',
  PML: 'your mid-left', PMC: 'your mid-center', PMR: 'your mid-right',
  PBL: 'your back-left', PBC: 'your back-center', PBR: 'your back-right',
};

function _label(zone) { return ZONE_LABELS[zone] || zone; }

function _errorDescription(shotType) {
  const msgs = {
    SMASH:       'Your smash went into the net!',
    DROP:        'Your drop shot clipped the net.',
    CROSS_COURT: 'Your cross-court shot sailed out wide.',
    SLICE:       'Your slice spun into the net.',
    NET_SHOT:    'Your net shot hit the tape.',
    DRIVE:       'Your drive went long.',
    CLEAR:       'Your clear sailed out the back.',
    LOB:         'Your lob drifted out of bounds.',
  };
  return msgs[shotType] || 'Your shot faulted.';
}

function _winnerDescription(shotType, targetZone) {
  const msgs = {
    SMASH:       `Smash winner! Opponent couldn't reach the ${_label(targetZone)}.`,
    DROP:        `Brilliant drop to the ${_label(targetZone)} — opponent too far back!`,
    CROSS_COURT: `Cross-court to ${_label(targetZone)} — opponent wrong-footed!`,
    SLICE:       `Deceptive slice to ${_label(targetZone)} — opponent couldn't read it!`,
    NET_SHOT:    `Tight net shot to ${_label(targetZone)} — opponent couldn't lift!`,
    DRIVE:       `Drive winner past the opponent!`,
    CLEAR:       `Perfect clear to ${_label(targetZone)} — opponent caught late.`,
    LOB:         `Lob over the opponent's head to ${_label(targetZone)}!`,
  };
  return msgs[shotType] || `Winner to ${_label(targetZone)}!`;
}

function _returnDescription(playerShot, targetZone, aiShot, aiTarget) {
  return `You played a ${SHOT_DEFS[playerShot]?.label || playerShot} to ${_label(targetZone)}. ` +
         `Opponent returns with a ${SHOT_DEFS[aiShot]?.label || aiShot} to ${_label(aiTarget)}.`;
}
