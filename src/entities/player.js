import { Court } from './court.js';
import { clamp, lerp } from '../utils/math.js';

export class Player {
  constructor() {
    const home = Court.getHomePosition('player');
    this.x = home.x;
    this.y = home.y;
    this.z = home.z;
    this.baseSpeed = 5.5; // m/s
    this.speed = 5.5;
    this.role = 'player';
    this.animState = 'IDLE'; // 'IDLE', 'RUNNING', 'SWINGING', 'WHIFF'
    this.animTimer = 0;
    this.runAnimTime = 0;
    this.shirtColor = '#3B82F6'; // Blue Mii
    this.skinColor = '#FDE047';

    // Stamina system (0.0 to 1.0)
    this.stamina = 1.0;
  }

  reset() {
    const home = Court.getHomePosition('player');
    this.x = home.x;
    this.y = home.y;
    this.z = home.z;
    this.animState = 'IDLE';
    this.animTimer = 0;
    this.runAnimTime = 0;
    this.stamina = 1.0;
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

    if (dist > 0.05) {
      const step = Math.min(dist, this.speed * dt);
      this.x += (dx / dist) * step;
      this.z += (dz / dist) * step;

      // Constrain player to their side of court
      this.x = clamp(this.x, -Court.HALF_WIDTH, Court.HALF_WIDTH);
      this.z = clamp(this.z, Court.BASELINE_PLAYER, -0.2);

      if (this.animState !== 'SWINGING') {
        this.animState = 'RUNNING';
        this.runAnimTime += dt;
      }
    } else if (this.animState === 'RUNNING') {
      this.animState = 'IDLE';
    }
  }

  triggerSwing(shotType = 'CLEAR') {
    this.animState = 'SWINGING';
    this.currentShotType = shotType;
    this.animTimer = 0.32; 
    this.swingDuration = 0.32;
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

    const step = this.speed * dt;
    this.x += dx * step;
    this.z += dz * step;

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
      const landingX = clamp(shuttlecock.trajectory.target.x, -Court.HALF_WIDTH + 0.35, Court.HALF_WIDTH - 0.35);
      const landingZ = clamp(shuttlecock.trajectory.target.z, Court.BASELINE_PLAYER + 0.4, -0.6);

      let desX = landingX;
      let desZ = landingZ;
      if (shuttlecock.z < -0.8) {
        desX = lerp(landingX, shuttlecock.x, 0.35);
        desZ = lerp(landingZ, shuttlecock.z, 0.25);
      }

      this.moveTo(desX, desZ, dt);
    } else if (shuttlecock.lastHitter === 'player' && isRallyActive) {
      // Smoothly drift back towards home base position after hitting
      const home = Court.getHomePosition('player');
      this.moveTo(home.x * 0.25 + this.x * 0.75, home.z * 0.25 + this.z * 0.75, dt * 0.7);
    }
  }
}
