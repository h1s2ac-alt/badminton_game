/**
 * court-renderer.js — Canvas 2D court rendering
 *
 * Draws:
 *   - Court surface, lines, net (geometric minimalist)
 *   - Zone highlights (hover, selected, valid targets)
 *   - Player marker (cyan glow circle)
 *   - Opponent marker (coral circle)
 *   - Shuttle arc animation (between zones)
 *   - Zone labels (optional debug)
 *
 * Presentation only — reads state, never mutates it.
 */

// ─── Zone Layout ──────────────────────────────────────────────────────────────
// Court is drawn top-to-bottom: opponent back → opponent net → net → player net → player back
// Each half is divided into 3 columns (L, C, R) and 3 rows (B, M, N)

const ZONE_ORDER = {
  // Row index 0 = top (opponent back), 5 = bottom (player back)
  OB: 0, OM: 1, ON: 2,
  PN: 3, PM: 4, PB: 5,
};
const COL_ORDER = { L: 0, C: 1, R: 2 };

// ─── Renderer Class ───────────────────────────────────────────────────────────

export class CourtRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hoveredZone = null;
    this.selectedZone = null;
    this.validTargetZones = [];
    this.playerZone = 'PMC';
    this.opponentZone = 'OMC';
    this.pendingAnimation = null;
    this._animFrame = null;

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    // Defer initial resize so the DOM has finished layout
    requestAnimationFrame(() => this._resize());
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Full re-render call — pass current UI state */
  render(state = {}) {
    const {
      playerZone      = 'PMC',
      opponentZone    = 'OMC',
      validTargets    = [],
      selectedZone    = null,
      hoveredZone     = null,
      shuttlePath     = null,  // { fromZone, toZone, progress 0–1 }
    } = state;

    this.playerZone      = playerZone;
    this.opponentZone    = opponentZone;
    this.validTargetZones = validTargets;
    this.selectedZone    = selectedZone;
    this.hoveredZone     = hoveredZone;

    this._draw(shuttlePath);
  }

  /** Animate shuttle flying from zone to zone. Returns a Promise. */
  animateShuttle(fromZone, toZone, durationMs = 600) {
    return new Promise(resolve => {
      const start = performance.now();
      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / durationMs);
        this._draw({ fromZone, toZone, progress });
        if (progress < 1) {
          this._animFrame = requestAnimationFrame(tick);
        } else {
          this._animFrame = null;
          resolve();
        }
      };
      if (this._animFrame) cancelAnimationFrame(this._animFrame);
      this._animFrame = requestAnimationFrame(tick);
    });
  }

  /** Handle mouse/touch move over canvas — returns hovered zone or null */
  getZoneAtPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (clientY - rect.top)  * (this.canvas.height / rect.height);
    return this._zoneAtPixel(x, y);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }

  // ── Layout Helpers ─────────────────────────────────────────────────────────

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const raw = Math.min(parent.clientWidth - 24, parent.clientHeight - 24, 520);
    const size = Math.max(raw, 120); // guard: never smaller than 120px
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = Math.round(size * dpr);
    this.canvas.height = Math.round(size * 1.5 * dpr);
    this.canvas.style.width  = `${size}px`;
    this.canvas.style.height = `${size * 1.5}px`;
    // Reset transform before scaling to avoid cumulative scale on repeated resizes
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this._logicalW = size;
    this._logicalH = size * 1.5;
    this._draw(null);
  }

  _zoneRect(zoneId) {
    const side = zoneId[0];         // P or O
    const row  = zoneId[1];         // B, M, N
    const col  = zoneId[2];         // L, C, R

    const W = this._logicalW;
    const H = this._logicalH;
    const PAD = 16;
    const NET_PAD = 6;

    const courtW = W - PAD * 2;
    const halfH  = (H - PAD * 2 - NET_PAD * 2) / 2;

    const colW = courtW / 3;
    const rowH = halfH / 3;

    const colIdx = COL_ORDER[col];
    const rowKey = side + row;      // e.g. 'PB', 'ON'
    const rowIdx = ZONE_ORDER[rowKey];

    const x = PAD + colIdx * colW;
    let y;

    if (rowIdx <= 2) {
      // Opponent side (rows 0,1,2) — top half
      y = PAD + rowIdx * rowH;
    } else {
      // Player side (rows 3,4,5) — bottom half
      y = PAD + NET_PAD * 2 + halfH + (rowIdx - 3) * rowH;
    }

    return { x, y, w: colW, h: rowH };
  }

  _zoneAtPixel(px, py) {
    for (const zoneId of [
      'OBL','OBC','OBR','OML','OMC','OMR','ONL','ONC','ONR',
      'PNL','PNC','PNR','PML','PMC','PMR','PBL','PBC','PBR',
    ]) {
      const r = this._zoneRect(zoneId);
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
        return zoneId;
      }
    }
    return null;
  }

  _zoneCenterPx(zoneId) {
    const r = this._zoneRect(zoneId);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  _draw(shuttlePath) {
    if (!this._logicalW) return;
    const ctx = this.ctx;
    const W = this._logicalW;
    const H = this._logicalH;

    ctx.clearRect(0, 0, W, H);
    this._drawCourt(ctx, W, H);
    this._drawZones(ctx);
    this._drawMarkers(ctx);
    if (shuttlePath) this._drawShuttle(ctx, shuttlePath);
  }

  _drawCourt(ctx, W, H) {
    // Background — hardcoded to avoid getComputedStyle timing issues
    ctx.fillStyle = '#1e3a1e';
    roundRect(ctx, 0, 0, W, H, 8);
    ctx.fill();

    const PAD = 16;
    const NET_Y = H / 2;
    const lineColor = 'rgba(255,255,255,0.55)';

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;

    // Outer boundary
    ctx.strokeRect(PAD, PAD, W - PAD * 2, H - PAD * 2);

    // Column lines
    const colW = (W - PAD * 2) / 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(PAD + i * colW, PAD);
      ctx.lineTo(PAD + i * colW, H - PAD);
      ctx.stroke();
    }

    // Half-court row lines (opponent side)
    const NET_PAD = 6;
    const halfH = (H - PAD * 2 - NET_PAD * 2) / 2;
    const rowH  = halfH / 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + i * rowH);
      ctx.lineTo(W - PAD, PAD + i * rowH);
      ctx.stroke();
    }
    // Player side row lines
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + NET_PAD * 2 + halfH + i * rowH);
      ctx.lineTo(W - PAD, PAD + NET_PAD * 2 + halfH + i * rowH);
      ctx.stroke();
    }

    // Net
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD, NET_Y);
    ctx.lineTo(W - PAD, NET_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Net label
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NET', W / 2, NET_Y - 4);

    // Side labels
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '8px -apple-system, sans-serif';
    ctx.fillText('OPPONENT', W / 2, PAD + 10);
    ctx.fillText('YOU', W / 2, H - PAD - 4);
  }

  _drawZones(ctx) {
    const allZones = [
      'OBL','OBC','OBR','OML','OMC','OMR','ONL','ONC','ONR',
      'PNL','PNC','PNR','PML','PMC','PMR','PBL','PBC','PBR',
    ];

    const ZONE_NAMES = {
      ONL:'Net-Left',  ONC:'Net-Centre',  ONR:'Net-Right',
      OML:'Mid-Left',  OMC:'Mid-Centre',  OMR:'Mid-Right',
      OBL:'Back-Left', OBC:'Back-Centre', OBR:'Back-Right',
    };

    // Draw fills first, then borders/labels on top
    for (const zoneId of allZones) {
      const r         = this._zoneRect(zoneId);
      const isValid   = this.validTargetZones.includes(zoneId);
      const isSelected = this.selectedZone === zoneId;
      const isHovered  = this.hoveredZone  === zoneId;

      if (isSelected) {
        // Solid cyan fill for selected zone
        ctx.fillStyle = 'rgba(6,182,212,0.32)';
        ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        ctx.strokeStyle = 'rgba(6,182,212,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      } else if (isHovered && isValid) {
        // Bright amber fill on hovered valid zone
        ctx.fillStyle = 'rgba(245,158,11,0.35)';
        ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        ctx.strokeStyle = 'rgba(245,158,11,0.85)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      } else if (isValid) {
        // Soft amber fill on valid zones
        ctx.fillStyle = 'rgba(245,158,11,0.12)';
        ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        // Dashed amber border
        ctx.strokeStyle = 'rgba(245,158,11,0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
        ctx.setLineDash([]);
      }
    }

    // Draw zone labels and dots on top of fills
    for (const zoneId of allZones) {
      const r         = this._zoneRect(zoneId);
      const isValid   = this.validTargetZones.includes(zoneId);
      const isSelected = this.selectedZone === zoneId;
      const isHovered  = this.hoveredZone  === zoneId;
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;

      if (isSelected && ZONE_NAMES[zoneId]) {
        // Selected zone: checkmark + label
        ctx.fillStyle = 'rgba(6,182,212,0.95)';
        ctx.font = `bold ${Math.max(8, r.w * 0.18)}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓ ' + ZONE_NAMES[zoneId], cx, cy);
      } else if (isHovered && isValid && ZONE_NAMES[zoneId]) {
        // Hovered zone: label text
        ctx.fillStyle = 'rgba(245,158,11,1)';
        ctx.font = `bold ${Math.max(7, r.w * 0.16)}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ZONE_NAMES[zoneId], cx, cy);
      } else if (isValid && !isSelected) {
        // Dot on valid zones
        ctx.fillStyle = 'rgba(245,158,11,0.7)';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw a dashed line from player zone to hovered valid zone
    const hov = this.hoveredZone;
    if (hov && this.validTargetZones.includes(hov) && this.playerZone) {
      const from = this._zoneCenterPx(this.playerZone);
      const to   = this._zoneCenterPx(hov);
      ctx.strokeStyle = 'rgba(245,158,11,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _drawMarkers(ctx) {
    // Player marker (cyan)
    const p = this._zoneCenterPx(this.playerZone);
    _drawGlowCircle(ctx, p.x, p.y, 10, '#06b6d4', 'rgba(6,182,212,0.25)');

    // Opponent marker (coral)
    const o = this._zoneCenterPx(this.opponentZone);
    _drawGlowCircle(ctx, o.x, o.y, 10, '#f43f5e', 'rgba(244,63,94,0.25)');
  }

  _drawShuttle(ctx, { fromZone, toZone, progress }) {
    if (!fromZone || !toZone) return;
    const from = this._zoneCenterPx(fromZone);
    const to   = this._zoneCenterPx(toZone);

    // Arc: midpoint lifted by 30% of distance
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2 - Math.abs(to.y - from.y) * 0.4 - 20;

    // Bezier interpolation
    const t = progress;
    const sx = (1-t)*(1-t)*from.x + 2*(1-t)*t*midX + t*t*to.x;
    const sy = (1-t)*(1-t)*from.y + 2*(1-t)*t*midY + t*t*to.y;

    // Trail dots
    for (let i = 1; i <= 4; i++) {
      const tp = Math.max(0, t - i * 0.05);
      const tx = (1-tp)*(1-tp)*from.x + 2*(1-tp)*tp*midX + tp*tp*to.x;
      const ty = (1-tp)*(1-tp)*from.y + 2*(1-tp)*tp*midY + tp*tp*to.y;
      ctx.fillStyle = `rgba(255,255,255,${0.3 - i * 0.06})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 3 - i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shuttle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Canvas Helpers ───────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _drawGlowCircle(ctx, x, y, r, color, glowColor) {
  // Glow
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(x, y, r + 4, 0, Math.PI * 2);
  ctx.fill();
  // Fill
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // White dot center
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}
