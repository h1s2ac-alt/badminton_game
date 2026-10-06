/**
 * court.js — Court zone model and spatial utilities
 *
 * The court is modeled as two 3×3 grids (one per side).
 * Zone IDs use a prefix (P = player side, O = opponent side)
 * plus a row (B=back, M=mid, N=net) and column (L=left, C=center, R=right).
 *
 * Pure logic — no DOM or Canvas references.
 */

// ─── Zone Definitions ────────────────────────────────────────────────────────

export const SIDES = { PLAYER: 'P', OPPONENT: 'O' };
export const ROWS  = { BACK: 'B', MID: 'M', NET: 'N' };
export const COLS  = { LEFT: 'L', CENTER: 'C', RIGHT: 'R' };

/** All valid zone IDs */
export const PLAYER_ZONES   = ['PBL','PBC','PBR','PML','PMC','PMR','PNL','PNC','PNR'];
export const OPPONENT_ZONES = ['OBL','OBC','OBR','OML','OMC','OMR','ONL','ONC','ONR'];
export const ALL_ZONES      = [...PLAYER_ZONES, ...OPPONENT_ZONES];

/**
 * Zone metadata — row, col, side, and a [col, row] grid position (0-indexed).
 */
export const ZONE_META = {};
for (const side of ['P', 'O']) {
  for (const [ri, row] of ['B', 'M', 'N'].entries()) {
    for (const [ci, col] of ['L', 'C', 'R'].entries()) {
      const id = `${side}${row}${col}`;
      ZONE_META[id] = { side, row, col, gridRow: ri, gridCol: ci };
    }
  }
}

/**
 * Default / recovery position (center-mid of each side).
 */
export const DEFAULT_PLAYER_ZONE   = 'PMC';
export const DEFAULT_OPPONENT_ZONE = 'OMC';

// ─── Spatial Utilities ────────────────────────────────────────────────────────

/**
 * Taxicab (Manhattan) distance between two zones on the same side.
 * Zones on opposite sides cannot be directly compared this way.
 * Returns a number 0–4.
 */
export function zoneDistance(zoneA, zoneB) {
  const a = ZONE_META[zoneA];
  const b = ZONE_META[zoneB];
  if (!a || !b) throw new Error(`Invalid zone: ${zoneA} or ${zoneB}`);
  return Math.abs(a.gridRow - b.gridRow) + Math.abs(a.gridCol - b.gridCol);
}

/**
 * Whether a zone belongs to the player's side.
 */
export function isPlayerZone(zoneId) {
  return zoneId.startsWith('P');
}

/**
 * Whether a zone belongs to the opponent's side.
 */
export function isOpponentZone(zoneId) {
  return zoneId.startsWith('O');
}

/**
 * Given a player zone, return the mirror opponent zone (same row/col, opposite side).
 */
export function mirrorZone(zoneId) {
  const meta = ZONE_META[zoneId];
  if (!meta) throw new Error(`Invalid zone: ${zoneId}`);
  const newSide = meta.side === 'P' ? 'O' : 'P';
  return `${newSide}${meta.row}${meta.col}`;
}

/**
 * Given a player zone, return valid opponent-side target zones for a given shot type.
 * Some shots have restricted valid targets (e.g., net shots must target the net row).
 * Returns array of opponent zone IDs.
 */
export function validTargetZones(playerZone, shotType) {
  const meta = ZONE_META[playerZone];
  if (!meta) return [];

  switch (shotType) {
    case 'NET_SHOT':
      // Net shots must be played from the net zone and target the opponent net zone
      if (meta.row !== 'N') return []; // can't play a net shot from non-net position
      return ['ONL', 'ONC', 'ONR'];

    case 'SMASH':
      // Smash targets mid and back — not net
      return ['OML', 'OMC', 'OMR', 'OBL', 'OBC', 'OBR'];

    case 'DROP':
      // Drop targets opponent net zone
      return ['ONL', 'ONC', 'ONR'];

    case 'CLEAR':
      // Clear targets deep — back zones
      return ['OBL', 'OBC', 'OBR'];

    case 'LOB':
      // Lob (defensive) targets opponent back
      return ['OBL', 'OBC', 'OBR'];

    case 'DRIVE':
      // Drive goes flat to mid zones
      return ['OML', 'OMC', 'OMR'];

    case 'CROSS_COURT':
      // Cross-court can target anything, but typically opposite side columns
      return OPPONENT_ZONES;

    case 'SLICE':
      // Slice is a modifier — can target net or mid
      return ['ONL', 'ONC', 'ONR', 'OML', 'OMC', 'OMR'];

    default:
      return OPPONENT_ZONES;
  }
}

/**
 * After playing a shot, where does the player ideally recover to?
 * Returns a player zone ID.
 */
export function recoveryZone(shotType, currentZone) {
  // Best practice: recover to center of court after most shots
  switch (shotType) {
    case 'NET_SHOT':
    case 'DROP':
      return 'PNC'; // stay forward after net attack
    case 'SMASH':
      return 'PMC'; // move to mid after smash
    case 'CLEAR':
    case 'LOB':
      return 'PBC'; // stay back if you just lifted
    default:
      return 'PMC'; // default: center mid
  }
}
