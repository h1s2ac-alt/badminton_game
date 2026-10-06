import { GAME_STATES, COURT, SHOT_TYPES, DIFFICULTY } from '../utils/constants.js';
import { Court } from '../entities/court.js';
import { Player } from '../entities/player.js';
import { Opponent } from '../entities/opponent.js';
import { Shuttlecock } from '../entities/shuttlecock.js';
import { ScoreTracker } from './scoring.js';
import { AIController } from '../ai/ai-controller.js';

export class GameEngine {
  constructor(renderer, inputManager) {
    this.renderer = renderer;
    this.input = inputManager;

    this.state = GAME_STATES.TITLE;
    this.player = new Player();
    this.opponent = new Opponent(DIFFICULTY.MEDIUM);
    this.shuttlecock = new Shuttlecock();
    this.score = new ScoreTracker();
    this.ai = new AIController(this.opponent);

    this.lastTime = performance.now();
    this.bannerMessage = null;
    this.bannerColor = null;
    this.bannerTimer = 0;
    this.serveTimer = 0;
    this.freezeFrames = 0; // For Hit-Stop effect (Item #2)
    this._swingCooldown = 0; // Prevents rapid re-fire of player swings

    this._bindInput();
  }

  _bindInput() {
    this.input.onSwipe((swipe) => this._handlePlayerSwipe(swipe));
    this.input.onTap(() => this._handlePlayerAction());
  }

  _handlePlayerAction() {
    // Prevent rapid re-fires (double-click, key repeat, double-event)
    if (this._swingCooldown > 0) return;

    if (this.state === GAME_STATES.PRE_SERVE) {
      if (this.score.server === 'player') {
        this._executePlayerShot({ shotType: SHOT_TYPES.SERVE, power: 0.9, sideBias: 0 }, true);
        this.state = GAME_STATES.RALLY;
        this._swingCooldown = 0.5;
      }
      return;
    }

    if (this.state === GAME_STATES.RALLY) {
      this._handlePlayerSwing();
    }
  }

  _handlePlayerSwing() {
    if (this.state !== GAME_STATES.RALLY) return;

    if (this.shuttlecock.isHittableBy('player', this.player)) {
      const dx = this.shuttlecock.x - this.player.x;
      const dz = this.shuttlecock.z - this.player.z;
      const dist = Math.hypot(dx, dz);

      let quality = 'GOOD';
      if (dist < 0.9) {
        quality = 'PERFECT';
      } else if (dist > 1.9) {
        quality = 'POOR';
      }

      // Automatically pick optimal shot based on shuttlecock height and position
      let shotType = SHOT_TYPES.CLEAR;
      if (this.shuttlecock.y > 2.2 && dist < 1.3) {
        shotType = SHOT_TYPES.SMASH;
      } else if (this.shuttlecock.z > -2.2) {
        shotType = SHOT_TYPES.DROP;
      } else if (Math.random() < 0.35) {
        shotType = SHOT_TYPES.DRIVE;
      }

      // Aim dynamically to open court
      const targetSide = this.opponent.x > 0 ? -1 : 1;
      const sideBias = targetSide * 0.45;

      this._executePlayerShot({
        shotType,
        power: 0.95,
        sideBias,
      }, false, quality);

      // Prevent re-triggering until the shot is well underway
      this._swingCooldown = 0.5;
    } else {
      // Whiff
      this.player.triggerWhiff();
      this.renderer.effectsRenderer.addHitText(
        { x: this.player.x, y: 1.5, z: this.player.z },
        'MISS!',
        '#EF4444'
      );
      this._swingCooldown = 0.3; // Short cooldown after whiff too
    }
  }

  startMatch(difficultyKey) {
    this.opponent.setDifficulty(difficultyKey);
    this.score.resetMatch();
    this.resetRally(true);
  }

