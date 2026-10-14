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
    this._shotCooldown = 0; // Prevents hitting own shot twice
    this._whiffDebounce = 0; // Quick debounce for key chatter on air swings
    this._pendingSwipe = null; // Stores swipe data for active swing frame detection
    this._isServe = false; // Tracks if current in-flight shot is a serve

    this._bindInput();
  }

  _bindInput() {
    this.input.onSwipe((swipe) => this._handlePlayerSwipe(swipe));
    this.input.onTap(() => this._handlePlayerAction());
  }

  _handlePlayerAction() {
    if (this.state === GAME_STATES.PRE_SERVE) {
      if (this.score.server === 'player') {
        if (this._shotCooldown > 0) return;
        const aim = this.input.getAimDirection();
        const serveShotType = (aim.aimZ > 0) ? SHOT_TYPES.SERVE_HIGH : SHOT_TYPES.SERVE_SHORT;
        const sideBias = aim.aimX !== 0 ? (aim.aimX * 0.75) : 0;
        this._executePlayerShot({ shotType: serveShotType, power: 0.88, sideBias }, true);
        this.state = GAME_STATES.RALLY;
        this._shotCooldown = 0.28;
      }
      return;
    }

    if (this.state === GAME_STATES.RALLY) {
      this._handlePlayerSwing();
    }
  }

  _handlePlayerSwing(swipe = null) {
    if (this.state !== GAME_STATES.RALLY) return;

    // Check if shuttlecock is in hittable range right now
    if (this.shuttlecock.isHittableBy('player', this.player)) {
      if (this._shotCooldown > 0) return;
      this._resolvePlayerHit(swipe);
    } else {
      // Initiate swing immediately!
      // If player is aiming with Arrow Up and bird is overhead, cue smash!
      const aim = this.input.getAimDirection();
      let shotType = swipe ? swipe.shotType : SHOT_TYPES.CLEAR;
      if (aim.aimZ > 0 && this.shuttlecock.y > 1.7) {
        shotType = SHOT_TYPES.SMASH;
      } else if (aim.aimZ < 0) {
        shotType = SHOT_TYPES.DROP;
      }
      this.player.triggerSwing(shotType);
      this._pendingSwipe = swipe;
      this._whiffDebounce = 0.12;
    }
  }

  _resolvePlayerHit(swipe = null) {
    const aim = this.input.getAimDirection();
    const dx = this.shuttlecock.x - this.player.x;
    const dz = this.shuttlecock.z - this.player.z;
    const dist = Math.hypot(dx, dz);
    const zTiming = this.shuttlecock.z - this.player.z;

    let quality = 'GOOD';
    let sideBias = 0;
    let timingLabel = 'GOOD!';
    let timingColor = '#4ADE80';
    let shotType = swipe ? swipe.shotType : SHOT_TYPES.CLEAR;

    // Check timing quality
    if (zTiming > 0.25) {
      sideBias = (this.player.x >= 0 ? -1 : 1) * 0.80;
      timingLabel = 'EARLY!';
      timingColor = '#06B6D4';
    } else if (zTiming >= -0.20) {
      quality = 'PERFECT';
      sideBias = (this.opponent.x >= 0 ? -1 : 1) * 0.75;
      timingLabel = 'PERFECT!';
      timingColor = '#FACC15';
    } else if (zTiming >= -0.50) {
      sideBias = (this.player.x >= 0 ? 1 : -1) * 0.74;
      timingLabel = 'LATE!';
      timingColor = '#FB923C';
    } else {
      quality = 'POOR';
      sideBias = (Math.random() - 0.5) * 0.4;
      shotType = SHOT_TYPES.CLEAR;
      timingLabel = 'TOO LATE!';
      timingColor = '#EF4444';
    }

    // ARROW KEYS DIRECTIONAL OVERRIDE (Takes priority if player directs shot)
    if (aim.active) {
      // 1. Horizontal Direction (Left / Right Arrow)
      if (aim.aimX < 0) {
        sideBias = -0.85; // Directed to Left court
      } else if (aim.aimX > 0) {
        sideBias = 0.85; // Directed to Right court
      }

      // 2. Depth / Shot Placement (Up / Down Arrow)
      if (aim.aimZ > 0) {
        // Arrow UP: Aggressive overhead Jump Smash or deep Baseline Clear
        if (this.shuttlecock.y > 1.65 && dist < 1.55) {
          shotType = SHOT_TYPES.SMASH;
          timingLabel = aim.aimX !== 0 ? (aim.aimX < 0 ? 'SMASH ◀ LEFT!' : 'SMASH ▶ RIGHT!') : 'JUMP SMASH!';
          timingColor = '#FF3C28';
        } else {
          shotType = SHOT_TYPES.CLEAR;
          timingLabel = aim.aimX !== 0 ? (aim.aimX < 0 ? 'CLEAR ◀ LEFT' : 'CLEAR ▶ RIGHT') : 'DEEP CLEAR!';
          timingColor = '#38BDF8';
        }
      } else if (aim.aimZ < 0) {
        // Arrow DOWN: Drop shot or tight Net shot
        if (this.shuttlecock.z > -2.5 || this.shuttlecock.y < 1.3) {
          shotType = SHOT_TYPES.NET;
          timingLabel = aim.aimX !== 0 ? (aim.aimX < 0 ? 'NET ◀ LEFT' : 'NET ▶ RIGHT') : 'NET SHOT!';
          timingColor = '#22C55E';
        } else {
          shotType = SHOT_TYPES.DROP;
          timingLabel = aim.aimX !== 0 ? (aim.aimX < 0 ? 'DROP ◀ LEFT' : 'DROP ▶ RIGHT') : 'DROP SHOT!';
          timingColor = '#4ADE80';
        }
      } else if (aim.aimX !== 0) {
        // Only Left/Right pressed
        if (this.shuttlecock.y > 1.85 && dist < 1.45) {
          shotType = SHOT_TYPES.SMASH;
          timingLabel = aim.aimX < 0 ? 'SMASH ◀ LEFT!' : 'SMASH ▶ RIGHT!';
          timingColor = '#FF3C28';
        } else {
          shotType = SHOT_TYPES.DRIVE;
          timingLabel = aim.aimX < 0 ? 'DRIVE ◀ LEFT' : 'DRIVE ▶ RIGHT';
          timingColor = '#38BDF8';
        }
      }
    } else if (!swipe) {
      // Natural context if no arrow key or swipe provided
      if (quality === 'PERFECT' && this.shuttlecock.y > 1.85 && dist < 1.45) {
        shotType = SHOT_TYPES.SMASH;
        timingLabel = 'JUMP SMASH!';
        timingColor = '#FF3C28';
      } else if (this.shuttlecock.z > -2.2) {
        shotType = SHOT_TYPES.DROP;
      }
    }

    const power = swipe ? swipe.power : (quality === 'PERFECT' ? 1.08 : 0.95);
    const finalSideBias = (swipe && swipe.sideBias !== undefined && !aim.active) ? swipe.sideBias : sideBias;

    this.player.hasConnected = true;
    this._pendingSwipe = null;

    this._executePlayerShot({
      shotType,
      power,
      sideBias: finalSideBias,
    }, false, quality, timingLabel, timingColor);

    this._shotCooldown = 0.32;
    this._whiffDebounce = 0;
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
      this.player.animState = 'SERVE_READY';
      this.shuttlecock.reset({ x: this.player.x - 0.18, y: 1.05, z: this.player.z + 0.32 });
      
      this.opponent.x = receiverPos.x;
      this.opponent.z = receiverPos.z;
      this.opponent.animState = 'RECEIVE_READY';
    } else {
      this.opponent.x = serverPos.x;
      this.opponent.z = serverPos.z;
      this.opponent.animState = 'SERVE_READY';
      this.shuttlecock.reset({ x: this.opponent.x + 0.18, y: 1.05, z: this.opponent.z - 0.32 });
      
      this.player.x = receiverPos.x;
      this.player.z = receiverPos.z;
      this.player.animState = 'RECEIVE_READY';
    }

    this.ai.reset();
    this.state = GAME_STATES.PRE_SERVE;
    this.serveTimer = 0;
  }

  _handlePlayerSwipe(swipe) {
    if (this.state === GAME_STATES.PRE_SERVE) {
      if (this.score.server === 'player') {
        if (this._shotCooldown > 0) return;
        const serveShotType = (swipe.shotType === SHOT_TYPES.CLEAR)
          ? SHOT_TYPES.SERVE_HIGH
          : SHOT_TYPES.SERVE_SHORT;
        swipe.shotType = serveShotType;
        this._executePlayerShot(swipe, true);
        this.state = GAME_STATES.RALLY;
        this._shotCooldown = 0.28;
      }
      return;
    }

    if (this.state === GAME_STATES.RALLY) {
      this._handlePlayerSwing(swipe);
    }
  }

  _executePlayerShot(swipe, isServe = false, quality = 'GOOD', timingLabel = null, timingColor = null) {
    if (quality === 'POOR' && !isServe) {
      this.player.triggerStumble(); // Stumble mechanic (slowdown, still plays swing)
      swipe.shotType = SHOT_TYPES.CLEAR; 
      swipe.power = 0.6;
    } else {
      this.player.triggerSwing(swipe.shotType);
    }

    // Consume stamina based on shot type
    let staminaCost = 0.05;
    if (swipe.shotType === SHOT_TYPES.SMASH) staminaCost = 0.15;
    else if (swipe.shotType === SHOT_TYPES.CLEAR) staminaCost = 0.08;
    this.player.consumeStamina(staminaCost);

    // Apply stamina penalty to power if exhausted, boost for PERFECT
    const staminaPowerMult = this.player.stamina < 0.25 ? 0.7 : 1.0;
    const qualityMult = quality === 'PERFECT' ? 1.15 : (quality === 'POOR' ? 0.7 : 1.0);
    const finalPower = swipe.power * staminaPowerMult * qualityMult;

    // Diagonal Serve & Aiming rules
    let targetX;
    if (isServe) {
      // Must serve to diagonal opposite court
      const serveDir = this.player.x > 0 ? -1 : 1;
      const biasOffset = (swipe.sideBias || 0) * 0.8; // -0.8 to 0.8
      targetX = (serveDir * Court.HALF_WIDTH / 2) + (biasOffset * Court.HALF_WIDTH / 2);
    } else {
      targetX = (swipe.sideBias || 0) * (Court.HALF_WIDTH * 0.85);
      if (Math.abs(targetX) < 0.2) {
        targetX = (Math.random() - 0.5) * Court.HALF_WIDTH * 0.8;
      }
    }

    let targetZ = COURT.HALF_LENGTH - 0.8; // default deep
    if (isServe) {
      // Short backhand serve lands right past the short service line (COURT.SHORT_SERVICE_DIST + 0.45)
      // High underhand clear serve lands deep near back boundary line (COURT.BASELINE_OPPONENT - 0.5)
      targetZ = (swipe.shotType === SHOT_TYPES.SERVE_HIGH)
        ? (COURT.BASELINE_OPPONENT - 0.5)
        : (COURT.SHORT_SERVICE_DIST + 0.45);
    } else if (swipe.shotType === SHOT_TYPES.DROP || swipe.shotType === SHOT_TYPES.NET) {
      targetZ = COURT.SHORT_SERVICE_DIST + 0.5;
    } else if (swipe.shotType === SHOT_TYPES.SMASH) {
      targetZ = 3.2;
    }

    // Add subtle aim variance for POOR hits
    if (quality === 'POOR') {
      targetX += (Math.random() - 0.5) * 1.5;
      targetZ += (Math.random() - 0.5) * 1.5;
    }

    // Launch from waist level (1.05m) on serves below waist height (authentic legal badminton serve)
    const startPos = isServe
      ? { x: this.player.x - 0.18, y: 1.05, z: this.player.z + 0.32 }
      : { x: this.shuttlecock.x, y: Math.max(0.4, this.shuttlecock.y), z: this.shuttlecock.z };
    const targetPos = { x: targetX, y: 0, z: targetZ };

    const shotType = isServe ? swipe.shotType : swipe.shotType;
    this._isServe = isServe;
    this.shuttlecock.launch(shotType, startPos, targetPos, finalPower, 'player', quality);

    // Impact particles for every hit; text + shake only for smashes
    const isSmash = swipe.shotType === SHOT_TYPES.SMASH;
    this.renderer.effectsRenderer.addImpact(
      startPos,
      isSmash ? '#FF4020' : (quality === 'PERFECT' ? '#FACC15' : '#4ADE80'),
      isSmash ? 1.4 : 0.75
    );
    if (isSmash) {
      this.renderer.effectsRenderer.addHitText(startPos, timingLabel || 'SMASH!', '#FF4020');
      this.renderer.effectsRenderer.triggerShake(1.2);
      this.freezeFrames = 0.08; // Hit-stop freeze frame!
    } else if (isServe) {
      const serveLabel = (shotType === SHOT_TYPES.SERVE_HIGH) ? 'HIGH SERVE!' : 'SHORT SERVE!';
      this.renderer.effectsRenderer.addHitText(startPos, serveLabel, '#FACC15');
    } else if (timingLabel) {
      this.renderer.effectsRenderer.addHitText(startPos, timingLabel, timingColor || '#4ADE80');
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
    const isServeShot = (aiShot.shotType === SHOT_TYPES.SERVE || aiShot.shotType === SHOT_TYPES.SERVE_SHORT || aiShot.shotType === SHOT_TYPES.SERVE_HIGH);
    if (rand < 0.2) quality = 'PERFECT';
    else if (rand > 0.85) quality = 'POOR';

    if (quality === 'POOR' && !isServeShot) {
      this.opponent.triggerStumble();
      aiShot.shotType = SHOT_TYPES.CLEAR;
      aiShot.power *= 0.7;
    } else {
      this.opponent.triggerSwing(aiShot.shotType);
    }

    this._isServe = isServeShot;

    const startPos = isServeShot
      ? { x: this.opponent.x + 0.18, y: 1.05, z: this.opponent.z - 0.32 }
      : { x: this.shuttlecock.x, y: Math.max(0.4, this.shuttlecock.y), z: this.shuttlecock.z };
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

    // Tick down shot cooldown & whiff debounce
    if (this._shotCooldown > 0) {
      this._shotCooldown = Math.max(0, this._shotCooldown - dt);
    }
    if (this._whiffDebounce > 0) {
      this._whiffDebounce = Math.max(0, this._whiffDebounce - dt);
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

    const moveInput = this.input.getMovementVector();

    if (this.state === GAME_STATES.PRE_SERVE) {
      if (this.score.server === 'player') {
        this.player.animState = 'SERVE_READY';
        this.opponent.animState = 'RECEIVE_READY';
        // Shuttlecock held steady in player's forward left hand
        this.shuttlecock.x = this.player.x - 0.18;
        this.shuttlecock.y = 1.05;
        this.shuttlecock.z = this.player.z + 0.32;
        this.player.update(dt, null, false, moveInput);
        this.opponent.update(dt);
      } else {
        this.opponent.animState = 'SERVE_READY';
        this.player.animState = 'RECEIVE_READY';
        // Shuttlecock held steady in opponent's forward hand
        this.shuttlecock.x = this.opponent.x + 0.18;
        this.shuttlecock.y = 1.05;
        this.shuttlecock.z = this.opponent.z - 0.32;
        this.player.update(dt, null, false, moveInput);
        this.opponent.update(dt);

        this.serveTimer += dt;
        if (this.serveTimer >= 1.2) {
          const aiServeType = Math.random() < 0.65 ? SHOT_TYPES.SERVE_SHORT : SHOT_TYPES.SERVE_HIGH;
          const targetZ = (aiServeType === SHOT_TYPES.SERVE_HIGH)
            ? (Court.BASELINE_PLAYER + 0.5)
            : (-COURT.SHORT_SERVICE_DIST - 0.45);
          const serveDir = this.opponent.x > 0 ? -1 : 1;
          const targetX = (serveDir * Court.HALF_WIDTH / 2) + (Math.random() - 0.5) * 0.8;

          this.opponent.triggerSwing(aiServeType);
          this._executeAIShot({
            shotType: aiServeType,
            targetPos: { x: targetX, y: 0, z: targetZ },
            power: aiServeType === SHOT_TYPES.SERVE_HIGH ? 0.95 : 0.85,
          });
          this.state = GAME_STATES.RALLY;
        }
      }
    } else if (this.state === GAME_STATES.RALLY) {
      this.shuttlecock.update(dt);
      this.player.update(dt, this.shuttlecock, true, moveInput);
      this.opponent.update(dt);

      // Active swing frame collision check:
      // While the player is actively swinging, intercept the shuttlecock as soon as it enters reach
      if (this.player.animState === 'SWINGING' && !this.player.hasConnected && this._shotCooldown <= 0) {
        const dur = this.player.swingDuration || 0.52;
        const elapsed = dur - (this.player.animTimer || 0);
        const t = dur > 0 ? (elapsed / dur) : 0;
        // Contact window is active between 8% and 75% of the swing animation
        if (t >= 0.08 && t <= 0.75) {
          if (this.shuttlecock.isHittableBy('player', this.player)) {
            this._resolvePlayerHit(this._pendingSwipe);
          }
        }
      }

      this.ai.update(dt, this.shuttlecock, this.player, (aiShot) => this._executeAIShot(aiShot));

      if (this.shuttlecock.landed) {
        this._resolvePoint();
      }
    } else if (this.state === GAME_STATES.POINT_SCORED) {
      this.player.update(dt, null, false, null);
      this.opponent.update(dt);
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
    }, dt);
  }

  _resolvePoint() {
    const s = this.shuttlecock;
    const inBounds = Court.isInBounds(s.x, s.z);

    let winner = null;
    let reason = '';

    // 1. Net Faults
    if (s.hitNet) {
      if (s.lastHitter === 'player') {
        winner = 'opponent';
        reason = 'NET FAULT! POINT CPU!';
      } else {
        winner = 'player';
        reason = 'NET FAULT! POINT PLAYER!';
      }
    }
    // 2. Player was last hitter
    else if (s.lastHitter === 'player') {
      if (s.z <= 0) {
        // Landed on player's own half of court
        winner = 'opponent';
        reason = 'FAULT! POINT CPU!';
      } else if (!inBounds) {
        // Flew beyond boundaries
        winner = 'opponent';
        reason = 'OUT! POINT CPU!';
      } else if (this._isServe && s.z < COURT.SHORT_SERVICE_DIST) {
        // Serve failed to cross the short service line (kitchen fault)
        winner = 'opponent';
        reason = 'SHORT SERVE! POINT CPU!';
      } else {
        winner = 'player';
        reason = 'POINT PLAYER!';
      }
    }
    // 3. Opponent was last hitter
    else {
      if (s.z >= 0) {
        // Landed on opponent's own half of court
        winner = 'player';
        reason = 'FAULT! POINT PLAYER!';
      } else if (!inBounds) {
        // Flew beyond boundaries
        winner = 'player';
        reason = 'OUT! POINT PLAYER!';
      } else if (this._isServe && s.z > -COURT.SHORT_SERVICE_DIST) {
        // Opponent serve failed to cross short service line
        winner = 'player';
        reason = 'SHORT SERVE! POINT PLAYER!';
      } else {
        winner = 'opponent';
        reason = 'POINT CPU!';
      }
    }

    const result = this.score.addPoint(winner);
    this.state = GAME_STATES.POINT_SCORED;
    this.bannerMessage = reason;
    this.bannerColor = winner === 'player' ? '#4ADE80' : '#EF4444';
    this.bannerTimer = 1.6;

    // Trigger celebration & disappointment animations
    if (winner === 'player') {
      this.player.triggerCelebrate();
      this.opponent.triggerDisappointed();
    } else if (winner === 'opponent') {
      this.player.triggerDisappointed();
      this.opponent.triggerCelebrate();
    }

    if (result.type === 'GAME_WON') {
      this.bannerMessage = result.winner === 'player' ? 'YOU WON THE GAME!' : `${this.opponent.name} WON THE GAME!`;
      this.bannerTimer = 2.2;
    } else if (result.type === 'MATCH_WON') {
      this.bannerMessage = result.winner === 'player' ? 'MATCH VICTORY!' : 'MATCH DEFEAT';
      this.bannerTimer = 2.5;
    }
  }
}
