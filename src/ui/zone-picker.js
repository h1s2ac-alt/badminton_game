/**
 * zone-picker.js — Target zone grid selector
 *
 * Displays a 3×3 grid of the opponent's half of the court.
 * Player taps a zone to aim their shot.
 * Highlights valid zones for the selected shot type.
 * Emits onZoneSelect(zoneId) callback.
 */

import { validTargetZones } from '../engine/court.js';

const OPPONENT_ZONE_GRID = [
  ['OBL', 'OBC', 'OBR'],
  ['OML', 'OMC', 'OMR'],
  ['ONL', 'ONC', 'ONR'],
];

const ZONE_DISPLAY = {
  OBL: 'Back L', OBC: 'Back C', OBR: 'Back R',
  OML: 'Mid L',  OMC: 'Mid C',  OMR: 'Mid R',
  ONL: 'Net L',  ONC: 'Net C',  ONR: 'Net R',
};

export class ZonePicker {
  constructor(container, { onZoneSelect } = {}) {
    this.container = container;
    this.onZoneSelect = onZoneSelect || (() => {});
    this.selectedZone = null;
    this.validZones = [];
    this.disabled = true;
    this._render();
  }

  /** Update which zones are valid for the selected shot type */
  update({ shotType, playerZone, disabled = false }) {
    this.disabled = disabled;
    if (shotType && !disabled) {
      this.validZones = validTargetZones(playerZone, shotType);
    } else {
      this.validZones = [];
    }
    // Clear selection if it's no longer valid
    if (this.selectedZone && !this.validZones.includes(this.selectedZone)) {
      this.selectedZone = null;
    }
    this._render();
  }

  clearSelection() {
    this.selectedZone = null;
    this._render();
  }

  _render() {
    const rows = OPPONENT_ZONE_GRID.map(row =>
      row.map(zoneId => {
        const isValid   = this.validZones.includes(zoneId);
        const isSel     = this.selectedZone === zoneId;
        const isDisabled = this.disabled || !isValid;
        return `
          <div
            class="zone-cell ${isSel ? 'selected' : ''} ${isDisabled ? 'invalid' : ''}"
            data-zone="${zoneId}"
            title="${ZONE_DISPLAY[zoneId]}"
          >
            ${isSel ? '' : (isValid ? '<span style="opacity:0.45;font-size:0.55rem">' + ZONE_DISPLAY[zoneId] + '</span>' : '')}
          </div>
        `;
      }).join('')
    ).map(row => `<div style="display:contents">${row}</div>`).join('');

    this.container.innerHTML = `
      <div class="shot-panel-label">Aim Target</div>
      <div class="zone-grid">${OPPONENT_ZONE_GRID.flat().map(zoneId => {
        const isValid   = this.validZones.includes(zoneId);
        const isSel     = this.selectedZone === zoneId;
        const isDisabled = this.disabled || !isValid;
        return `
          <div
            class="zone-cell ${isSel ? 'selected' : ''} ${isDisabled ? 'invalid' : ''}"
            data-zone="${zoneId}"
            title="${ZONE_DISPLAY[zoneId]}"
          >${isSel ? '' : (isValid ? `<span style="opacity:0.45;font-size:0.55rem">${ZONE_DISPLAY[zoneId]}</span>` : '')}</div>
        `;
      }).join('')}</div>
    `;

    this.container.querySelectorAll('.zone-cell:not(.invalid)').forEach(cell => {
      cell.addEventListener('click', () => {
        this.selectedZone = cell.dataset.zone;
        this._render();
        this.onZoneSelect(this.selectedZone);
      });
    });
  }
}