  resetRally(isNewGame = false) {
    this.player.reset();
    this.opponent.reset();

    const serverRole = this.score.server;
    const courtSide = this.score.getServeCourtSide();

    // Position server and receiver
    const serverPos = Court.getServePosition(serverRole, courtSide);
    // Receiver is diagonally opposite (opposite role, opposite court side logic inherently handled if we just pass opposite role and same side, or opposite side)
    // Wait, if player serves from 'right' (x=1.2), opponent receives from their 'right' (x=-1.2).
    // Let's just use the same courtSide string for the receiver, Court.getServePosition handles the mirroring.
    const receiverPos = Court.getServePosition(serverRole === 'player' ? 'opponent' : 'player', courtSide);

    if (serverRole === 'player') {
      this.player.x = serverPos.x;
      this.player.z = serverPos.z;
      this.shuttlecock.reset({ x: this.player.x + 0.3, y: 1.2, z: this.player.z + 0.3 });
      
      this.opponent.x = receiverPos.x;
      this.opponent.z = receiverPos.z;
    } else {
      this.opponent.x = serverPos.x;
      this.opponent.z = serverPos.z;
      this.shuttlecock.reset({ x: this.opponent.x - 0.3, y: 1.2, z: this.opponent.z - 0.3 });
      
      this.player.x = receiverPos.x;
      this.player.z = receiverPos.z;
    }

    this.ai.reset();
    this.state = GAME_STATES.PRE_SERVE;
    this.serveTimer = 0;
  }

  _handlePlayerSwipe(swipe) {
    if (this.state === GAME_STATES.PRE_SERVE) {
      if (this.score.server === 'player') {
        // Player serves with directional control (Item #3)
        this._executePlayerShot(swipe, true);
        this.state = GAME_STATES.RALLY;
      }
      return;
    }

    if (this.state !== GAME_STATES.RALLY) return;

    if (this.shuttlecock.isHittableBy('player', this.player)) {
      // Calculate hit quality based on distance (Items #3 & #4)
      const dx = this.shuttlecock.x - this.player.x;
      const dz = this.shuttlecock.z - this.player.z;
      const dist = Math.hypot(dx, dz);
      
      let quality = 'GOOD';
      if (dist < 0.6) {
        quality = 'PERFECT';
      } else if (dist > 1.4) {
        quality = 'POOR';
      }

      this._executePlayerShot(swipe, false, quality);
    } else {
      // Whiff!
      this.player.triggerWhiff();
      this.renderer.effectsRenderer.addHitText({ x: this.player.x, y: 1.5, z: this.player.z }, 'MISS!', '#EF4444');
    }
  }

