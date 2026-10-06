export class TitleScreen {
  constructor(container, onPlay) {
    this.container = container;
    this.onPlay = onPlay;
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
      background: rgba(13, 17, 23, 0.88);
      backdrop-filter: blur(8px);
      color: white;
      z-index: 100;
      font-family: system-ui, sans-serif;
    `;

    this.el.innerHTML = `
      <div style="text-align:center; max-width:480px; padding:24px;">
        <div style="font-size:3.5rem; font-weight:900; letter-spacing:-0.03em; background:linear-gradient(135deg, #60A5FA, #34D399); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:8px;">
          WII BADMINTON
        </div>
        <p style="color:#94A3B8; font-size:1.1rem; margin-bottom:32px;">
          Swipe to swing! Auto-positioning 2.5D action.
        </p>

        <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:16px; margin-bottom:32px; text-align:left; font-size:0.9rem; color:#CBD5E1;">
          <div style="font-weight:700; color:#FACC15; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">How to Play:</div>
          <ul style="padding-left:20px; line-height:1.6;">
            <li><strong>Swipe Up:</strong> Clear / High Lob</li>
            <li><strong>Swipe Down:</strong> Power Smash</li>
            <li><strong>Swipe Left/Right:</strong> Cross-court Drive</li>
            <li><strong>Gentle Swipe:</strong> Drop Shot</li>
            <li>Time your swipe when shuttlecock reaches the green circle!</li>
          </ul>
        </div>

        <button id="start-btn" style="
          width:100%;
          padding:16px;
          font-size:1.25rem;
          font-weight:800;
          color:#0D1117;
          background:linear-gradient(135deg, #4ADE80, #22C55E);
          border:none;
          border-radius:12px;
          cursor:pointer;
          box-shadow:0 10px 25px -5px rgba(34,197,94,0.4);
          transition:transform 0.15s ease, filter 0.15s ease;
        ">
          PLAY GAME
        </button>
      </div>
    `;

    const btn = this.el.querySelector('#start-btn');
    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.03)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('click', () => {
      this.destroy();
      this.onPlay();
    });
  }

  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
