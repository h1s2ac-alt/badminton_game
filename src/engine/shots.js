/**
 * shots.js — Shot definitions and outcome math
 *
 * Pure logic — no DOM or Canvas references.
 * All probabilities are in range [0, 1].
 */

// ─── Shot Type Enum ───────────────────────────────────────────────────────────

export const SHOT_TYPES = {
  CLEAR:       'CLEAR',
  DROP:        'DROP',
  SMASH:       'SMASH',
  NET_SHOT:    'NET_SHOT',
  DRIVE:       'DRIVE',
  LOB:         'LOB',
  CROSS_COURT: 'CROSS_COURT',
  SLICE:       'SLICE',
};

// ─── Shot Definitions ─────────────────────────────────────────────────────────

/**
 * Base stats for each shot type.
 *
 * baseAccuracy   — probability of clearing the net + landing in (before modifiers)
 * staminaCost    — stamina drained per use (0–30)
 * reachDifficulty — how hard it is for the opponent to reach (higher = harder to get)
 *                   This is the base before modifiers from position/speed.
 * requiresHighShuttle — shot is only available when shuttle is HIGH on player side
 * requiresNetPosition — shot requires player to be in net zone (PNx)
 * label          — display name
 * description    — tooltip text
 */
export const SHOT_DEFS = {
  [SHOT_TYPES.CLEAR]: {
    label: 'Clear',
    description: 'High deep shot to the back — safe reset, gives opponent time.',
    baseAccuracy: 0.92,
    staminaCost: 8,
    reachDifficulty: 0.30,
    requiresHighShuttle: false,
    requiresNetPosition: false,
  },
  [SHOT_TYPES.DROP]: {
    label: 'Drop',
    description: 'Soft angled shot to the net — deceptive, but risky if telegraphed.',
    baseAccuracy: 0.80,
    staminaCost: 10,
    reachDifficulty: 0.55,
    requiresHighShuttle: false,
    requiresNetPosition: false,
  },
  [SHOT_TYPES.SMASH]: {
    label: 'Smash',
    description: 'Powerful downward strike — high reward, high stamina cost.',
    baseAccuracy: 0.75,
    staminaCost: 22,
    reachDifficulty: 0.72,
    requiresHighShuttle: true,
    requiresNetPosition: false,
  },
  [SHOT_TYPES.NET_SHOT]: {
    label: 'Net Shot',
    description: 'Tight tumbling shot at the net — forces opponent to lift.',
    baseAccuracy: 0.78,
    staminaCost: 6,
    reachDifficulty: 0.60,
    requiresHighShuttle: false,
    requiresNetPosition: true,
  },
  [SHOT_TYPES.DRIVE]: {
    label: 'Drive',
    description: 'Flat fast shot — pressures opponent but is returnable.',
    baseAccuracy: 0.85,
    staminaCost: 12,
    reachDifficulty: 0.45,
    requiresHighShuttle: false,
    requiresNetPosition: false,
  },
  [SHOT_TYPES.LOB]: {
    label: 'Lob',
    description: 'Defensive high lift — buys recovery time.',
    baseAccuracy: 0.94,
    staminaCost: 7,
    reachDifficulty: 0.25,
    requiresHighShuttle: false,
    requiresNetPosition: false,
  },
  [SHOT_TYPES.CROSS_COURT]: {
    label: 'Cross-Court',
    description: 'Wide angle to the opposite side — deceptive but riskier.',
    baseAccuracy: 0.74,
    staminaCost: 14,
    reachDifficulty: 0.58,
    requiresHighShuttle: false,
    requiresNetPosition: false,
  },
  [SHOT_TYPES.SLICE]: {
    label: 'Slice',
    description: 'Deceptive cut shot — adds disguise, adds error chance.',
    baseAccuracy: 0.72,
    staminaCost: 11,
    reachDifficulty: 0.62,
    requiresHighShuttle: false,
    requiresNetPosition: false,
  },
};

// ─── Shot Availability ────────────────────────────────────────────────────────

/**
 * Returns which shot types are available given current game state.
 *
 * @param {object} params
 * @param {string} params.playerZone       — current player zone ID
 * @param {boolean} params.shuttleIsHigh   — is the incoming shuttle at a high position?
 * @param {number} params.stamina          — current stamina (0–100)
 * @returns {string[]} array of available SHOT_TYPES keys
 */