  _executePlayerShot(swipe, isServe = false, quality = 'GOOD') {
    if (quality === 'POOR' && !isServe) {
      this.player.triggerStumble(); // Item #4: Stumble mechanic
      // Force weak clear on stumble
      swipe.shotType = SHOT_TYPES.CLEAR; 
      swipe.power = 0.6;
    } else {
      this.player.triggerSwing();
    }

    // Item #4: Consume stamina based on shot type
    let staminaCost = 0.05;
    if (swipe.shotType === SHOT_TYPES.SMASH) staminaCost = 0.15;
    else if (swipe.shotType === SHOT_TYPES.CLEAR) staminaCost = 0.08;
    this.player.consumeStamina(staminaCost);

    // Apply stamina penalty to power if exhausted, boost for PERFECT
    const staminaPowerMult = this.player.stamina < 0.25 ? 0.7 : 1.0;
    const qualityMult = quality === 'PERFECT' ? 1.15 : (quality === 'POOR' ? 0.7 : 1.0);
    const finalPower = swipe.power * staminaPowerMult * qualityMult;

    // Item #3 & Diagonal Serve rules
    let targetX;
    if (isServe) {
      // Must serve to diagonal opposite court
      const serveDir = this.player.x > 0 ? -1 : 1;
      const biasOffset = (swipe.sideBias || 0) * 0.8; // -0.8 to 0.8
      targetX = (serveDir * Court.HALF_WIDTH / 2) + (biasOffset * Court.HALF_WIDTH / 2);
    } else {
      targetX = (swipe.sideBias || 0) * (Court.HALF_WIDTH * 0.8);
      if (Math.abs(targetX) < 0.2) {
        targetX = (Math.random() - 0.5) * Court.HALF_WIDTH * 0.8;
      }
    }

    let targetZ = COURT.HALF_LENGTH - 1.0; // default deep
    if (isServe) {
      // Serve landing spot (short or deep service box based on swipe type)
      targetZ = swipe.shotType === SHOT_TYPES.DROP ? COURT.SHORT_SERVICE_DIST + 0.5 : 4.8;
    } else if (swipe.shotType === SHOT_TYPES.DROP || swipe.shotType === SHOT_TYPES.NET) {
      targetZ = COURT.SHORT_SERVICE_DIST + 0.5;
    } else if (swipe.shotType === SHOT_TYPES.SMASH) {
      targetZ = 3.2;
    }

    // Add some random error to aim based on quality
    if (quality === 'POOR') {
      targetX += (Math.random() - 0.5) * 1.5;
      targetZ += (Math.random() - 0.5) * 1.5;
    }

    const startPos = { x: this.player.x, y: 1.5, z: this.player.z };
    const targetPos = { x: targetX, y: 0, z: targetZ };

    const shotType = isServe ? SHOT_TYPES.SERVE : swipe.shotType;
    this.shuttlecock.launch(shotType, startPos, targetPos, finalPower, 'player', quality);

    // Impact particles for every hit; text + shake only for smashes
    const isSmash = swipe.shotType === SHOT_TYPES.SMASH;
    this.renderer.effectsRenderer.addImpact(
      startPos,
      isSmash ? '#FF4020' : (quality === 'PERFECT' ? '#60A5FA' : '#4ADE80'),
      isSmash ? 1.3 : 0.7
    );
    if (isSmash) {
      this.renderer.effectsRenderer.addHitText(startPos, 'SMASH!', '#FF4020');
      this.renderer.effectsRenderer.triggerShake(1.0);
      this.freezeFrames = 0.08; // Item #2: Hit-stop freeze frame!
    } else if (isServe) {
      this.renderer.effectsRenderer.addHitText(startPos, 'SERVE!', '#FACC15');
    } else if (quality === 'PERFECT') {
      this.renderer.effectsRenderer.addHitText(startPos, 'PERFECT!', '#60A5FA');
    } else if (quality === 'POOR') {
      this.renderer.effectsRenderer.addHitText(startPos, 'LATE!', '#EF4444');
    }
  }

  _executeAIShot(aiShot) {
    let staminaCost = 0.05;
    if (aiShot.shotType === SHOT_TYPES.SMASH) staminaCost = 0.15;
    this.opponent.consumeStamina(staminaCost);

    // AI quality simulation
    const rand = Math.random();
    let quality = 'GOOD';
    if (rand < 0.2) quality = 'PERFECT';
    else if (rand > 0.85) quality = 'POOR';

    if (quality === 'POOR' && aiShot.shotType !== SHOT_TYPES.SERVE) {
      this.opponent.triggerStumble();
      aiShot.shotType = SHOT_TYPES.CLEAR;
      aiShot.power *= 0.7;
    } else {
      this.opponent.triggerSwing();
    }

    if (aiShot.shotType === SHOT_TYPES.SERVE) {
      const serveDir = this.opponent.x > 0 ? -1 : 1;
      aiShot.targetPos.x = (serveDir * Court.HALF_WIDTH / 2) + (Math.random() - 0.5) * (Court.HALF_WIDTH * 0.8);
    }

    const startPos = { x: this.opponent.x, y: 1.5, z: this.opponent.z };
    this.shuttlecock.launch(aiShot.shotType, startPos, aiShot.targetPos, aiShot.power, 'opponent', quality);

    const isSmash = aiShot.shotType === SHOT_TYPES.SMASH;
    this.renderer.effectsRenderer.addImpact(
      startPos,
      isSmash ? '#FBBF24' : '#FACC15',
      isSmash ? 1.1 : 0.6
    );
    if (isSmash) {
      this.renderer.effectsRenderer.triggerShake(1.0);
      this.freezeFrames = 0.08;
    }
  }

