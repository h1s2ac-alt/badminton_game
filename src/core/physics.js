import { SHOT_TYPES, COURT } from '../utils/constants.js';
import { clamp, lerp } from '../utils/math.js';

/**
 * Aerodynamic progress calculation accounting for feather cone air resistance.
 * Real shuttlecocks experience massive quadratic drag: they travel fast initially
 * and then decelerate steeply, plunging downward at the end of their flight.
 */
function aerodynamicProgress(t, dragK) {
  if (dragK <= 0.05) return t;
  // Closed-form solution for drag deceleration: s(t) = (1 - e^(-k*t)) / (1 - e^(-k))
  return (1 - Math.exp(-dragK * t)) / (1 - Math.exp(-dragK));
}

export class Trajectory {
  constructor(shotType, startPos, targetPos, power = 1.0, quality = 'GOOD') {
    this.shotType = shotType;
    this.start = { ...startPos };
    this.target = { ...targetPos, y: targetPos.y || 0 };
    this.targetPos = this.target;
    this.power = clamp(power, 0.4, 1.3);

    // Compute parameters based on shot type
    const config = this._getShotConfig(shotType, power);
    this.duration = config.duration;
    this.apexHeight = config.apexHeight;
    this.dragK = config.dragK || 1.6;
    this.hangFactor = config.hangFactor || 1.0;

    // Enforce net clearance for shots crossing the net (Z=0)
    const crossesNet = Math.sign(this.start.z) !== Math.sign(this.target.z) && Math.abs(this.target.z - this.start.z) > 0.1;
    const isServe = (shotType === SHOT_TYPES.SERVE || shotType === SHOT_TYPES.SERVE_SHORT || shotType === SHOT_TYPES.SERVE_HIGH);
    const shouldClear = isServe || (quality === 'PERFECT') || (quality === 'GOOD' && shotType !== SHOT_TYPES.NET);

    if (crossesNet && shouldClear) {
      // Find approximate time when shuttlecock crosses the net at Z=0
      const totalZDist = Math.abs(this.target.z - this.start.z);
      const startToNetZ = Math.abs(this.start.z);
      const targetSNet = startToNetZ / totalZDist;
      
      // Invert drag function to estimate tNet: s(tNet) = targetSNet
      let tNet = targetSNet;
      if (this.dragK > 0.05) {
        // e^(-k*t) = 1 - s * (1 - e^-k) -> t = -ln(...) / k
        const arg = Math.max(0.01, 1 - targetSNet * (1 - Math.exp(-this.dragK)));
        tNet = clamp(-Math.log(arg) / this.dragK, 0.1, 0.9);
      }

      // Check height at net: short serves skim tape cleanly by 3-5cm; high serves/clears soar above
      let minNetClearance = COURT.NET_HEIGHT + 0.08;
      if (shotType === SHOT_TYPES.SERVE_SHORT) {
        minNetClearance = COURT.NET_HEIGHT + 0.03; // Skims tape cleanly by 3cm
      } else if (shotType === SHOT_TYPES.SERVE_HIGH || shotType === SHOT_TYPES.CLEAR) {
        minNetClearance = 3.6;
      } else if (shotType === SHOT_TYPES.SMASH) {
        minNetClearance = COURT.NET_HEIGHT + 0.05;
      }

      let attempts = 0;
      while (this.getPositionAt(tNet).y < minNetClearance && attempts < 25) {
        this.apexHeight += 0.15;
        attempts++;
      }
    }

    this.elapsed = 0;
    this.completed = false;
    this.current = { ...this.start };
  }

