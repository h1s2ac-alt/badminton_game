import { DIFFICULTY, DIFFICULTY_CONFIGS } from '../utils/constants.js';

export class DifficultyScreen {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
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
      background: rgba(13, 17, 23, 0.9);
      backdrop-filter: blur(8px);
      color: white;
      z-index: 100;
      font-family: system-ui, sans-serif;
    `;

    const diffKeys = [DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD, DIFFICULTY.PRO];

    const cardsHtml = diffKeys.map(key => {
      const cfg = DIFFICULTY_CONFIGS[key];
      return `
        <button class="diff-btn" data-key="${key}" style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          width:100%;
          padding:16px 20px;
          margin-bottom:12px;
          background:rgba(255,255,255,0.05);
          border:2px solid ${cfg.color};
          border-radius:12px;
          color:white;
          cursor:pointer;
          text-align:left;
          transition:transform 0.15s ease, background 0.15s ease;
        ">
          <div>
            <div style="font-size:1.1rem; font-weight:800; color:${cfg.color};">${key} — ${cfg.name}</div>
            <div style="font-size:0.85rem; color:#94A3B8; margin-top:2px;">${cfg.description}</div>
          </div>
          <div style="font-size:1.4rem;">➔</div>
        </button>
      `;
    }).join('');

    this.el.innerHTML = `
      <div style="text-align:center; width:90%; max-width:440px;">
        <h2 style="font-size:2rem; font-weight:900; margin-bottom:8px;">SELECT OPPONENT</h2>
        <p style="color:#94A3B8; font-size:0.95rem; margin-bottom:24px;">Choose your AI difficulty tier</p>
        <div>${cardsHtml}</div>
      </div>
    `;

    this.el.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => btn.style.transform = 'translateX(4px)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'translateX(0)');
      btn.addEventListener('click', (e) => {
        const key = btn.getAttribute('data-key');
        this.destroy();
        this.onSelect(key);
      });
    });
  }

  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