export function availableShots({ playerZone, shuttleIsHigh, stamina }) {
  return Object.entries(SHOT_DEFS)
    .filter(([type, def]) => {
      if (def.requiresHighShuttle && !shuttleIsHigh) return false;
      if (def.requiresNetPosition && !playerZone.includes('N')) return false;
      if (type === SHOT_TYPES.SMASH && stamina < 15) return false; // too exhausted to smash
      return true;
    })
    .map(([type]) => type);
}

// ─── Outcome Math ─────────────────────────────────────────────────────────────

/**
 * Calculate the probability that the player's shot lands in / clears net (success).
 *
 * @param {object} p
 * @param {string}  p.shotType
 * @param {number}  p.stamina         — current stamina (0–100)
 * @param {number}  p.controlStat     — player control stat (0–10)
 * @param {number}  p.distanceTraveled— zones player moved to reach shuttle (0–4)
 * @param {number}  p.deceptionStat   — player deception stat (0–10), for slice bonus
 * @param {number}  p.anticipationPenalty — AI saw this coming (0–0.2)
 * @returns {number} probability in [0, 1]
 */
export function shotSuccessChance({
  shotType,
  stamina,
  controlStat,
  distanceTraveled,
  deceptionStat = 5,
  anticipationPenalty = 0,
}) {
  const def = SHOT_DEFS[shotType];
  if (!def) throw new Error(`Unknown shot type: ${shotType}`);

  let chance = def.baseAccuracy;

  // Control stat bonus/penalty (centered at stat=5)
  chance += (controlStat - 5) * 0.015;

  // Stamina penalty
  if (stamina < 50) chance -= (50 - stamina) * 0.002;   // up to -0.10
  if (stamina < 30) chance -= (30 - stamina) * 0.004;   // extra -0.12 below 30
  if (stamina < 15) chance -= 0.10;                      // exhaustion penalty

  // Distance penalty — lunging far reduces accuracy
  chance -= distanceTraveled * 0.04;

  // Deception bonus for slice
  if (shotType === SHOT_TYPES.SLICE) {
    chance += (deceptionStat - 5) * 0.01;
  }

  // AI anticipation reduces effective success (opponent in better position)
  chance -= anticipationPenalty;

  return Math.max(0.05, Math.min(0.99, chance));
}

/**
 * Calculate the probability that the opponent CANNOT reach the shot (i.e., it's a winner).
 *
 * @param {object} p
 * @param {string}  p.shotType
 * @param {string}  p.targetZone       — opponent zone that was targeted
 * @param {string}  p.opponentZone     — opponent's current zone
 * @param {number}  p.opponentSpeed    — opponent speed stat (0–10)
 * @param {number}  p.opponentStamina  — opponent stamina (0–100)
 * @param {number}  p.playerDeception  — player deception stat (0–10)
 * @param {number}  p.patternBonus     — opponent pattern prediction bonus (0–0.15)
 * @returns {number} probability of winner in [0, 1]
 */
export function winnerChance({
  shotType,
  targetZone,
  opponentZone,
  opponentSpeed,
  opponentStamina,
  playerDeception = 5,
  patternBonus = 0,
}) {
  const def = SHOT_DEFS[shotType];
  if (!def) throw new Error(`Unknown shot type: ${shotType}`);

  // Import distance calculation inline to keep this file self-contained
  // (court.js exports zoneDistance — caller passes distance in)
  // We use reachDifficulty as a base
  let chance = def.reachDifficulty;

  // Speed stat reduces chance of winner (faster opponent = harder to beat)
  chance -= (opponentSpeed - 5) * 0.025;

  // Opponent stamina — exhausted opponents are slower
  if (opponentStamina < 40) chance += (40 - opponentStamina) * 0.003;

  // Player deception — better deception, opponent reads less well
  chance += (playerDeception - 5) * 0.015;

  // Pattern bonus — opponent predicted this, they're already moving there
  chance -= patternBonus;

  return Math.max(0.01, Math.min(0.95, chance));
}

/**
 * Calculate distance traveled by a player to reach the shuttle.
 * Assumes the shuttle is landing in a player-side zone.
 *
 * @param {string} fromZone  — player's current zone (e.g. 'PMC')
 * @param {string} toZone    — zone where shuttle is landing (e.g. 'PBL')
 * @returns {number} taxicab distance 0–4
 */
export function movementDistance(fromZone, toZone) {
  const rows = { B: 0, M: 1, N: 2 };
  const cols = { L: 0, C: 1, R: 2 };

  const fromRow = rows[fromZone[1]];
  const fromCol = cols[fromZone[2]];
  const toRow   = rows[toZone[1]];
  const toCol   = cols[toZone[2]];

  if (fromRow === undefined || toRow === undefined) return 0;
  return Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol);
}
