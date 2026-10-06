import { COURT } from '../utils/constants.js';

export class CourtRenderer {
  constructor(renderer) {
    this.r = renderer;
    this._cachedW = 0;
    this._cachedH = 0;
    this._crowdHeads = [];
    this._rng = this._makeRng(42);
  }

  _makeRng(seed) {
    let s = seed;
    return () => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  _rebuildCache(w, h) {
    if (this._cachedW === w && this._cachedH === h) return;
    this._cachedW = w;
    this._cachedH = h;
    this._rng = this._makeRng(42);
    this._buildCrowdData();
  }

  _buildCrowdData() {
    const rng = this._rng;
    this._crowdHeads = [];
    const rows = [
      { yOffset: 0,   density: 24, baseSize: 5 },
      { yOffset: -8,  density: 20, baseSize: 6.5 },
      { yOffset: -16, density: 16, baseSize: 8 },
    ];
    rows.forEach(row => {
      const count = Math.floor(this._cachedW / row.density);
      for (let i = 0; i < count; i++) {
        this._crowdHeads.push({
          xFrac: i / count + rng() * (1 / count),
          yRel: row.yOffset + (rng() - 0.5) * 4,
          size: row.baseSize + (rng() - 0.5) * 2,
          shade: 0.55 + rng() * 0.3,
        });
      }
    });
  }

  render() {
    const ctx = this.r.ctx;
    const w = this.r.width;
    const h = this.r.height;
    const horizon = this.r.horizonY;

    this._rebuildCache(w, h);

    const vpX = w / 2;

    // ── 1. Back Wall (brown/tan indoor gym wall) ──────────────────────────
    const backWallGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    backWallGrad.addColorStop(0,   '#8B7355'); // warm brown top
    backWallGrad.addColorStop(0.4, '#A08868');
    backWallGrad.addColorStop(0.8, '#9A8060');
    backWallGrad.addColorStop(1,   '#887050');
    ctx.fillStyle = backWallGrad;
    ctx.fillRect(0, 0, w, horizon);

    // Horizontal wall panel lines (wood paneling effect)
    ctx.strokeStyle = 'rgba(60,40,20,0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const ly = horizon * (i / 6);
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(w, ly);
      ctx.stroke();
    }

    // ── 2. Side Walls (brown perspective walls converging to back) ────────
    // Left wall
    const leftWallGrad = ctx.createLinearGradient(0, 0, w * 0.2, 0);
    leftWallGrad.addColorStop(0, '#6B5540');
    leftWallGrad.addColorStop(1, '#8B7355');
    ctx.fillStyle = leftWallGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, h);
    ctx.lineTo(w * 0.08, h);
    ctx.lineTo(vpX * 0.35, horizon);
    ctx.lineTo(vpX * 0.35, 0);
    ctx.closePath();
    ctx.fill();

    // Right wall
    const rightWallGrad = ctx.createLinearGradient(w, 0, w * 0.8, 0);
    rightWallGrad.addColorStop(0, '#6B5540');
    rightWallGrad.addColorStop(1, '#8B7355');
    ctx.fillStyle = rightWallGrad;
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(w * 0.92, h);
    ctx.lineTo(w - vpX * 0.35, horizon);
    ctx.lineTo(w - vpX * 0.35, 0);
    ctx.closePath();
    ctx.fill();

    // Wall-floor edge (dark line)
    ctx.strokeStyle = 'rgba(40,25,10,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(vpX * 0.35, horizon);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w - vpX * 0.35, horizon);
    ctx.stroke();

    // ── 3. Far crowd silhouettes (simple) ─────────────────────────────────
    this._crowdHeads.forEach(head => {
      const x = head.xFrac * w;
      const y = horizon + head.yRel;
      const v = Math.round(head.shade * 55 + 40);
      ctx.fillStyle = `rgb(${v - 10},${v - 5},${v})`;
      ctx.beginPath();
      ctx.arc(x, y, head.size * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - head.size * 0.4, y + head.size * 0.55, head.size * 0.8, head.size * 0.9);
    });

    // ── 4. Court Floor (Bright Cyan Blue) ─────────────────────────────────
    const hw = COURT.WIDTH / 2;
    const hl = COURT.HALF_LENGTH;