  _getShotConfig(shotType, power) {
    const dist = Math.hypot(
      this.target.x - this.start.x,
      this.target.z - this.start.z
    );

    switch (shotType) {
      case SHOT_TYPES.SMASH:
        return {
          duration: Math.max(0.75, 1.05 - power * 0.2), // Piercing downward smash
          apexHeight: Math.max(this.start.y + 0.15, 2.6),
          dragK: 1.4, // Fast initial blast
          hangFactor: 1.25,
        };

      case SHOT_TYPES.CLEAR:
        return {
          duration: Math.max(1.85, 2.4 - power * 0.35), // Lofty deep clear
          apexHeight: Math.max(4.8, 3.8 + dist * 0.26),
          dragK: 2.1, // Steep horizontal stall and parachute drop at baseline
          hangFactor: 0.85,
        };

      case SHOT_TYPES.DROP:
        return {
          duration: 1.65, // Gentle net-skimming touch
          apexHeight: Math.max(this.start.y + 0.45, 2.3),
          dragK: 2.4, // Rapid speed loss, falling steeply past net
          hangFactor: 1.0,
        };

      case SHOT_TYPES.DRIVE:
        return {
          duration: Math.max(0.95, 1.3 - power * 0.22), // Flat, fast horizontal slash
          apexHeight: Math.max(this.start.y + 0.18, 2.2),
          dragK: 1.3,
          hangFactor: 1.0,
        };

      case SHOT_TYPES.NET:
        return {
          duration: 1.1, // Soft tumble over tape
          apexHeight: Math.max(this.start.y + 0.1, (COURT.NET_HEIGHT + 0.2) * power),
          dragK: 2.2,
          hangFactor: 1.0,
        };

      case SHOT_TYPES.SERVE_SHORT:
        return {
          duration: 1.35, // Authentic short backhand flick skimming the tape into front court
          apexHeight: COURT.NET_HEIGHT + 0.04,
          dragK: 1.8,
          hangFactor: 1.0,
        };

      case SHOT_TYPES.SERVE_HIGH:
        return {
          duration: 2.15, // Authentic underhand high clear serve deep to baseline
          apexHeight: 4.6,
          dragK: 2.2,
          hangFactor: 0.85,
        };

      case SHOT_TYPES.SERVE:
      default:
        return {
          duration: 1.55,
          apexHeight: COURT.NET_HEIGHT + 0.35,
          dragK: 1.9,
          hangFactor: 0.95,
        };
    }
  }

  update(dt) {
    if (this.completed) return this.target;

    this.elapsed += dt;
    let t = this.elapsed / this.duration;

    if (t >= 1.0) {
      t = 1.0;
      this.completed = true;
    }

    this.current = this.getPositionAt(t);
    return this.current;
  }

  // Gets position at time fraction t (0 to 1)
  getPositionAt(t) {
    const clampedT = clamp(t, 0, 1);
    
    // 1. Horizontal Aerodynamic Progress
    const s = aerodynamicProgress(clampedT, this.dragK);
    const x = lerp(this.start.x, this.target.x, s);
    const z = lerp(this.start.z, this.target.z, s);

    // 2. Vertical Flight Path with steep descending drop
    const baseLinearY = lerp(this.start.y, this.target.y, s);

    let y;
    if (this.shotType === SHOT_TYPES.SMASH) {
      // Direct, steep downward vector towards floor
      const smashDip = Math.pow(clampedT, 1.15);
      const linearY = lerp(this.start.y, this.target.y, smashDip);
      // Net boost only if apex was raised to clear the net tape
      const netBoost = Math.max(0, this.apexHeight - Math.max(this.start.y, this.target.y)) * Math.sin(Math.PI * clampedT);
      y = Math.max(0, linearY + netBoost);
    } else {
      // Characteristic badminton high arc with late vertical dive
      // Parabolic arc adjusted for drag deceleration
      const arcFactor = Math.sin(Math.PI * Math.pow(clampedT, this.hangFactor));
      const peakLift = Math.max(0.1, this.apexHeight - Math.max(this.start.y, this.target.y));
      const arcY = peakLift * arcFactor;
      y = Math.max(0, baseLinearY + arcY);
    }

    return { x, y, z };
  }

  /**
   * Calculates the optimal contact time fraction t [0..1] when the shuttlecock
   * arrives at the player's hitting plane (distance to racket sweet spot is minimal),
   * NOT when it hits the ground.
   */
  getOptimalHitTime(characterRole, characterPos) {
    if (!characterPos) return 0.75;
    
    // For player (facing +Z toward net): contact is slightly in front of torso (zOffset ~ +0.35m)
    // For opponent (facing -Z toward net): contact is slightly in front of torso (zOffset ~ -0.35m)
    const targetZ = characterRole === 'player' 
      ? characterPos.z + 0.35
      : characterPos.z - 0.35;

    const totalZDist = this.target.z - this.start.z;
    if (Math.abs(totalZDist) < 0.1) return 0.75;

    // Fractional Z distance to contact plane
    const sTarget = clamp((targetZ - this.start.z) / totalZDist, 0.2, 0.95);

    // Solve for t where s(t) = sTarget
    if (this.dragK > 0.05) {
      const arg = Math.max(0.01, 1 - sTarget * (1 - Math.exp(-this.dragK)));
      return clamp(-Math.log(arg) / this.dragK, 0.25, 0.95);
    }
    return sTarget;
  }
}
