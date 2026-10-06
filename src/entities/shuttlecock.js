import { Trajectory } from '../core/physics.js';
import { COURT } from '../utils/constants.js';

export class Shuttlecock {
  constructor() {
    this.x = 0;
    this.y = 1.0;
    this.z = 0;
    this.trajectory = null;
    this.lastHitter = null; // 'player' or 'opponent'
    this.inFlight = false;
    this.landed = false;
    this.hitNet = false;

    // Velocity tracking for shuttle rotation (R)
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this._prevX = 0;
    this._prevY = 0;
    this._prevZ = 0;

    // Trail history for motion trail (item #5)
    this.trailHistory = [];

    // Current shot type (for colored trail - T)
    this.shotType = null;
  }

  reset(pos = { x: 0, y: 1.2, z: 0 }) {
    this.x = pos.x;
    this.y = pos.y;
    this.z = pos.z;
    this.trajectory = null;
    this.lastHitter = null;
    this.inFlight = false;
    this.landed = false;
    this.hitNet = false;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this._prevX = pos.x;
    this._prevY = pos.y;
    this._prevZ = pos.z;
    this.trailHistory = [];
    this.shotType = null;
    this.hitQuality = 'GOOD';
  }

  launch(shotType, startPos, targetPos, power, hitter, quality = 'GOOD') {
    this.x = startPos.x;
    this.y = startPos.y;
    this.z = startPos.z;
    this._prevX = startPos.x;
    this._prevY = startPos.y;
    this._prevZ = startPos.z;
    this.trajectory = new Trajectory(shotType, startPos, targetPos, power, quality);
    this.lastHitter = hitter;
    this.inFlight = true;
    this.landed = false;
    this.hitNet = false;
    this.trailHistory = [];
    this.shotType = shotType;
    this.hitQuality = quality;
  }

  update(dt) {
    if (!this.inFlight || !this.trajectory) return;

    this._prevX = this.x;
    this._prevY = this.y;
    this._prevZ = this.z;

    const prevZ = this.z;
    const pos = this.trajectory.update(dt);
    this.x = pos.x;
    this.y = pos.y;
    this.z = pos.z;

    // Compute velocity for rotation (R)
    if (dt > 0) {
      this.vx = (this.x - this._prevX) / dt;
      this.vy = (this.y - this._prevY) / dt;
      this.vz = (this.z - this._prevZ) / dt;
    }

    // Save trail position history (last 6 positions)
    this.trailHistory.push({ x: this.x, y: this.y, z: this.z });
    if (this.trailHistory.length > 6) {
      this.trailHistory.shift();
    }

    // Net Fault Check (item #2)
    if ((prevZ < 0 && this.z >= 0) || (prevZ > 0 && this.z <= 0)) {
      if (this.y <= COURT.NET_HEIGHT) {
        this.hitNet = true;
        this.inFlight = false;
        this.landed = true;
        return;
      }
    }

    if (this.trajectory.completed || this.y <= 0) {
      this.y = 0;
      this.inFlight = false;
      this.landed = true;
    }
  }

  isHittableBy(role, characterPos) {
    if (!this.inFlight || this.lastHitter === role || this.hitNet) return false;

    const zDiff = Math.abs(this.z - characterPos.z);
    const xDiff = Math.abs(this.x - characterPos.x);
    const horizontalDist = Math.hypot(xDiff, zDiff);

    // Realistic racket reach:
    // Arm + racket length is ~1.1m. Allow up to 1.35m horizontal distance.
    // Also enforce forward/backward Z reach relative to character facing direction.
    // For player (facing +Z): shuttlecock must be between -0.45m behind and +0.80m in front.
    const zOffset = role === 'player' ? (this.z - characterPos.z) : (characterPos.z - this.z);
    const zInReach = zOffset >= -0.45 && zOffset <= 0.80;

    return horizontalDist < 1.35 && zInReach && this.y >= 0.2 && this.y <= 3.8;
  }

  getRemainingTime() {
    if (!this.trajectory) return 0;
    return Math.max(0, this.trajectory.duration - this.trajectory.elapsed);
  }
}
