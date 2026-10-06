export class ResultScreen {
  constructor(container, score, opponentName, onRematch, onMenu) {
    this.container = container;
    this.score = score;
    this.opponentName = opponentName;
    this.onRematch = onRematch;
    this.onMenu = onMenu;
    this.el = null;
    this.build();
  }

  build() {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(13, 17, 23, 0.92);
      backdrop-filter: blur(10px);
      color: white;
      z-index: 100;
      font-family: system-ui, sans-serif;
    `;

    const isWinner = this.score.matchWinner === 'player';
    const titleText = isWinner ? 'VICTORY!' : 'DEFEAT';
    const titleColor = isWinner ? '#4ADE80' : '#EF4444';

    this.el.innerHTML = `
      <div style="text-align:center; width:90%; max-width:400px; padding:24px;">
        <div style="font-size:3.5rem; font-weight:900; color:${titleColor}; letter-spacing:-0.02em; margin-bottom:4px;">
          ${titleText}
        </div>
        <p style="color:#94A3B8; font-size:1.1rem; margin-bottom:24px;">
          vs ${this.opponentName}
        </p>

        <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:20px; margin-bottom:32px;">
          <div style="font-size:0.85rem; color:#94A3B8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Final Games</div>
          <div style="font-size:2.5rem; font-weight:900; color:white;">
            ${this.score.playerGames} - ${this.score.opponentGames}
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <button id="rematch-btn" style="
            flex:1;
            padding:14px;
            font-size:1rem;
            font-weight:800;
            color:#0D1117;
            background:#4ADE80;
            border:none;
            border-radius:10px;
            cursor:pointer;
          ">
            REMATCH
          </button>
          <button id="menu-btn" style="
            flex:1;
            padding:14px;
            font-size:1rem;
            font-weight:800;
            color:white;
            background:rgba(255,255,255,0.1);
            border:1px solid rgba(255,255,255,0.2);
            border-radius:10px;
            cursor:pointer;
          ">
            MENU
          </button>
        </div>
      </div>
    `;

    this.el.querySelector('#rematch-btn').addEventListener('click', () => {
      this.destroy();
      this.onRematch();
    });

    this.el.querySelector('#menu-btn').addEventListener('click', () => {
      this.destroy();
      this.onMenu();
    });
  }

  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
