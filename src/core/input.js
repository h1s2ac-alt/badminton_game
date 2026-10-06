import { gestureToShot } from '../utils/math.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.isMouseDown = false;
    this.startPos = { x: 0, y: 0 };
    this.startTime = 0;
    this.swipeListeners = [];
    this.tapListeners = [];

    this._bindEvents();
    this._bindSwingButton();
  }

  onSwipe(fn) {
    this.swipeListeners.push(fn);
  }

  onTap(fn) {
    this.tapListeners.push(fn);
  }

  _triggerTap(x = window.innerWidth / 2, y = window.innerHeight * 0.75) {
    this.tapListeners.forEach(fn => fn({ x, y }));
  }

  _bindSwingButton() {
    const bindBtn = () => {
      const btn = document.getElementById('swing-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._triggerTap();
        });
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._triggerTap();
        }, { passive: false });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindBtn);
    } else {
      bindBtn();
    }
  }

  _bindEvents() {
    // 1. Keyboard Spacebar for instant swinging
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return; // Ignore auto-repeat from holding key down
      if (e.code === 'Space' || e.key === ' ' || e.code === 'KeyZ' || e.code === 'Enter') {
        e.preventDefault();
        this._triggerTap();
      }
    });

    // 2. Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      // Direct click immediately registers a swing action
      this._onPointerStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => this._onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', (e) => this._onPointerEnd(e.clientX, e.clientY));

    // 3. Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this._onPointerStart(t.clientX, t.clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isMouseDown && e.touches.length > 0) {
        const t = e.touches[0];
        this._onPointerMove(t.clientX, t.clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        this._onPointerEnd(t.clientX, t.clientY);
      }
    }, { passive: true });
  }

  _onPointerStart(x, y) {
    this.isMouseDown = true;
    this.startPos = { x, y };
    this.startTime = performance.now();
  }

  _onPointerMove(x, y) {
    if (!this.isMouseDown) return;
  }

  _onPointerEnd(x, y) {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;

    const endTime = performance.now();
    const duration = (endTime - this.startTime) / 1000; // in seconds

    const dx = x - this.startPos.x;
    const dy = y - this.startPos.y;
    const dist = Math.hypot(dx, dy);

    // Any click or tap (small distance or short duration) triggers a tap/swing!
    if (dist < 35 || duration < 0.35) {
      this._triggerTap(x, y);
      return;
    }

    // Minimum swipe threshold for directional swiping
    if (dist < 40) {
      this._triggerTap(x, y);
      return;
    }

    // Angle in degrees: 0° = right (+X), 90° = down (+Y), 180° = left (-X), 270° = up (-Y)
    let angleRad = Math.atan2(dy, dx);
    let angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

    const velocity = dist / Math.max(0.05, duration);
    const power = Math.min(1.2, velocity / 1200);

    const gesture = gestureToShot(angleDeg, power);

    const swipeEvent = {
      dx, dy, dist, duration, velocity, angleDeg,
      shotType: gesture.shotType,
      power: gesture.powerMult || power,
      sideBias: gesture.sideBias || 0,
    };

    this.swipeListeners.forEach(fn => fn(swipeEvent));
  }
}
