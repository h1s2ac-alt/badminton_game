import { Court } from './court.js';
import { clamp } from '../utils/math.js';
import { DIFFICULTY_CONFIGS, DIFFICULTY } from '../utils/constants.js';

export class Opponent {
  constructor(difficultyKey = DIFFICULTY.MEDIUM) {
    this.role = 'opponent';
    this.setDifficulty(difficultyKey);

    const home = Court.getHomePosition('opponent');
    this.x = home.x;
    this.y = home.y;
    this.z = home.z;
    this.animState = 'IDLE';
    this.animTimer = 0;
    this.runAnimTime = 0;

    // Stamina system (0.0 to 1.0)
    this.stamina = 1.0;
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

    let speedMult = this.stamina < 0.3 ? 0.75 : 1.0;
    if (this.stumbleTimer > 0) speedMult *= 0.3;
    this.speed = this.baseSpeed * speedMult;

    if (dist > 0.05) {
      const step = Math.min(dist, this.speed * dt);
      this.x += (dx / dist) * step;
      this.z += (dz / dist) * step;

      this.x = clamp(this.x, -Court.HALF_WIDTH, Court.HALF_WIDTH);
      this.z = clamp(this.z, 0.2, Court.BASELINE_OPPONENT);

      if (this.animState !== 'SWINGING') {
        this.animState = 'RUNNING';
        this.runAnimTime += dt;
      }
    } else if (this.animState === 'RUNNING') {
      this.animState = 'IDLE';
    }
  }

  triggerSwing() {
    this.animState = 'SWINGING';
    this.animTimer = 0.55;
    this.swingDuration = 0.55;
  }

  triggerWhiff() {
    this.animState = 'WHIFF';
    this.animTimer = 0.5;
  }

  triggerStumble() {
    this.animState = 'STUMBLE';
    this.animTimer = 1.0; 
    this.stumbleTimer = 1.0;
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
      }
    }
  }
}
