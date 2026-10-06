/**
 * screens.js — Title, opponent select, and result screens
 *
 * Each screen returns an HTMLElement and an optional cleanup function.
 */

import { OPPONENTS } from '../data/opponents.js';
import { PROFILES } from '../ai/profiles.js';

// ─── Title Screen ─────────────────────────────────────────────────────────────

/**
 * @param {{ onPlay: Function }} callbacks
 * @returns HTMLElement
 */
export function createTitleScreen({ onPlay }) {
  const el = document.createElement('div');
  el.id = 'title-screen';
  el.className = 'screen';
  el.innerHTML = `
    <span class="title-badge">Strategy · Singles · Turn-Based</span>
    <div class="title-logo">
      <h1>Badminton</h1>
      <p>Every shot is a decision. Every rally is a battle of minds.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;max-width:280px">
      <button class="btn btn-primary btn-lg btn-full" id="play-btn">▶ Play Match</button>
      <button class="btn btn-ghost btn-full" id="how-btn">? How to Play</button>
    </div>
    <div style="margin-top:auto;text-align:center">
      <p style="font-size:0.7rem;color:var(--text-dim)">
        3×3 court zones · 8 shot types · 3 AI opponents · Full badminton rules
      </p>
    </div>
  `;

  el.querySelector('#play-btn').addEventListener('click', onPlay);
  el.querySelector('#how-btn').addEventListener('click', () => showHowToPlay());
  return el;
}

// ─── How to Play Modal ────────────────────────────────────────────────────────

