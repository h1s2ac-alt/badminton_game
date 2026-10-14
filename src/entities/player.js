import { Court } from './court.js';
import { clamp, lerp } from '../utils/math.js';

export class Player {
  constructor() {
    const home = Court.getHomePosition('player');
    this.x = home.x;
    this.y = home.y;
    this.z = home.z;
    this.vx = 0;
    this.vz = 0;
    this.baseSpeed = 5.5; // m/s
    this.speed = 5.5;
    this.role = 'player';
    this.animState = 'IDLE'; // 'IDLE', 'RUNNING', 'SWINGING', 'WHIFF'
    this.animTimer = 0;
    this.swingDuration = 0.52;
    this.runAnimTime = 0;
    this.shirtColor = '#3B82F6'; // Blue Mii
    this.skinColor = '#FDE047';

    this.stamina = 1.0;
    this.stumbleTimer = 0;
    this.hasConnected = false;
  }

  reset() {
    const home = Court.getHomePosition('player');
    this.x = home.x;
    this.y = home.y;
    this.z = home.z;
    this.vx = 0;
    this.vz = 0;
    this.animState = 'IDLE';
    this.animTimer = 0;
    this.runAnimTime = 0;
    this.stamina = 1.0;
    this.stumbleTimer = 0;
    this.hasConnected = false;
  }

  consumeStamina(amount) {
    this.stamina = Math.max(0.05, this.stamina - amount);
  }

  moveTo(targetX, targetZ, dt) {
    const dx = targetX - this.x;
    const dz = targetZ - this.z;
    const dist = Math.hypot(dx, dz);

    // Speed reduced if exhausted or stumbling
    let speedMult = this.stamina < 0.3 ? 0.75 : 1.0;
    if (this.stumbleTimer > 0) speedMult *= 0.3; // Stumble severely limits movement
    this.speed = this.baseSpeed * speedMult;

    if (dist > 0.08) {
      // Smooth continuous velocity damping
      const targetVx = (dx / dist) * this.speed;
      const targetVz = (dz / dist) * this.speed;
      const blend = Math.min(1, dt * 14);
      this.vx = lerp(this.vx || 0, targetVx, blend);
      this.vz = lerp(this.vz || 0, targetVz, blend);

      this.x += this.vx * dt;
      this.z += this.vz * dt;

      // Constrain player to their side of court
      this.x = clamp(this.x, -Court.HALF_WIDTH, Court.HALF_WIDTH);
      this.z = clamp(this.z, Court.BASELINE_PLAYER, -0.2);

      if (this.animState !== 'SWINGING') {
        this.animState = 'RUNNING';
        this.runAnimTime += dt;
      }
    } else {
      // Smooth deceleration to stop
      const blend = Math.min(1, dt * 16);
      this.vx = lerp(this.vx || 0, 0, blend);
      this.vz = lerp(this.vz || 0, 0, blend);
      this.x += (this.vx || 0) * dt;
      this.z += (this.vz || 0) * dt;

      if (this.animState === 'RUNNING' && Math.hypot(this.vx || 0, this.vz || 0) < 0.08) {
        this.animState = 'IDLE';
      }
    }
  }

  triggerSwing(shotType = 'CLEAR') {
    this.animState = 'SWINGING';
    this.currentShotType = shotType;
    this.animTimer = 0.52; 
    this.swingDuration = 0.52;
    this.hasConnected = false;
  }

  triggerWhiff() {
    // Air swing: character visibly swings through the air immediately!
    this.triggerSwing('CLEAR');
  }

  triggerStumble() {
    // When hitting off-balance, still swing through the hit, but incur movement slowdown
    this.triggerSwing('CLEAR');
    this.stumbleTimer = 0.8;
  }

  triggerCelebrate() {
    this.animState = 'CELEBRATE';
    this.animTimer = 1.6;
  }

  triggerDisappointed() {
    this.animState = 'DISAPPOINTED';
    this.animTimer = 1.6;
  }

  moveManual(dx, dz, dt) {
    let speedMult = this.stamina < 0.3 ? 0.75 : 1.0;
    if (this.stumbleTimer > 0) speedMult *= 0.3;
    this.speed = this.baseSpeed * speedMult;

    const targetVx = dx * this.speed;
    const targetVz = dz * this.speed;
    const blend = Math.min(1, dt * 16);
    this.vx = lerp(this.vx || 0, targetVx, blend);
    this.vz = lerp(this.vz || 0, targetVz, blend);

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Constrain player to their side of court
    this.x = clamp(this.x, -Court.HALF_WIDTH, Court.HALF_WIDTH);
    this.z = clamp(this.z, Court.BASELINE_PLAYER, -0.2);

    if (this.animState !== 'SWINGING') {
      this.animState = 'RUNNING';
      this.runAnimTime += dt;
    }
  }

  update(dt, shuttlecock, isRallyActive, moveInput = null) {
    // Regenerate stamina slowly over time
    if (this.stamina < 1.0) {
      this.stamina = Math.min(1.0, this.stamina + dt * 0.08);
    }

    if (this.stumbleTimer > 0) {
      this.stumbleTimer -= dt;
    }

    if (this.animTimer > 0) {
      this.animTimer -= dt;
      if (this.animTimer <= 0) {
        this.animState = 'IDLE';
      }
    }

    // 1. Manual Hybrid Footwork: WASD / Arrow keys override auto-run
    if (moveInput && moveInput.active) {
      this.moveManual(moveInput.dx, moveInput.dz, dt);
      return;
    }

    if (!isRallyActive || !shuttlecock || !shuttlecock.inFlight) {
      if (this.animState === 'RUNNING') {
        this.animState = 'IDLE';
      }
      return;
    }

    // 2. Auto-run assistance when not manually moving
    if (shuttlecock.lastHitter === 'opponent' && shuttlecock.trajectory) {
      const traj = shuttlecock.trajectory;
      const target = traj.target || traj.targetPos;
      // Fixed, stable target intercept position (player stands comfortably on the left/racket-prep side)
      const idealX = target.x - 0.25;
      const idealZ = target.z - 0.35;

      const desX = clamp(idealX, -Court.HALF_WIDTH + 0.35, Court.HALF_WIDTH - 0.35);
      const desZ = clamp(idealZ, Court.BASELINE_PLAYER + 0.35, -0.6);

      this.moveTo(desX, desZ, dt);
    } else if (shuttlecock.lastHitter === 'player' && isRallyActive) {
      // Smoothly drift back towards home base position after hitting
      const home = Court.getHomePosition('player');
      this.moveTo(home.x, home.z, dt * 0.7);
    }
  }
}