  update(now) {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.renderer.effectsRenderer.update(dt);

    // Tick down swing cooldown
    if (this._swingCooldown > 0) {
      this._swingCooldown = Math.max(0, this._swingCooldown - dt);
    }

    if (this.freezeFrames > 0) {
      this.freezeFrames -= dt;
      // Still render, but don't update entities (Hit-Stop effect)
      this.renderer.render({
        state: this.state,
        player: this.player,
        opponent: this.opponent,
        shuttlecock: this.shuttlecock,
        score: this.score,
        bannerMessage: this.bannerMessage,
        bannerColor: this.bannerColor,
      });
      return;
    }

    if (this.state === GAME_STATES.PRE_SERVE) {
      if (this.score.server === 'opponent') {
        this.serveTimer += dt;
        if (this.serveTimer >= 1.2) {
          this.opponent.triggerSwing();
          this._executeAIShot({
            shotType: SHOT_TYPES.SERVE,
            targetPos: { x: (Math.random() - 0.5) * 3.0, y: 0, z: -3.5 },
            power: 0.95,
          });
          this.state = GAME_STATES.RALLY;
        }
      }
    } else if (this.state === GAME_STATES.RALLY) {
      this.shuttlecock.update(dt);
      this.player.update(dt, this.shuttlecock, true);
      this.opponent.update(dt);

      this.ai.update(dt, this.shuttlecock, this.player, (aiShot) => this._executeAIShot(aiShot));

      if (this.shuttlecock.landed) {
        this._resolvePoint();
      }
    } else if (this.state === GAME_STATES.POINT_SCORED) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerMessage = null;
        if (this.score.matchWinner) {
          this.state = GAME_STATES.MATCH_OVER;
          if (this.onMatchOver) this.onMatchOver(this.score);
        } else {
          this.resetRally();
        }
      }
    }

    this.renderer.render({
      state: this.state,
      player: this.player,
      opponent: this.opponent,
      shuttlecock: this.shuttlecock,
      score: this.score,
      bannerMessage: this.bannerMessage,
      bannerColor: this.bannerColor,
    });
  }

  _resolvePoint() {
    const s = this.shuttlecock;
    const inBounds = Court.isInBounds(s.x, s.z);

    let winner = null;
    let reason = '';

    // Item #2: Handle Net Faults
    if (s.hitNet) {
      if (s.lastHitter === 'player') {
        winner = 'opponent';
        reason = 'NET FAULT! POINT CPU!';
      } else {
        winner = 'player';
        reason = 'NET FAULT! POINT PLAYER!';
      }
    } else if (s.lastHitter === 'player') {
      if (inBounds && s.z > 0) {
        winner = 'player';
        reason = 'POINT PLAYER!';
      } else {
        winner = 'opponent';
        reason = 'OUT! POINT CPU!';
      }
    } else {
      if (inBounds && s.z < 0) {
        winner = 'opponent';
        reason = 'POINT CPU!';
      } else {
        winner = 'player';
        reason = 'OUT! POINT PLAYER!';
      }
    }

    const result = this.score.addPoint(winner);
    this.state = GAME_STATES.POINT_SCORED;
    this.bannerMessage = reason;
    this.bannerColor = winner === 'player' ? '#4ADE80' : '#EF4444';
    this.bannerTimer = 1.6;

    if (result.type === 'GAME_WON') {
      this.bannerMessage = result.winner === 'player' ? 'YOU WON THE GAME!' : `${this.opponent.name} WON THE GAME!`;
      this.bannerTimer = 2.2;
    } else if (result.type === 'MATCH_WON') {
      this.bannerMessage = result.winner === 'player' ? 'MATCH VICTORY!' : 'MATCH DEFEAT';
      this.bannerTimer = 2.5;
    }
  }
}
