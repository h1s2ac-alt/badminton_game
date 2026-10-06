/**
 * stamina.js — Fatigue system
 *
 * Pure logic — no DOM or Canvas references.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_STAMINA = 100;
export const MIN_STAMINA = 0;

/** Stamina recovered between points */
export const BETWEEN_POINT_RECOVERY = 8;

/** Stamina recovered between games (incomplete — rest is added to reach ~80 for next game) */
export const BETWEEN_GAME_RECOVERY  = 40;

/** Stamina recovered per exchange when player stays in same zone (idle recovery) */
export const IDLE_RECOVERY_PER_EXCHANGE = 2;

// Movement cost per zone of distance traveled
const MOVEMENT_COST_PER_ZONE = 3;

// Exhaustion spiral multiplier when below threshold
const EXHAUSTION_THRESHOLD = 30;
const EXHAUSTION_MULTIPLIER = 1.35;

// ─── Drain ───────────────────────────────────────────────────────────────────

/**
 * Calculate stamina drained by a single shot.
 *
 * @param {object} p
 * @param {string}  p.shotType        — SHOT_TYPES key
 * @param {number}  p.shotStaminaCost — base cost from SHOT_DEFS
 * @param {number}  p.distanceTraveled— zones moved to reach shuttle (0–4)
 * @param {number}  p.currentStamina  — stamina before this shot
 * @param {number}  p.speedStat       — player speed stat (0–10); faster = less movement cost
 * @returns {number} stamina to drain (positive)
 */
export function calculateDrain({
  shotStaminaCost,
  distanceTraveled,
  currentStamina,
  speedStat = 5,
}) {
  const movementCost = distanceTraveled * MOVEMENT_COST_PER_ZONE;

  // Speed stat reduces movement cost
  const speedReduction = (speedStat - 5) * 0.08; // ±40% at extremes
  const adjustedMovement = movementCost * Math.max(0.5, 1 - speedReduction);

  let total = shotStaminaCost + adjustedMovement;

  // Exhaustion spiral — costs more when already tired
  if (currentStamina < EXHAUSTION_THRESHOLD) {
    total *= EXHAUSTION_MULTIPLIER;
  }

  return Math.round(total);
}

/**
 * Apply drain to stamina, clamped to [MIN_STAMINA, MAX_STAMINA].
 *
 * @param {number} current — current stamina
 * @param {number} drain   — amount to drain
 * @returns {number} new stamina
 */
export function applyDrain(current, drain) {
  return Math.max(MIN_STAMINA, current - drain);
}

// ─── Recovery ────────────────────────────────────────────────────────────────

/**
 * Apply between-point recovery.
 *
 * @param {number} current — current stamina
 * @param {number} staminaStat — player stamina stat (0–10); higher = more recovery
 * @returns {number} new stamina
 */
export function recoverBetweenPoints(current, staminaStat = 5) {
  const bonus = (staminaStat - 5) * 1; // ±5 extra recovery at extremes
  return Math.min(MAX_STAMINA, current + BETWEEN_POINT_RECOVERY + bonus);
}

/**
 * Apply between-game recovery (service break / sides change).
 *
 * @param {number} current
 * @returns {number} new stamina (soft cap at 85)
 */
export function recoverBetweenGames(current) {
  return Math.min(85, current + BETWEEN_GAME_RECOVERY);
}

/**
 * Apply idle recovery for a player who didn't move zones this exchange.
 *
 * @param {number} current
 * @returns {number} new stamina
 */
export function recoverIdle(current) {
  return Math.min(MAX_STAMINA, current + IDLE_RECOVERY_PER_EXCHANGE);
}

// ─── Effect Modifiers ─────────────────────────────────────────────────────────

/**
 * Returns accuracy penalty from low stamina (for use in shots.js calculations).
 * Returns a value in [0, 0.30] — 0 when fresh, higher when exhausted.
 *
 * @param {number} stamina
 * @returns {number}
 */
export function staminaAccuracyPenalty(stamina) {
  if (stamina >= 50) return 0;
  if (stamina >= 30) return (50 - stamina) * 0.002;
  if (stamina >= 15) return 0.04 + (30 - stamina) * 0.005;
  return 0.115 + (15 - stamina) * 0.007;
}

/**
 * Returns whether smash is blocked due to exhaustion.
 *
 * @param {number} stamina
 * @returns {boolean}
 */
export function isSmashBlocked(stamina) {
  return stamina < 15;
}

/**
 * Returns a descriptive tier for UI coloring.
 * @param {number} stamina
 * @returns {'full'|'good'|'low'|'critical'}
 */
export function staminaTier(stamina) {
  if (stamina >= 70) return 'full';
  if (stamina >= 40) return 'good';
  if (stamina >= 20) return 'low';
  return 'critical';
}
