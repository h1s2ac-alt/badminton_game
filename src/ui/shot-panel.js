/**
 * shot-panel.js — Shot type selection buttons (redesigned)
 *
 * Each button shows: icon + name + stamina cost + risk colour bar.
 * Emits onShotSelect(shotType) callback.
 */

import { SHOT_TYPES, SHOT_DEFS, availableShots } from '../engine/shots.js';

// ─── Shot Meta ────────────────────────────────────────────────────────────────

const SHOT_META = {
  [SHOT_TYPES.CLEAR]:       { icon: '↑',  risk: 'safe',   riskLabel: 'Safe'    },
  [SHOT_TYPES.LOB]:         { icon: '⤴',  risk: 'safe',   riskLabel: 'Safe'    },
  [SHOT_TYPES.DROP]:        { icon: '↘',  risk: 'mid',    riskLabel: 'Tactical' },
  [SHOT_TYPES.DRIVE]:       { icon: '→',  risk: 'mid',    riskLabel: 'Tactical' },
  [SHOT_TYPES.NET_SHOT]:    { icon: '◎',  risk: 'mid',    riskLabel: 'Tactical' },
  [SHOT_TYPES.SMASH]:       { icon: '⚡', risk: 'risk',   riskLabel: 'High Risk' },
  [SHOT_TYPES.CROSS_COURT]: { icon: '↗',  risk: 'risk',   riskLabel: 'High Risk' },
  [SHOT_TYPES.SLICE]:       { icon: '✂',  risk: 'risk',   riskLabel: 'High Risk' },
};

const SHOT_ORDER = [
  SHOT_TYPES.CLEAR,
  SHOT_TYPES.LOB,
  SHOT_TYPES.DROP,
  SHOT_TYPES.DRIVE,
  SHOT_TYPES.NET_SHOT,
  SHOT_TYPES.SMASH,
  SHOT_TYPES.CROSS_COURT,
  SHOT_TYPES.SLICE,
];

export class ShotPanel {
  constructor(container, { onShotSelect } = {}) {
    this.container = container;
    this.onShotSelect = onShotSelect || (() => {});
    this.selectedShot = null;
    this.available = [];
    this._render();
  }

  update({ playerZone, shuttleIsHigh, stamina, disabled = false }) {
    this.available = disabled ? [] : availableShots({ playerZone, shuttleIsHigh, stamina });
    this._render();
  }

  clearSelection() {
    this.selectedShot = null;
    this._render();
  }

  _render() {
    const buttons = SHOT_ORDER.map(type => {
      const def   = SHOT_DEFS[type];
      const meta  = SHOT_META[type];
      const avail = this.available.includes(type);
      const sel   = this.selectedShot === type;

      return `
        <button
          class="shot-btn2 risk-${meta.risk} ${sel ? 'selected' : ''} ${!avail ? 'unavail' : ''}"
          data-shot="${type}"
          ${!avail ? 'disabled' : ''}
          title="${def.description}"
        >
          <span class="sb-icon">${meta.icon}</span>
          <span class="sb-name">${def.label}</span>
          <span class="sb-cost">${def.staminaCost}</span>
        </button>
      `;
    }).join('');

    const desc = this.selectedShot
      ? SHOT_DEFS[this.selectedShot].description
      : 'Pick a shot, then click a zone on the court.';

    this.container.innerHTML = `
      <div class="sp-header">
        <span class="sp-title">Shot Type</span>
        ${this.selectedShot
          ? `<span class="sp-risk-badge risk-${SHOT_META[this.selectedShot].risk}">${SHOT_META[this.selectedShot].riskLabel}</span>`
          : ''}
      </div>
      <div class="shot-grid2">${buttons}</div>
      <div class="shot-desc2">${desc}</div>
    `;

    this.container.querySelectorAll('.shot-btn2:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedShot = btn.dataset.shot;
        this._render();
        this.onShotSelect(this.selectedShot);
      });
    });
  }
}
