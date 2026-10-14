import { SHOT_TYPES, COURT } from '../utils/constants.js';
import { clamp, lerp } from '../utils/math.js';
import { Court } from '../entities/court.js';

export class AIController {
  constructor(opponent) {
    this.opponent = opponent;
    this.reactionTimer = 0;
    this.hasReacted = false;
    this.plannedShot = null;
  }

  reset() {
    this.reactionTimer = 0;
    this.hasReacted = false;
    this.plannedShot = null;
  }

  update(dt, shuttlecock, player, onAISwing) {
    if (!shuttlecock || !shuttlecock.inFlight) {
      this.reset();
      return;
    }

    // Only process if shuttlecock was hit by player and is coming toward opponent
    if (shuttlecock.lastHitter !== 'player') {
      this.reset();
      // Smoothly drift back towards home base position after hitting
      const home = Court.getHomePosition('opponent');
      this.opponent.moveTo(home.x, home.z, dt * 0.75);
      return;
    }

    const cfg = this.opponent.config;

    // Reaction time delay before AI starts moving/planning
    if (!this.hasReacted) {
      this.reactionTimer += dt;
      if (this.reactionTimer >= cfg.reactionTime) {
        this.hasReacted = true;
        this.plannedShot = this._planShot(shuttlecock, player);
      } else {
        return; // Haven't reacted yet
      }
    }

    // Move opponent smoothly toward target intercept spot on opponent court
    if (shuttlecock.trajectory) {
      const traj = shuttlecock.trajectory;
      const target = traj.target || traj.targetPos;
      // Fixed, stable target intercept position for opponent (stands behind contact point)
      const idealX = target.x + 0.25;
      const idealZ = target.z + 0.35;

      const desX = clamp(idealX, -Court.HALF_WIDTH - 0.3, Court.HALF_WIDTH + 0.3);
      const desZ = clamp(idealZ, 0.4, Court.BASELINE_OPPONENT + 0.3);

      this.opponent.moveTo(desX, desZ, dt);
    }

    // Check if shuttlecock is in hittable window for AI
    if (shuttlecock.isHittableBy('opponent', this.opponent)) {
      // Execute shot!
      const shot = this.plannedShot || this._planShot(shuttlecock, player);
      this.opponent.triggerSwing(shot.shotType);
      onAISwing(shot);
      this.reset();
    }
  }

  _planShot(shuttlecock, player) {
    const cfg = this.opponent.config;

    // Determine shot type
    let shotType = SHOT_TYPES.CLEAR;
    const isHigh = shuttlecock.y > 2.3;
    const isCloseToNet = (shuttlecock.z < 2.2 && shuttlecock.y < 1.6);

    if (isHigh && Math.random() < cfg.smashChance) {
      shotType = SHOT_TYPES.SMASH;
    } else if (isCloseToNet && Math.random() < 0.35) {
      shotType = SHOT_TYPES.NET;
    } else {
      const rand = Math.random();
      if (rand < 0.35) shotType = SHOT_TYPES.CLEAR;
      else if (rand < 0.65) shotType = SHOT_TYPES.DROP;
      else shotType = SHOT_TYPES.DRIVE;
    }

    // Target selection: aim away from player position to test player reach
    let targetX = -player.x * 0.8; // cross-court
    if (Math.abs(targetX) < 1.0) {
      targetX = Math.random() < 0.5 ? -1.8 : 1.8;
    }

    // Add difficulty-based inaccuracy: allows realistic unforced errors to land OUT!
    const errX = (Math.random() - 0.5) * 2.2 * cfg.accuracyErr * Court.HALF_WIDTH;
    targetX = clamp(targetX + errX, -Court.HALF_WIDTH - 0.5, Court.HALF_WIDTH + 0.5);

    let targetZ = -4.5;
    let power = 0.95;

    if (shotType === SHOT_TYPES.NET) {
      targetZ = -COURT.SHORT_SERVICE_DIST + 0.35;
      power = 0.52 + (Math.random() - 0.5) * 0.1;
    } else if (shotType === SHOT_TYPES.DROP) {
      targetZ = -COURT.SHORT_SERVICE_DIST - 0.45;
      power = 0.65 + (Math.random() - 0.5) * 0.1;
    } else if (shotType === SHOT_TYPES.SMASH) {
      targetZ = -3.2;
      power = 1.08 + (Math.random() - 0.5) * 0.1;
    } else if (shotType === SHOT_TYPES.DRIVE) {
      targetZ = -4.0;
      power = 0.88 + (Math.random() - 0.5) * 0.1;
    } else {
      // CLEAR
      targetZ = Court.BASELINE_PLAYER + 0.55;
      power = 0.98 + (Math.random() - 0.5) * 0.1;
    }

    // Apply Z depth error as well so overhits can go deep
    const errZ = (Math.random() - 0.5) * 2.0 * cfg.accuracyErr;
    targetZ = clamp(targetZ + errZ, Court.BASELINE_PLAYER - 0.8, -0.6);

    return {
      shotType,
      targetPos: { x: targetX, y: 0, z: targetZ },
      power,
    };
  }
}
