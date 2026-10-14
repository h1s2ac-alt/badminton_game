import { Court } from './court.js';
import { clamp, lerp } from '../utils/math.js';
import { DIFFICULTY_CONFIGS, DIFFICULTY } from '../utils/constants.js';

export class Opponent {
  constructor(difficultyKey = DIFFICULTY.MEDIUM) {
    this.role = 'opponent';
    this.setDifficulty(difficultyKey);

    const home = Court.getHomePosition('opponent');
    this.x = home.x;
    this.y = home.y;
    this.z = home.z;
    this.vx = 0;
    this.vz = 0;
    this.animState = 'IDLE';
    this.animTimer = 0;
    this.swingDuration = 0.52;
    this.runAnimTime = 0;

    // Stamina system (0.0 to 1.0)
    this.stamina = 1.0;
    this.stumbleTimer = 0;
  }

  setDifficulty(key) {
    this.difficultyKey = key;
    this.config = DIFFICULTY_CONFIGS[key] || DIFFICULTY_CONFIGS[DIFFICULTY.MEDIUM];
    this.baseSpeed = this.config.speed;
    this.speed = this.baseSpeed;
    this.shirtColor = this.config.color;
    this.name = this.config.name;
    this.skinColor = '#FDE047';
  }

  reset() {
    const home = Court.getHomePosition('opponent');
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
  }

  consumeStamina(amount) {
    this.stamina = Math.max(0.05, this.stamina - amount);
  }

  moveTo(targetX, targetZ, dt) {
    const dx = targetX - this.x;
    const dz = targetZ - this.z;
    const dist = Math.hypot(dx, dz);

    let speedMult = this.stamina < 0.3 ? 0.75 : 1.0;
    if (this.stumbleTimer > 0) speedMult *= 0.3;
    this.speed = this.baseSpeed * speedMult;

    if (dist > 0.08) {
      const targetVx = (dx / dist) * this.speed;
      const targetVz = (dz / dist) * this.speed;
      const blend = Math.min(1, dt * 14);
      this.vx = lerp(this.vx || 0, targetVx, blend);
      this.vz = lerp(this.vz || 0, targetVz, blend);

      this.x += this.vx * dt;
      this.z += this.vz * dt;

      this.x = clamp(this.x, -Court.HALF_WIDTH, Court.HALF_WIDTH);
      this.z = clamp(this.z, 0.2, Court.BASELINE_OPPONENT);

      if (this.animState !== 'SWINGING') {
        this.animState = 'RUNNING';
        this.runAnimTime += dt;
      }
    } else {
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
  }

  triggerWhiff() {
    this.triggerSwing('CLEAR');
  }

  triggerStumble() {
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

  update(dt) {
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
        this.y = 0;
      }
    }

    // Dynamic vertical elevation during jump smash
    if (this.animState === 'SWINGING' && this.currentShotType === 'SMASH') {
      const dur = this.swingDuration || 0.52;
      const elapsed = dur - (this.animTimer || 0);
      const t = dur > 0 ? (elapsed / dur) : 0;
      this.y = t < 0.75 ? Math.sin((t / 0.75) * Math.PI) * 0.85 : 0;
    } else {
      this.y = 0;
    }
  }
}