    // Full floor area first (slightly darker blue surround)
    const floorGrad = ctx.createLinearGradient(0, horizon, 0, h);
    floorGrad.addColorStop(0, '#1E88C8');
    floorGrad.addColorStop(0.3, '#2196D6');
    floorGrad.addColorStop(1, '#1A78B8');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, w, h - horizon);

    // Court surface (brighter cyan)
    const pFL = this.r.project(-hw, 0, hl);
    const pFR = this.r.project( hw, 0, hl);
    const pNR = this.r.project( hw, 0, -hl);
    const pNL = this.r.project(-hw, 0, -hl);

    const courtGrad = ctx.createLinearGradient(0, pNL.y, 0, pFL.y);
    courtGrad.addColorStop(0,   '#30B0E8');
    courtGrad.addColorStop(0.4, '#40C0F0');
    courtGrad.addColorStop(0.7, '#38B8EC');
    courtGrad.addColorStop(1,   '#28A0D8');
    ctx.fillStyle = courtGrad;
    ctx.beginPath();
    ctx.moveTo(pFL.x, pFL.y);
    ctx.lineTo(pFR.x, pFR.y);
    ctx.lineTo(pNR.x, pNR.y);
    ctx.lineTo(pNL.x, pNL.y);
    ctx.closePath();
    ctx.fill();

    // Light reflection on court surface
    const netBase = this.r.project(0, 0, 0);
    const sheen = ctx.createRadialGradient(
      netBase.x, (pFL.y + pNL.y) * 0.5, 0,
      netBase.x, (pFL.y + pNL.y) * 0.5, Math.abs(pFL.x - pFR.x) * 0.6
    );
    sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    sheen.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.moveTo(pFL.x, pFL.y);
    ctx.lineTo(pFR.x, pFR.y);
    ctx.lineTo(pNR.x, pNR.y);
    ctx.lineTo(pNL.x, pNL.y);
    ctx.closePath();
    ctx.fill();

    // ── 5. White Court Lines ──────────────────────────────────────────────
    const drawLine3D = (x1, z1, x2, z2, width = 3, alpha = 0.95) => {
      const p1 = this.r.project(x1, 0, z1);
      const p2 = this.r.project(x2, 0, z2);
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    };

    // Outer boundary (thick)
    drawLine3D(-hw, -hl,  hw, -hl, 4);
    drawLine3D(-hw,  hl,  hw,  hl, 4);
    drawLine3D(-hw, -hl, -hw,  hl, 4);
    drawLine3D( hw, -hl,  hw,  hl, 4);

    // Service lines
    drawLine3D(-hw,  COURT.SHORT_SERVICE_DIST, hw,  COURT.SHORT_SERVICE_DIST, 3);
    drawLine3D(-hw, -COURT.SHORT_SERVICE_DIST, hw, -COURT.SHORT_SERVICE_DIST, 3);

    // Center lines
    drawLine3D(0,  COURT.SHORT_SERVICE_DIST, 0,  hl, 3);
    drawLine3D(0, -COURT.SHORT_SERVICE_DIST, 0, -hl, 3);

    // Center net line (subtle)
    drawLine3D(-hw, 0, hw, 0, 2, 0.3);

    // ── 6. Net & Poles ─────────────────────────────────────────────────────
    const netH = COURT.NET_HEIGHT;
    const netBottomH = netH - 0.76;
    const netHCenter = netH - 0.031;
    const netBottomHCenter = netBottomH - 0.031;

    const pPoleLB = this.r.project(-hw, 0, 0);
    const pPoleRB = this.r.project( hw, 0, 0);
    const pNetLB  = this.r.project(-hw, netBottomH, 0);
    const pNetLT  = this.r.project(-hw, netH, 0);
    const pNetRB  = this.r.project( hw, netBottomH, 0);
    const pNetRT  = this.r.project( hw, netH, 0);
    const pNetCT  = this.r.project(0, netHCenter, 0);
    const pNetCB  = this.r.project(0, netBottomHCenter, 0);

    // Net mesh fill (white/light gray semi-transparent)
    ctx.fillStyle = 'rgba(220, 230, 240, 0.55)';
    ctx.beginPath();
    ctx.moveTo(pNetLT.x, pNetLT.y);
    ctx.quadraticCurveTo(pNetCT.x, pNetCT.y, pNetRT.x, pNetRT.y);
    ctx.lineTo(pNetRB.x, pNetRB.y);
    ctx.quadraticCurveTo(pNetCB.x, pNetCB.y, pNetLB.x, pNetLB.y);
    ctx.closePath();
    ctx.fill();

    // Horizontal strands (top one is white tape, rest light gray)
    const numHStrands = 8;
    for (let i = 0; i <= numHStrands; i++) {
      const t = i / numHStrands;
      const curH = netH - t * 0.76;
      const curHCenter = netHCenter - t * 0.76;
      const ly = this.r.project(-hw, curH, 0);
      const ry = this.r.project( hw, curH, 0);
      const cy = this.r.project(0, curHCenter, 0);

      ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(180,195,210,0.45)';
      ctx.lineWidth = i === 0 ? 4 : 1;
      ctx.beginPath();
      ctx.moveTo(ly.x, ly.y);
      ctx.quadraticCurveTo(cy.x, cy.y, ry.x, ry.y);
      ctx.stroke();
    }

    // Vertical strands
    const numVStrands = 14;
    for (let i = 1; i < numVStrands; i++) {
      const t = i / numVStrands;
      const wx = -hw + t * COURT.WIDTH;
      const droopFactor = 1 - Math.pow(Math.abs(t - 0.5) * 2, 2);
      const curTopH = netH - droopFactor * 0.031;
      const curBotH = curTopH - 0.76;
      const botPt = this.r.project(wx, curBotH, 0);
      const topPt = this.r.project(wx, curTopH, 0);
      ctx.strokeStyle = 'rgba(180,195,210,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(botPt.x, botPt.y);
      ctx.lineTo(topPt.x, topPt.y);
      ctx.stroke();
    }

    // ── Poles (silver/gray cylindrical) ───────────────────────────────────
    const poleW = 6;
    [{ base: pPoleLB, top: pNetLT }, { base: pPoleRB, top: pNetRT }].forEach(pole => {
      const grad = ctx.createLinearGradient(pole.base.x - poleW, 0, pole.base.x + poleW, 0);
      grad.addColorStop(0,   '#888888');
      grad.addColorStop(0.3, '#C0C0C0');
      grad.addColorStop(0.6, '#AAAAAA');
      grad.addColorStop(1,   '#777777');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(pole.base.x - poleW / 2, pole.top.y - 4, poleW, pole.base.y - pole.top.y + 6, [3]);
      ctx.fill();

      // Pole cap
      ctx.fillStyle = '#999';
      ctx.beginPath();
      ctx.arc(pole.base.x, pole.top.y - 3, poleW * 0.65, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
