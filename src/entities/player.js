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
    this.animTimer = 0.58; 
    this.swingDuration = 0.58;
  }

  triggerWhiff() {
    this.animState = 'WHIFF';
    this.animTimer = 0.5;
  }

  triggerStumble() {
    this.animState = 'STUMBLE';
    this.animTimer = 1.0; // 1-second recovery penalty
    this.stumbleTimer = 1.0;
  }

  triggerCelebrate() {
    this.animState = 'CELEBRATE';
    this.animTimer = 1.6;
  }

  triggerDisappointed() {
    this.animState = 'DISAPPOINTED';
    this.animTimer = 1.6;
  }

  update(dt, shuttlecock, isRallyActive) {
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

    if (!isRallyActive || !shuttlecock || !shuttlecock.inFlight) return;

    // If shuttlecock is flying toward player side (z < 0)
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
