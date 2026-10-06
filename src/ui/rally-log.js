/**
 * rally-log.js — Text feed for rally events
 *
 * Displays the most recent rally description in the bottom bar
 * and maintains a scrollable history.
 */

export class RallyLog {
  constructor(container) {
    this.container = container;
    this.entries = [];
    this._render();
  }

  /** Add a log entry */
  push(message, type = 'normal') {
    // type: 'normal' | 'winner' | 'error' | 'warn' | 'let'
    this.entries.push({ message, type });
    if (this.entries.length > 50) this.entries.shift();
    this._render();
  }

  clear() {
    this.entries = [];
    this._render();
  }

  _render() {
    const last = this.entries[this.entries.length - 1];
    if (!last) {
      this.container.innerHTML = `<span id="rally-log-text">Match starting — choose your shot.</span>`;
      return;
    }

    const cssClass = last.type !== 'normal' ? `log-${last.type}` : '';
    this.container.innerHTML = `
      <span id="rally-log-text" class="${cssClass}">${last.message}</span>
    `;
  }
}
