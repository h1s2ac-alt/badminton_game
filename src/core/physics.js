import { SHOT_TYPES, COURT } from '../utils/constants.js';
import { clamp, lerp } from '../utils/math.js';

export class Trajectory {
  constructor(shotType, startPos, targetPos, power = 1.0, quality = 'GOOD') {
    this.shotType = shotType;
    this.start = { ...startPos };
    this.target = { ...targetPos, y: targetPos.y || 0 };
    this.power = clamp(power, 0.4, 1.3);

    // Compute parameters based on shot type
    const config = this._getShotConfig(shotType, power);
    this.duration = config.duration;
    this.apexHeight = config.apexHeight;
    this.curvePower = config.curvePower || 1.0;

    // Enforce net clearance for PERFECT hits
    if (quality === 'PERFECT') {
      const zDistTotal = Math.abs(this.target.z - this.start.z);
      if (zDistTotal > 0.1 && Math.sign(this.start.z) !== Math.sign(this.target.z)) {
        const tNet = Math.abs(this.start.z) / zDistTotal;
        let attempts = 0;
        while (this.getPositionAt(tNet).y < COURT.NET_HEIGHT + 0.15 && attempts < 10) {
          this.apexHeight += 0.2;
          attempts++;
        }
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
          duration: Math.max(0.70, 0.95 - power * 0.15), // Relaxed from 0.35s to ~0.8s
          apexHeight: Math.max(this.start.y + 0.1, 2.5),
          curvePower: 1.15,
        };
      case SHOT_TYPES.CLEAR:
        return {
          duration: Math.max(1.7, 2.3 - power * 0.3), // Relaxed from 1.1s to ~2.0s
          apexHeight: Math.max(4.6, 3.6 + dist * 0.25),
          curvePower: 0.65, // Exaggerated float hang time
        };
      case SHOT_TYPES.DROP:
        return {
          duration: 1.6, // Relaxed from 1.1s to 1.6s
          apexHeight: Math.max(this.start.y + 0.5, 2.4),
          curvePower: 1.0,
        };
      case SHOT_TYPES.DRIVE:
        return {
          duration: Math.max(0.9, 1.25 - power * 0.2), // Relaxed from 0.5s to ~1.05s
          apexHeight: Math.max(this.start.y + 0.2, 2.2),
          curvePower: 0.9,
        };
      case SHOT_TYPES.NET:
        return {
          duration: 1.0, // Clean floating net shot crossing net safely within 1.0s
          apexHeight: COURT.NET_HEIGHT + 0.2,
          curvePower: 1.0,
        };
      case SHOT_TYPES.SERVE:
      default:
        return {
          duration: 1.75, // Relaxed serve floating from 1.2s to 1.75s
          apexHeight: 3.8,
          curvePower: 0.7,
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
    const x = lerp(this.start.x, this.target.x, clampedT);
    const z = lerp(this.start.z, this.target.z, clampedT);
    const baseLinearY = lerp(this.start.y, this.target.y, clampedT);
    
    // Parabolic arc for height with curvePower for hang-time effects
    const parabola = 4 * clampedT * (1 - clampedT);
    const floatParabola = Math.pow(parabola, this.curvePower);
    const arcY = this.apexHeight * floatParabola;
    
    const y = Math.max(0, baseLinearY + arcY * (1 - (this.start.y / (this.apexHeight + 0.1))));
    return { x, y, z };
  }
}
