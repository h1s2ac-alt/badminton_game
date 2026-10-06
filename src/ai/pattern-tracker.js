/**
 * pattern-tracker.js — Tracks player shot tendencies and generates AI bonuses
 *
 * Maintains a rolling window of the player's recent shots and target zones,
 * then produces:
 *   - anticipationPenalty: how much the AI penalizes player accuracy (AI is ready)
 *   - patternBonus: how much harder it is for the player to win the point (AI positioned)
 *
 * Pure logic — no DOM or Canvas references.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** How many recent shots to remember */
const WINDOW_SIZE = 8;

/** Threshold: if any single shot type makes up this fraction of recent shots, it's "predictable" */
const PREDICTABLE_THRESHOLD = 0.5;

/** Maximum bonuses/penalties the pattern tracker can generate */
const MAX_ANTICIPATION_PENALTY = 0.18;
const MAX_PATTERN_BONUS        = 0.14;

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a fresh pattern tracker.
 * @returns {PatternTracker}
 */
export function createPatternTracker() {
  return {
    shotHistory:   [],  // array of SHOT_TYPES keys (most recent last)
    zoneHistory:   [],  // array of target zone IDs (most recent last)
    // Cached analysis (updated after each shot)
    dominantShot:  null,
    dominantZone:  null,
    predictability: 0,  // 0 = unpredictable, 1 = fully predictable
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Record a player shot and return an updated tracker.
 *
 * @param {PatternTracker} tracker
 * @param {string} shotType   — SHOT_TYPES key
 * @param {string} targetZone — opponent zone ID
 * @returns {PatternTracker}
 */
export function recordShot(tracker, shotType, targetZone) {
  const shotHistory = [...tracker.shotHistory, shotType].slice(-WINDOW_SIZE);
  const zoneHistory = [...tracker.zoneHistory, targetZone].slice(-WINDOW_SIZE);

  // Analyze
  const shotFreq  = _frequency(shotHistory);
  const zoneFreq  = _frequency(zoneHistory);
  const dominantShot = _dominant(shotFreq);
  const dominantZone = _dominant(zoneFreq);
  const predictability = dominantShot ? shotFreq[dominantShot] : 0;

  return { shotHistory, zoneHistory, dominantShot, dominantZone, predictability };
}

// ─── Bonus / Penalty Calculation ──────────────────────────────────────────────

/**
 * Calculate the anticipation penalty for the player's current shot,
 * based on how predictable their pattern is and the AI's reaction speed.
 *
 * @param {PatternTracker} tracker
 * @param {string} shotType     — the shot the player just selected
 * @param {string} targetZone   — the zone they're targeting
 * @param {number} reactionSpeed — AI profile reaction speed (0–1)
 * @returns {number} anticipationPenalty in [0, MAX_ANTICIPATION_PENALTY]
 */
export function getAnticipationPenalty(tracker, shotType, targetZone, reactionSpeed) {
  if (tracker.shotHistory.length < 3) return 0; // not enough data yet

  const shotMatch  = shotType   === tracker.dominantShot ? 1 : 0;
  const zoneMatch  = targetZone === tracker.dominantZone ? 1 : 0;

  // Penalty is higher if both shot AND zone match the dominant pattern
  const rawPenalty = tracker.predictability * (shotMatch * 0.6 + zoneMatch * 0.4) * reactionSpeed;

  return Math.min(MAX_ANTICIPATION_PENALTY, rawPenalty);
}

/**
 * Calculate the pattern bonus — reduces the opponent's reachDifficulty
 * (they're pre-positioned toward the likely target).
 *
 * @param {PatternTracker} tracker
 * @param {string} targetZone
 * @param {number} reactionSpeed
 * @returns {number} patternBonus in [0, MAX_PATTERN_BONUS]
 */
export function getPatternBonus(tracker, targetZone, reactionSpeed) {
  if (tracker.shotHistory.length < 3) return 0;

  const zoneMatch = targetZone === tracker.dominantZone ? 1 : 0;
  const rawBonus  = tracker.predictability * zoneMatch * reactionSpeed;

  return Math.min(MAX_PATTERN_BONUS, rawBonus);
}

/**
 * Returns a descriptive hint for the rally log when the AI is reading the player.
 * Returns null if not enough pattern to remark on.
 *
 * @param {PatternTracker} tracker
 * @param {number} reactionSpeed
 * @returns {string|null}
 */
export function getPatternWarning(tracker, reactionSpeed) {
  if (tracker.predictability < PREDICTABLE_THRESHOLD || reactionSpeed < 0.6) return null;
  if (tracker.shotHistory.length < 4) return null;

  return `Opponent is reading your pattern — you keep playing ${_shotLabel(tracker.dominantShot)} to the ${tracker.dominantZone}.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _frequency(arr) {
  const freq = {};
  for (const item of arr) {
    freq[item] = (freq[item] || 0) + 1 / arr.length;
  }
  return freq;
}

function _dominant(freqMap) {
  let best = null;
  let bestVal = 0;
  for (const [key, val] of Object.entries(freqMap)) {
    if (val > bestVal) { bestVal = val; best = key; }
  }
  return bestVal >= PREDICTABLE_THRESHOLD ? best : null;
}

function _shotLabel(shotType) {
  const labels = {
    CLEAR: 'clears', DROP: 'drops', SMASH: 'smashes', NET_SHOT: 'net shots',
    DRIVE: 'drives', LOB: 'lobs', CROSS_COURT: 'cross-courts', SLICE: 'slices',
  };
  return labels[shotType] || shotType;
}
