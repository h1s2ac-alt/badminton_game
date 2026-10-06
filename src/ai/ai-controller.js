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

    // Move opponent toward target intercept spot
    if (shuttlecock.trajectory) {
      const targetX = shuttlecock.trajectory.target.x;
      const targetZ = clamp(shuttlecock.trajectory.target.z, 0.5, Court.BASELINE_OPPONENT - 0.2);

      const t = shuttlecock.trajectory.elapsed / shuttlecock.trajectory.duration;
      const desX = lerp(shuttlecock.x, targetX, t * 0.8);
      const desZ = lerp(shuttlecock.z, targetZ, t * 0.8);

      this.opponent.moveTo(desX, desZ, dt);
    }

    // Check if shuttlecock is in hittable window for AI
    if (shuttlecock.isHittableBy('opponent', this.opponent)) {
      // Execute shot!
      const shot = this.plannedShot || this._planShot(shuttlecock, player);
      this.opponent.triggerSwing();
      onAISwing(shot);
      this.reset();
    }
  }

  _planShot(shuttlecock, player) {
    const cfg = this.opponent.config;

    // Determine shot type
    let shotType = SHOT_TYPES.CLEAR;
    const isHigh = shuttlecock.y > 2.5;

    if (isHigh && Math.random() < cfg.smashChance) {
      shotType = SHOT_TYPES.SMASH;
    } else {
      const rand = Math.random();
      if (rand < 0.4) shotType = SHOT_TYPES.CLEAR;
      else if (rand < 0.7) shotType = SHOT_TYPES.DROP;
      else shotType = SHOT_TYPES.DRIVE;
    }

    // Target selection: aim away from player position to test player reach
    let targetX = -player.x * 0.8; // cross-court
    if (Math.abs(targetX) < 1.0) {
      targetX = Math.random() < 0.5 ? -1.8 : 1.8;
    }

    // Add difficulty-based inaccuracy
    const err = (Math.random() - 0.5) * 2.0 * cfg.accuracyErr * Court.HALF_WIDTH;
    targetX = clamp(targetX + err, -Court.HALF_WIDTH + 0.3, Court.HALF_WIDTH - 0.3);

    let targetZ = -4.5;
    if (shotType === SHOT_TYPES.DROP || shotType === SHOT_TYPES.NET) {
      targetZ = -COURT.SHORT_SERVICE_DIST - 0.5;
    } else if (shotType === SHOT_TYPES.SMASH) {
      targetZ = -3.5;
    } else {
      targetZ = Court.BASELINE_PLAYER + 0.5;
    }

    return {
      shotType,
      targetPos: { x: targetX, y: 0, z: targetZ },
      power: 1.0,
    };
  }
}
