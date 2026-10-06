import * as THREE from 'three';
import { Court3D } from './court-3d.js';
import { Character3D } from './character-3d.js';
import { Shuttle3D } from './shuttle-3d.js';
import { HUDRenderer } from './hud-renderer.js';
import { EffectsRenderer } from './effects.js';

export class Renderer {
  constructor(threeCanvas, gameCanvas) {
    if (!gameCanvas) {
      this.threeCanvas = document.getElementById('three-canvas') || threeCanvas;
      this.gameCanvas  = document.getElementById('game-canvas') || threeCanvas;
    } else {
      this.threeCanvas = threeCanvas;
      this.gameCanvas  = gameCanvas;
    }

    this.ctx = this.gameCanvas.getContext('2d');
    this._tempVec = new THREE.Vector3();

    this.width  = window.innerWidth;
    this.height = window.innerHeight;

    this._initThree();

    this.court3D    = new Court3D(this.scene);
    this.player3D   = new Character3D(this.scene, 'player');
    this.opponent3D = new Character3D(this.scene, 'opponent');
    this.shuttle3D  = new Shuttle3D(this.scene);

    this.hudRenderer     = new HUDRenderer(this);
    this.effectsRenderer = new EffectsRenderer(this);

    this.resize();
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8B7355); // Warm gym wall color

    // Camera matching Wii Badminton angle (high above the shoulder, looking down into court)
    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 0.1, 100);
    this.baseCamY = 3.3;
    this.camera.position.set(0, this.baseCamY, -9.2);
    this.camera.lookAt(0, 1.1, 0);

    this.threeRenderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.threeRenderer.setSize(this.width, this.height);
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.threeRenderer.shadowMap.enabled = true;
    this.threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.threeRenderer.toneMappingExposure = 1.15;
  }

  resize() {
    this.width  = window.innerWidth;
    this.height = window.innerHeight;

    // Resize Three.js WebGL canvas
    if (this.camera && this.threeRenderer) {
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.threeRenderer.setSize(this.width, this.height);
    }

    // Resize 2D HUD / Effects canvas
    if (this.gameCanvas) {
      this.gameCanvas.width  = this.width;
      this.gameCanvas.height = this.height;
    }
  }

  /**
   * Project 3D world coordinate {x, y, z} to 2D screen {x, y, scale, depth, visible}
   * Completely preserves the API used by HUD, Effects, and input handlers.
   */
  project(worldX, worldY, worldZ) {
    this._tempVec.set(-worldX, worldY, worldZ);
    this._tempVec.project(this.camera);

    if (this._tempVec.z > 1.0) {
      return { x: 0, y: 0, scale: 0, depth: 0, visible: false };
    }

    const screenX = (this._tempVec.x * 0.5 + 0.5) * this.width;
    const screenY = (-this._tempVec.y * 0.5 + 0.5) * this.height;

    const dz = Math.max(0.1, worldZ - this.camera.position.z);
    const scale = (this.height * 0.85) / dz;

    return {
      x: screenX,
      y: screenY,
      scale,
      depth: this._tempVec.z,
      visible: screenX >= -200 && screenX <= this.width + 200
            && screenY >= -200 && screenY <= this.height + 200,
    };
  }

  _updateDynamicCamera(shuttlecock) {
    if (shuttlecock && shuttlecock.inFlight && shuttlecock.y > 3.0) {
      const highFactor = Math.min(1.0, (shuttlecock.y - 3.0) / 4.0);
      const targetY = this.baseCamY + highFactor * 0.45;
      this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
      this.camera.lookAt(0, 1.1 + highFactor * 0.7, 0);
    } else {
      this.camera.position.y += (this.baseCamY - this.camera.position.y) * 0.05;
      this.camera.lookAt(0, 1.1, 0);
    }
  }

  render(gameState) {
    this._updateDynamicCamera(gameState.shuttlecock);

    // Apply camera shake if any
    const shake = this.effectsRenderer.getShakeOffset();
    const origCamX = this.camera.position.x;
    const origCamY = this.camera.position.y;
    this.camera.position.x += shake.dx * 0.015;
    this.camera.position.y += shake.dy * 0.015;

    // 1. Update 3D Character models
    if (gameState.player) {
      this.player3D.update(gameState.player, 0.016);
    }
    if (gameState.opponent) {
      this.opponent3D.update(gameState.opponent, 0.016);
    }

    // 2. Update 3D Shuttlecock & landing reticle
    this.shuttle3D.update(gameState.shuttlecock);

    // 3. Render Three.js 3D WebGL scene with real-time shadow maps
    this.threeRenderer.render(this.scene, this.camera);

    // Reset camera shake offset
    this.camera.position.x = origCamX;
    this.camera.position.y = origCamY;

    // 4. Render 2D Overlay (HUD and visual particles/text) on transparent canvas
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(shake.dx, shake.dy);
    this.effectsRenderer.render();
    ctx.restore();

    this.hudRenderer.render(gameState);
  }
}
