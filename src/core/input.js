import { gestureToShot } from '../utils/math.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.isMouseDown = false;
    this.startPos = { x: 0, y: 0 };
    this.startTime = 0;
    this.swipeListeners = [];
    this.tapListeners = [];
    this.keys = {};

    this._bindEvents();
    this._bindSwingButton();
  }

  onSwipe(fn) {
    this.swipeListeners.push(fn);
  }

  onTap(fn) {
    this.tapListeners.push(fn);
  }

  getMovementVector() {
    let dx = 0;
    let dz = 0;
    // WASD is dedicated to footwork positioning
    if (this.keys['KeyA']) dx -= 1;
    if (this.keys['KeyD']) dx += 1;
    // For player facing +Z towards net: W is forward (+Z), S is backward (-Z)
    if (this.keys['KeyW']) dz += 1;
    if (this.keys['KeyS']) dz -= 1;

    const len = Math.hypot(dx, dz);
    if (len > 0) {
      return { dx: dx / len, dz: dz / len, active: true };
    }
    return { dx: 0, dz: 0, active: false };
  }

  /**
   * Arrow keys are dedicated to directing shot placement:
   * ArrowLeft: Aim Left (Cross-court or down-the-line to left sideline)
   * ArrowRight: Aim Right (Cross-court or down-the-line to right sideline)
   * ArrowUp: Deep shot / Jump Smash / High Clear
   * ArrowDown: Short drop / Tight net tap
   */
  getAimDirection() {
    let aimX = 0;
    let aimZ = 0;

    if (this.keys['ArrowLeft'])  aimX -= 1;
    if (this.keys['ArrowRight']) aimX += 1;
    if (this.keys['ArrowUp'])    aimZ += 1; // Deep / Overhead Smash
    if (this.keys['ArrowDown'])  aimZ -= 1; // Short / Drop / Net

    const active = (aimX !== 0 || aimZ !== 0);
    return { aimX, aimZ, active };
  }

  _triggerTap(x = (typeof window !== 'undefined' ? window.innerWidth / 2 : 400), y = (typeof window !== 'undefined' ? window.innerHeight * 0.75 : 300)) {
    this.tapListeners.forEach(fn => fn({ x, y }));
  }

  _bindSwingButton() {
    if (typeof document === 'undefined') return;
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
    if (typeof window === 'undefined') return;
    // 1. Keyboard Spacebar for swinging, WASD for movement, Arrow Keys for directing shot placement
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.code === 'KeyZ' || e.code === 'Enter') {
        if (!e.repeat) {
          e.preventDefault();
          this._triggerTap();
        }
        return;
      }

      // WASD for movement footwork
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
        this.keys[e.code] = true;
        e.preventDefault();
        return;
      }

      // Arrow keys for directing shot placement: also trigger swing if tapped
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.keys[e.code] = true;
        e.preventDefault();
        if (!e.repeat) {
          this._triggerTap();
        }
        return;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.keys[e.code] = false;
        e.preventDefault();
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
      if (e.cancelable) e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this._onPointerStart(t.clientX, t.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (e.cancelable) e.preventDefault();
      if (this.isMouseDown && e.touches.length > 0) {
        const t = e.touches[0];
        this._onPointerMove(t.clientX, t.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        this._onPointerEnd(t.clientX, t.clientY);
      }
    }, { passive: false });
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
    const duration = Math.max(0.04, (endTime - this.startTime) / 1000); // in seconds

    const dx = x - this.startPos.x;
    const dy = y - this.startPos.y;
    const dist = Math.hypot(dx, dy);

    // If movement is minimal (< 30px), treat as tap/swing!
    if (dist < 30) {
      this._triggerTap(x, y);
      return;
    }

    // Angle in degrees: 0° = right (+X), 90° = down (+Y), 180° = left (-X), 270° = up (-Y)
    let angleRad = Math.atan2(dy, dx);
    let angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

    // Calibrated swipe velocity: reachable on both mobile screens and mouse flicks
    const velocity = dist / duration;
    const power = Math.min(1.2, Math.max(0.65, velocity / 650));

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
