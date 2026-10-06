import { COURT } from '../utils/constants.js';

export class Court {
  static HALF_WIDTH = COURT.WIDTH / 2; // 2.59m
  static BASELINE_PLAYER = -COURT.HALF_LENGTH; // -6.7m
  static BASELINE_OPPONENT = COURT.HALF_LENGTH; // +6.7m

  /**
   * Checks if a 3D point (x, z) is inside court boundaries.
   * @param {number} x - X coordinate (-2.59 to +2.59)
   * @param {number} z - Z coordinate (-6.7 to +6.7)
   * @param {string} side - 'player' (Z < 0) or 'opponent' (Z > 0)
   */
  static isInBounds(x, z, side = null) {
    const validX = Math.abs(x) <= Court.HALF_WIDTH;
    const validZ = Math.abs(z) <= COURT.HALF_LENGTH;

    if (!validX || !validZ) return false;

    if (side === 'player') {
      return z <= 0 && z >= Court.BASELINE_PLAYER;
    }
    if (side === 'opponent') {
      return z >= 0 && z <= Court.BASELINE_OPPONENT;
    }

    return true;
  }

  /**
   * Get default home position for player or opponent
   */
  static getHomePosition(role) {
    if (role === 'player') {
      return { x: 0, y: 0, z: -4.5 };
    } else {
      return { x: 0, y: 0, z: 4.5 };
    }
  }

  /**
   * Get serve position based on court side ('right' or 'left')
   */
  static getServePosition(role, courtSide) {
    const x = courtSide === 'right' ? 1.2 : -1.2;
    if (role === 'player') {
      return { x, y: 0, z: -3.5 };
    } else {
      return { x: -x, y: 0, z: 3.5 }; // Opposite side across net
    }
  }
}
