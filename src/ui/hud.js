/**
 * hud.js — Score, stamina bar, serve indicator HUD
 *
 * Renders into the #game-hud element.
 * Presentation only.
 */

import { staminaTier } from '../engine/stamina.js';
import { scoreString, gameLabel, matchScoreLabel, isMatchPoint } from '../engine/match.js';

export class HUD {
  constructor(container) {
    this.container = container;
    this._render({ currentGame: { playerScore: 0, opponentScore: 0 } });
  }

  /** Update HUD with current match state */
  update(matchState) {
    const {
      currentGame: { playerScore, opponentScore } = { playerScore: 0, opponentScore: 0 },
      gameNumber = 1,
      playerGames = 0,
      opponentGames = 0,
      playerStamina = 100,
      server = 'player',
      serviceCourtSide = 'right',
      phase = 'pre_serve',
    } = matchState;

    const tier = staminaTier(playerStamina);
    const pct  = Math.max(0, Math.min(100, playerStamina));
    const matchPt = isMatchPoint(matchState);

    this.container.innerHTML = `
      <div class="hud-score">
        <span class="player-score">${playerScore}</span>
        <span class="separator">–</span>
        <span class="opp-score">${opponentScore}</span>
      </div>

      <span class="hud-game-label">Game ${gameNumber}</span>
      <span class="hud-match-score">${playerGames}–${opponentGames} games</span>

      <span class="hud-serve">
        ${server === 'player' ? '▶ You serve' : '◀ Opp serves'}
        ${server === 'player' ? `(${serviceCourtSide})` : ''}
      </span>

      ${matchPt ? '<span class="hud-serve" style="color:var(--accent-3);border-color:var(--accent-3)">MATCH POINT</span>' : ''}

      <div class="hud-stamina-wrap">
        <span class="hud-stamina-label">STA</span>
        <div class="stamina-bar-track">
          <div class="stamina-bar-fill" data-tier="${tier}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }

  _render(state) {
    this.update(state);
  }
}
