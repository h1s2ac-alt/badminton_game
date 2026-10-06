const TAU = Math.PI * 2;

export class EffectsRenderer {
  constructor(renderer) {
    this.r = renderer;
    this.effects   = []; // Floating text effects (W — used sparingly)
    this.particles = []; // Impact particle bursts (V)
    this.screenShakeIntensity = 0; // (X)
    this.screenShakeTimer     = 0;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** (V) Trigger an impact particle burst at a 3D world position */
  addImpact(worldPos, color = '#FACC15', intensity = 1.0) {
    const count = Math.round(8 + intensity * 6); // 8–14 particles
    for (let i = 0; i < count; i++) {
      const angle  = Math.random() * TAU;
      const speed  = (60 + Math.random() * 120) * intensity;
      this.particles.push({
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
        // Screen-space velocity (will be set on first render)
        vsx: Math.cos(angle) * speed,
        vsy: Math.sin(angle) * speed * 0.7,
        elapsed:  0,
        duration: 0.35 + Math.random() * 0.25,
        size:     3 + Math.random() * 5,
        color,
        fade: true,
      });
    }
  }

  /** (W) Only show text for exceptional hits (smashes etc.) */
  addHitText(worldPos, text, color = '#FACC15') {
    this.effects.push({
      x: worldPos.x,
      y: worldPos.y,
      z: worldPos.z,
      text,
      color,
      elapsed:  0,
      duration: 0.75,
      size:     20,
    });
  }

  /** (X) Camera shake on heavy hit */
  triggerShake(intensity = 1.0) {
    this.screenShakeIntensity = Math.min(8, intensity * 8);
    this.screenShakeTimer     = 0.12; // 120ms duration
  }

  /** Returns current frame's screen shake offset */
  getShakeOffset() {
    if (this.screenShakeTimer <= 0) return { dx: 0, dy: 0 };
    const t = this.screenShakeTimer;
    const amp = this.screenShakeIntensity * (t / 0.12);
    return {
      dx: (Math.random() - 0.5) * amp * 2,
      dy: (Math.random() - 0.5) * amp,
    };
  }

  update(dt) {
    // Text effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].elapsed += dt;
      if (this.effects[i].elapsed >= this.effects[i].duration) {
        this.effects.splice(i, 1);
      }
    }

    // Particle effects
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.elapsed += dt;

      // Apply screen-space gravity
      p.vsy += 180 * dt;

      if (p.elapsed >= p.duration) {
        this.particles.splice(i, 1);
      }
    }

    // Screen shake countdown
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer = Math.max(0, this.screenShakeTimer - dt);
    }
  }

  render() {
    const ctx = this.r.ctx;

    // ── (V) Particles ──────────────────────────────────────────────────────
    this.particles.forEach(p => {
      // Project the origin point (stays fixed for a burst)
      const proj = this.r.project(p.x, p.y, p.z);
      if (!proj.visible) return;

      const age = p.elapsed / p.duration;
      const alpha = Math.max(0, 1 - age * age);

      // Particle moves in screen-space from its projected origin
      const px = proj.x + p.vsx * p.elapsed;
      const py = proj.y + p.vsy * p.elapsed;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 4;
      ctx.beginPath();
      ctx.arc(px, py, p.size * (1 - age * 0.5), 0, TAU);
      ctx.fill();
      ctx.restore();
    });

    // ── (W) Floating hit text (exceptional shots only) ─────────────────────
    this.effects.forEach(ef => {
      const p = this.r.project(ef.x, ef.y + ef.elapsed * 0.9, ef.z);
      if (!p.visible) return;

      const alpha = Math.max(0, 1 - (ef.elapsed / ef.duration) * 1.5);
      const S     = p.scale / 40;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font        = `800 ${Math.max(12, ef.size * S)}px sans-serif`;
      ctx.fillStyle   = ef.color;
      ctx.textAlign   = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur  = 5;
      ctx.fillText(ef.text, p.x, p.y);
      ctx.restore();
    });
  }
}
