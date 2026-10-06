/**
 * rules.js — Badminton singles rules enforcement
 *
 * Pure logic — no DOM or Canvas references.
 *
 * Covers:
 *  - Rally-point scoring (21 pts, win by 2, cap 30)
 *  - Service court logic (right/left based on score parity)
 *  - Side switching (end of each game; at 11 in decider)
 *  - Match format (best of 3)
 *  - Fault detection (shot landed out, service fault)
 *  - Let detection
 */

// ─── Scoring Constants ────────────────────────────────────────────────────────

export const POINTS_TO_WIN  = 21;
export const WIN_BY         = 2;
export const SCORE_CAP      = 30;
export const GAMES_TO_WIN   = 2; // first to 2 games wins the match (best of 3)
export const SIDES_SWITCH_AT_DECIDER = 11; // switch sides mid-game 3

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Determine if a score has won the current game.
 *
 * @param {number} scoreA
 * @param {number} scoreB
 * @returns {boolean}
 */
export function isGameWon(scoreA, scoreB) {
  if (scoreA >= SCORE_CAP) return true;
  if (scoreA >= POINTS_TO_WIN && scoreA - scoreB >= WIN_BY) return true;
  return false;
}

/**
 * Given a winner of a point, returns updated scores.
 *
 * @param {object} p
 * @param {number} p.playerScore
 * @param {number} p.opponentScore
 * @param {'player'|'opponent'} p.pointWinner
 * @returns {{ playerScore: number, opponentScore: number }}
 */
export function applyPoint({ playerScore, opponentScore, pointWinner }) {
  if (pointWinner === 'player') {
    return { playerScore: playerScore + 1, opponentScore };
  }
  return { playerScore, opponentScore: opponentScore + 1 };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Determine which service court (left or right) the server should serve from.
 * In badminton: serve from RIGHT court if server's score is even, LEFT if odd.
 *
 * @param {number} serverScore — the server's current score
 * @returns {'right'|'left'}
 */
export function serviceCourtForServer(serverScore) {
  return serverScore % 2 === 0 ? 'right' : 'left';
}

/**
 * After a point is won, determine who serves next.
 * In rally-point: winner of each rally serves next.
 *
 * @param {'player'|'opponent'} pointWinner
 * @returns {'player'|'opponent'}
 */
export function nextServer(pointWinner) {
  return pointWinner;
}

// ─── Game / Match State ───────────────────────────────────────────────────────

/**
 * Create a fresh game score object.
 * @returns {{ playerScore: number, opponentScore: number }}
 */
export function createGameScore() {
  return { playerScore: 0, opponentScore: 0 };
}

/**
 * Count how many games each side has won from a games array.
 *
 * @param {Array<{playerScore:number, opponentScore:number}>} completedGames
 * @returns {{ playerGames: number, opponentGames: number }}
 */
export function countGamesWon(completedGames) {
  let playerGames = 0;
  let opponentGames = 0;
  for (const g of completedGames) {
    if (g.playerScore > g.opponentScore) playerGames++;
    else opponentGames++;
  }
  return { playerGames, opponentGames };
}

/**
 * Determine if the match is over.
 *
 * @param {number} playerGames
 * @param {number} opponentGames
 * @returns {boolean}
 */
export function isMatchOver(playerGames, opponentGames) {
  return playerGames >= GAMES_TO_WIN || opponentGames >= GAMES_TO_WIN;
}

/**
 * Determine if sides should switch at the start of a new game.
 * Sides switch at the start of each game, and also mid-game in game 3 at 11 points.
 *
 * @param {number} gameNumber — 1-indexed (1, 2, or 3)
 * @returns {boolean} true if sides switch at start of this game
 */
export function shouldSwitchSidesAtGameStart(gameNumber) {
  return gameNumber > 1; // always switch at start of games 2 and 3
}

/**
 * Determine if sides should switch mid-game (only in game 3, at 11 points for leading side).
 *
 * @param {number} gameNumber
 * @param {number} playerScore
 * @param {number} opponentScore
 * @param {boolean} hasSwitchedMidGame — already switched this game?
 * @returns {boolean}
 */
export function shouldSwitchSidesMidGame(gameNumber, playerScore, opponentScore, hasSwitchedMidGame) {
  if (gameNumber !== 3 || hasSwitchedMidGame) return false;
  const leadingScore = Math.max(playerScore, opponentScore);
  return leadingScore >= SIDES_SWITCH_AT_DECIDER;
}

// ─── Fault & Let Detection ────────────────────────────────────────────────────

/**
 * Faults that result in a point for the opponent.
 */
export const FAULT_TYPES = {
  OUT_OF_BOUNDS:   'OUT_OF_BOUNDS',   // shuttle landed outside court
  NET:             'NET',             // shuttle hit net on shot (not serve let)
  DOUBLE_HIT:      'DOUBLE_HIT',      // shuttle hit twice
  CARRY:           'CARRY',           // shuttle held/slung (modeled as error chance)
  SERVICE_FAULT:   'SERVICE_FAULT',   // invalid serve (waist height, angle)
};

/**
 * Check if a shot resulted in an OUT fault.
 * Modeled probabilistically — shots with lower success chance have higher out risk.
 *
 * @param {number} successChance — from shotSuccessChance()
 * @param {number} random        — injected random [0,1] for testability
 * @returns {boolean}
 */
export function isShotOut(successChance, random) {
  return random > successChance;
}

/**
 * A serve let occurs when the serve clips the net and lands in the correct service court.
 * Modeled with a small probability.
 *
 * @param {number} random — injected random [0,1]
 * @returns {boolean}
 */
export function isServeLet(random) {
  return random < 0.03; // 3% chance of let on any serve
}

// ─── Shuttle Height Model ─────────────────────────────────────────────────────

/**
 * Determine if the incoming shuttle is at a high position (enabling smash).
 * In the game model, shuttle height is determined by the opponent's last shot.
 *
 * @param {string} opponentLastShot — SHOT_TYPES key
 * @returns {boolean}
 */
export function isShuttleHigh(opponentLastShot) {
  // Clears and lobs produce high shuttles; net shots, drives, smashes do not
  const highShots = new Set(['CLEAR', 'LOB']);
  return highShots.has(opponentLastShot);
}
