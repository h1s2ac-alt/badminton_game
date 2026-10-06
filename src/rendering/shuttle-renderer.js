import { SHOT_TYPES } from '../utils/constants.js';

const TRAIL_COLORS = {
  [SHOT_TYPES.SMASH]: [255, 60, 40],
  [SHOT_TYPES.CLEAR]: [180, 220, 255],
  [SHOT_TYPES.DROP]:  [100, 220, 120],
  [SHOT_TYPES.DRIVE]: [255, 200, 80],
  [SHOT_TYPES.NET]:   [180, 255, 200],
  [SHOT_TYPES.SERVE]: [200, 200, 255],
};
const DEFAULT_TRAIL = [255, 255, 255];

export class ShuttleRenderer {
  constructor(renderer) {
    this.r = renderer;
    this._prevScreenX = null;
    this._prevScreenY = null;
  }

  render(shuttlecock) {
    const ctx = this.r.ctx;

    const pAir    = this.r.project(shuttlecock.x, shuttlecock.y, shuttlecock.z);
    const pGround = this.r.project(shuttlecock.x, 0, shuttlecock.z);

    if (!pAir.visible) return;

    const scale = pAir.scale;
    const shuttleRadius = Math.max(1.5, 4.2 * (scale / 40)); // Reduced size for realism

    let shuttleAngle = -Math.PI / 2;
    const speed = Math.hypot(shuttlecock.vx, shuttlecock.vy, shuttlecock.vz);
    if (speed > 0.5 && shuttlecock.inFlight) {
      const aheadPos = {
        x: shuttlecock.x + shuttlecock.vx * 0.05,
        y: shuttlecock.y + shuttlecock.vy * 0.05,
        z: shuttlecock.z + shuttlecock.vz * 0.05,
      };
      const pAhead = this.r.project(aheadPos.x, aheadPos.y, aheadPos.z);
      if (pAhead.visible) {
        shuttleAngle = Math.atan2(pAir.y - pAhead.y, pAir.x - pAhead.x) + Math.PI / 2;
      }
    }
    this._prevScreenX = pAir.x;
    this._prevScreenY = pAir.y;

    if (shuttlecock.inFlight && shuttlecock.trailHistory && shuttlecock.trailHistory.length > 1) {
      const tc = TRAIL_COLORS[shuttlecock.shotType] || DEFAULT_TRAIL;
      const len = shuttlecock.trailHistory.length;

      for (let idx = 0; idx < len - 1; idx++) {
        const pos     = shuttlecock.trailHistory[idx];
        const pGhost  = this.r.project(pos.x, pos.y, pos.z);
        if (!pGhost.visible) continue;

        let alpha = (idx / len) * 0.40;
        let gRadius = Math.max(1.0, shuttleRadius * (0.3 + 0.7 * (idx / len)));

        if (shuttlecock.hitQuality === 'PERFECT') {
          alpha *= 1.5;
          gRadius *= 1.3;
        }

        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(pGhost.x, pGhost.y, gRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (pGround.visible) {
      const shadowAlpha = Math.max(0.05, 0.45 - shuttlecock.y * 0.08);
      const shadowW = Math.max(2, shuttleRadius * Math.max(0.5, 1.2 - shuttlecock.y * 0.12));
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(pGround.x, pGround.y, shadowW * 1.8, shadowW * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      if (shuttlecock.y > 2.0) {
        ctx.strokeStyle = 'rgba(180,180,180,0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(pGround.x, pGround.y);
        ctx.lineTo(pAir.x, pAir.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (shuttlecock.inFlight && shuttlecock.lastHitter === 'opponent' && shuttlecock.trajectory) {
      const t = shuttlecock.trajectory.elapsed / shuttlecock.trajectory.duration;
      const ringRadius = Math.max(15, 60 * (1 - t * 0.87));
      const isHot = t > 0.65;
      ctx.save();
      ctx.strokeStyle = isHot ? '#4ADE80' : '#FACC15';
      ctx.lineWidth = Math.max(1.5, 2.5 * (scale / 40));
      ctx.beginPath();
      ctx.arc(pAir.x, pAir.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = isHot ? 'rgba(74,222,128,0.12)' : 'rgba(250,204,21,0.10)';
      ctx.fill();
      ctx.restore();
    }

    let wobbleX = 0;
    let wobbleY = 0;
    if (shuttlecock.inFlight && shuttlecock.hitQuality === 'POOR' && shuttlecock.trajectory) {
      const elapsed = shuttlecock.trajectory.elapsed;
      // High frequency wobble
      wobbleX = Math.sin(elapsed * 45) * 6 * (scale / 40);
      wobbleY = Math.cos(elapsed * 45) * 6 * (scale / 40);
    }

    ctx.save();
    ctx.translate(pAir.x + wobbleX, pAir.y + wobbleY);
    ctx.rotate(shuttleAngle);

    const R = shuttleRadius;
    const skirtTopY = -R * 2.8;
    const skirtWidth = R * 2.2;

    // Draw solid Nylon skirt back (inside view)
    ctx.fillStyle = 'rgba(210, 240, 20, 0.95)'; // Bright Neon Yellow
    ctx.beginPath();
    ctx.moveTo(-R * 0.7, -R * 0.4);
    ctx.lineTo(-skirtWidth * 0.9, skirtTopY);
    ctx.lineTo(skirtWidth * 0.9, skirtTopY);
    ctx.lineTo(R * 0.7, -R * 0.4);
    ctx.fill();

    // Nylon structural ribs
    ctx.strokeStyle = 'rgba(160, 180, 10, 0.5)';
    ctx.lineWidth = Math.max(0.5, R * 0.1);
    for (let i = 0; i <= 8; i++) {
        const t = (i / 8) - 0.5;
        ctx.beginPath();
        ctx.moveTo(t * R * 1.2, -R * 0.4);
        ctx.lineTo(t * skirtWidth * 1.8, skirtTopY);
        ctx.stroke();
    }
    
    // Skirt front (adds depth)
    ctx.fillStyle = 'rgba(230, 255, 40, 0.98)';
    ctx.beginPath();
    ctx.moveTo(-R * 0.8, -R * 0.4);
    ctx.quadraticCurveTo(-skirtWidth * 0.6, skirtTopY * 0.5, -skirtWidth, skirtTopY);
    ctx.quadraticCurveTo(0, skirtTopY + R * 0.6, skirtWidth, skirtTopY);
    ctx.quadraticCurveTo(skirtWidth * 0.6, skirtTopY * 0.5, R * 0.8, -R * 0.4);
    ctx.fill();

    // Molded cross-bindings (Nylon pattern)
    ctx.strokeStyle = 'rgba(200, 230, 20, 0.8)';
    ctx.lineWidth = Math.max(0.5, R * 0.15);
    for(let j = 1; j <= 3; j++) {
       ctx.beginPath();
       ctx.ellipse(0, -R * (0.8 + j * 0.5), skirtWidth * (0.4 + j * 0.15), R * 0.15, 0, 0, Math.PI * 2);
       ctx.stroke();
    }

    // Synthetic Cork Base (White/Cream realistic base)
    const corkGrad = ctx.createRadialGradient(-R * 0.3, -R * 0.2, 0, 0, 0, R);
    corkGrad.addColorStop(0, '#FFFFFF');
    corkGrad.addColorStop(0.6, '#F8FAFC');
    corkGrad.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = corkGrad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();

    // Tape (Classic Blue band for Nylon)
    ctx.fillStyle = '#2563EB'; // Royal Blue tape
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.4, R * 0.96, R * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight on cork
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-R * 0.3, -R * 0.3, R * 0.3, R * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