export function showHowToPlay() {
  // Remove any existing modal
  document.getElementById('htp-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'htp-overlay';
  overlay.innerHTML = `
    <div class="htp-modal">
      <div class="htp-header">
        <h2>How to Play</h2>
        <button class="htp-close" id="htp-close-btn" aria-label="Close">✕</button>
      </div>
      <div class="htp-body">

        <div class="htp-section">
          <h3>🎯 Goal</h3>
          <p>Win a best-of-3 match by scoring <strong>21 points</strong> per game (must win by 2, cap at 30). Every rally awards a point — there are no side-outs.</p>
        </div>

        <div class="htp-section">
          <h3>🏸 Taking Your Turn</h3>
          <ol>
            <li><strong>Pick a Shot Type</strong> — choose from the 8 buttons on the right panel. Each shot has a stamina cost and different risk/reward.</li>
            <li><strong>Pick a Target Zone</strong> — click a highlighted zone in the 3×3 grid (your aim on the opponent's court). Only valid zones light up for your chosen shot.</li>
            <li><strong>Execute</strong> — hit the <em>Execute Shot</em> button. Watch the rally resolve and read the result in the log below.</li>
          </ol>
        </div>

        <div class="htp-section">
          <h3>🗺️ The Court</h3>
          <p>Each half of the court is a <strong>3×3 grid</strong>: Back / Mid / Net rows × Left / Centre / Right columns.</p>
          <ul>
            <li><span class="htp-cyan">●</span> Cyan circle = <strong>You</strong></li>
            <li><span class="htp-coral">●</span> Coral circle = <strong>Opponent</strong></li>
            <li>Amber dots on the grid = valid targets for your selected shot</li>
          </ul>
        </div>

        <div class="htp-section">
          <h3>⚡ Shot Types</h3>
          <div class="htp-shots">
            <div class="htp-shot"><span class="htp-tag safe">Safe</span><strong>Clear</strong> — High deep shot. Resets the rally. Low stamina cost.</div>
            <div class="htp-shot"><span class="htp-tag safe">Safe</span><strong>Lob</strong> — Defensive lift. Buys recovery time.</div>
            <div class="htp-shot"><span class="htp-tag mid">Tactical</span><strong>Drop</strong> — Soft angled shot to the net. Deceptive but risky.</div>
            <div class="htp-shot"><span class="htp-tag mid">Tactical</span><strong>Drive</strong> — Flat fast shot through the middle. Pressures opponent.</div>
            <div class="htp-shot"><span class="htp-tag mid">Tactical</span><strong>Net Shot</strong> — Tight tumbling shot at the net. <em>Requires you to be at the net.</em></div>
            <div class="htp-shot"><span class="htp-tag risk">High Risk</span><strong>Smash</strong> — Powerful downward strike. High stamina cost. <em>Only available when shuttle is high.</em></div>
            <div class="htp-shot"><span class="htp-tag risk">High Risk</span><strong>Cross-Court</strong> — Wide angle to the opposite side. Hard to reach, harder to execute.</div>
            <div class="htp-shot"><span class="htp-tag risk">High Risk</span><strong>Slice</strong> — Deceptive cut shot. Adds disguise at the cost of accuracy.</div>
          </div>
        </div>

        <div class="htp-section">
          <h3>💪 Stamina</h3>
          <p>The bar in the top-right is your stamina. It drains with every shot and movement. When it runs low:</p>
          <ul>
            <li>Your accuracy drops</li>
            <li>You move slower</li>
            <li>Smash becomes unavailable below 15</li>
          </ul>
          <p>Stamina recovers between points and more between games — so long rallies matter.</p>
        </div>

        <div class="htp-section">
          <h3>🧠 Strategy Tips</h3>
          <ul>
            <li><strong>Vary your shots.</strong> Repeating the same shot to the same zone lets the AI predict and punish you — you'll see a warning in the rally log.</li>
            <li><strong>Use Clears to reset</strong> when you're out of position or low on stamina.</li>
            <li><strong>Drop shots force the opponent forward</strong> — great if they're at the back.</li>
            <li><strong>Smash when the shuttle is HIGH</strong> (after opponent plays a Clear or Lob).</li>
            <li><strong>Against Thunder (Marcus Bolt)</strong> — survive the early smashes, his stamina will crack.</li>
            <li><strong>Against The Fox (Yuki Tanaka)</strong> — unpredictability is your best weapon.</li>
          </ul>
        </div>

        <div class="htp-section">
          <h3>📋 Serving</h3>
          <p>The winner of each rally serves next. The server alternates service court (right when score is even, left when odd). A serve that clips the net and lands in is a <em>let</em> — replay the point.</p>
        </div>

      </div>
      <div class="htp-footer">
        <button class="btn btn-primary" id="htp-close-btn-2">Got it — let's play!</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#htp-close-btn').addEventListener('click', close);
  overlay.querySelector('#htp-close-btn-2').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// ─── Opponent Select Screen ───────────────────────────────────────────────────

/**
 * @param {{ onSelect: Function(opponentId) }} callbacks
 * @returns HTMLElement
 */
export function createSelectScreen({ onSelect }) {
  const el = document.createElement('div');
  el.id = 'select-screen';
  el.className = 'screen';

  let selectedId = null;

  el.innerHTML = `
    <h2>Choose Your Opponent</h2>
    <div class="opponent-grid">
      ${OPPONENTS.map(opp => {
        const profile = PROFILES[opp.profileId];
        const pips = [1,2,3].map(i =>
          `<div class="pip ${i <= profile.difficulty ? 'active' : ''}"></div>`
        ).join('');
        const initial = opp.name.split(' ').map(n => n[0]).join('');
        return `
          <div class="opponent-card" data-opp-id="${opp.id}">
            <div class="opp-card-header">
              <div class="opp-avatar" style="background:${profile.color}22;color:${profile.color}">${initial}</div>
              <div class="opp-card-name">
                <h3>${opp.name}</h3>
                <div class="opp-subtitle">${profile.subtitle}</div>
              </div>
            </div>
            <div class="opp-tagline">${opp.tagline}</div>
            <p class="opp-bio">${opp.bio}</p>
            <div class="difficulty-pips">${pips}</div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:center;gap:12px;margin-top:8px">
      <button class="btn btn-ghost" id="back-btn">← Back</button>
      <button class="btn btn-primary btn-lg" id="start-btn" disabled>Start Match →</button>
    </div>
  `;

  // Card selection
  el.querySelectorAll('.opponent-card').forEach(card => {
    card.addEventListener('click', () => {
      el.querySelectorAll('.opponent-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedId = card.dataset.oppId;
      el.querySelector('#start-btn').disabled = false;
    });
  });

  el.querySelector('#start-btn').addEventListener('click', () => {
    if (selectedId) onSelect(selectedId);
  });

  el.querySelector('#back-btn').addEventListener('click', () => {
    onSelect(null); // signals back
  });

  return el;
}

// ─── Result Screen ────────────────────────────────────────────────────────────

/**
 * @param {object} matchState
 * @param {{ onRematch: Function, onMenu: Function }} callbacks
 * @returns HTMLElement
 */
export function createResultScreen(matchState, { onRematch, onMenu }) {
  const el = document.createElement('div');
  el.id = 'result-screen';
  el.className = 'screen';

  const won = matchState.matchWinner === 'player';
  const headline = won ? 'VICTORY' : 'DEFEAT';
  const sub = won ? 'You won the match!' : 'Better luck next time.';

  const gameScores = matchState.games.map((g, i) => {
    const pwon = g.playerScore > g.opponentScore;
    return `
      <div class="result-game-score">
        <div class="game-label">Game ${i + 1}</div>
        <div class="game-pts" style="color:${pwon ? 'var(--accent)' : 'var(--accent-2)'}">
          ${g.playerScore}–${g.opponentScore}
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="result-headline">
      <div class="result-label">${sub}</div>
      <div class="result-title ${won ? 'win' : 'lose'}">${headline}</div>
    </div>

    <div class="result-games">${gameScores}</div>

    <div style="display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;max-width:280px">
      <button class="btn btn-primary btn-lg btn-full" id="rematch-btn">↩ Rematch</button>
      <button class="btn btn-ghost btn-full" id="menu-btn">← Main Menu</button>
    </div>
  `;

  el.querySelector('#rematch-btn').addEventListener('click', onRematch);
  el.querySelector('#menu-btn').addEventListener('click', onMenu);

  return el;
}

// ─── Game Screen Shell ─────────────────────────────────────────────────────────

/**
 * Creates the game screen DOM shell (HUD, court, shot panel, log).
 * @returns {{ el, hudEl, courtSection, shotSection, logEl }}
 */
export function createGameScreen() {
  const el = document.createElement('div');
  el.id = 'game-screen';
  el.className = 'screen';

  el.innerHTML = `
    <div id="game-hud"></div>
    <div id="game-body">
      <section id="court-section">
        <canvas id="court-canvas"></canvas>
      </section>
      <section id="shot-section">
        <div id="shot-panel-container"></div>
        <div id="zone-picker-container"></div>
        <div id="execute-wrap" style="margin-top:auto">
          <button id="execute-btn" disabled>EXECUTE SHOT ▶</button>
        </div>
      </section>
    </div>
    <div id="game-log"></div>
  `;

  return {
    el,
    hudEl:          el.querySelector('#game-hud'),
    courtSection:   el.querySelector('#court-section'),
    shotSection:    el.querySelector('#shot-section'),
    shotPanelEl:    el.querySelector('#shot-panel-container'),
    zonePanelEl:    el.querySelector('#zone-picker-container'),
    executeBtn:     el.querySelector('#execute-btn'),
    logEl:          el.querySelector('#game-log'),
    canvas:         el.querySelector('#court-canvas'),
  };
}

// ─── Phase Banner ─────────────────────────────────────────────────────────────

/**
 * Show a temporary overlay banner (e.g. "Side Switch", "Point!").
 * Removes itself after durationMs.
 *
 * @param {HTMLElement} parent
 * @param {string} html
 * @param {number} durationMs
 * @returns {Promise}
 */
export function showBanner(parent, html, durationMs = 1800) {
  return new Promise(resolve => {
    const banner = document.createElement('div');
    banner.className = 'phase-banner';
    banner.innerHTML = html;
    parent.style.position = 'relative';
    parent.appendChild(banner);
    setTimeout(() => {
      banner.remove();
      resolve();
    }, durationMs);
  });
}
