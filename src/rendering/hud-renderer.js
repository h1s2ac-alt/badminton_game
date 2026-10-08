import { GAME_STATES } from '../utils/constants.js';

export class HUDRenderer {
  constructor(renderer) {
    this.r = renderer;
    this.prevPlayerScore = 0;
    this.prevOpponentScore = 0;
    this.playerFlashTimer = 0;
    this.opponentFlashTimer = 0;
  }

  render(gameState) {
    const ctx = this.r.ctx;
    const w = this.r.width;
    const h = this.r.height;
    const score = gameState.score;
    const player = gameState.player;

    if (!score) return;

    // --- Item #7: Score Flash Detection ---
    if (score.playerScore !== this.prevPlayerScore) {
      this.prevPlayerScore = score.playerScore;
      this.playerFlashTimer = 0.5; // 0.5s flash duration
    }
    if (score.opponentScore !== this.prevOpponentScore) {
      this.prevOpponentScore = score.opponentScore;
      this.opponentFlashTimer = 0.5;
    }

    const dt = 0.016; // approx frame time
    if (this.playerFlashTimer > 0) this.playerFlashTimer -= dt;
    if (this.opponentFlashTimer > 0) this.opponentFlashTimer -= dt;

    // --- 1. Top Scoreboard Pill ---
    const boardW = Math.min(w * 0.94, 520);
    const boardH = 50;
    const boardX = (w - boardW) / 2;
    const boardY = 16;

    ctx.save();
    // Glassmorphism dark background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boardX, boardY, boardW, boardH, [12]);
    ctx.fill();
    ctx.stroke();

    // Player Name & Score (with flash animation)
    ctx.font = '700 16px sans-serif';
    ctx.fillStyle = '#60A5FA'; // Player Blue
    ctx.textAlign = 'left';
    ctx.fillText('YOU', boardX + 20, boardY + 31);

    const pScale = this.playerFlashTimer > 0 ? 1.3 : 1.0;
    ctx.save();
    ctx.font = '900 22px monospace';
    ctx.fillStyle = this.playerFlashTimer > 0 ? '#4ADE80' : '#FFFFFF';
    ctx.translate(boardX + 75, boardY + 33);
    ctx.scale(pScale, pScale);
    ctx.fillText(`${score.playerScore}`, 0, 0);
    ctx.restore();

    // Games Count (Center)
    ctx.font = '600 12px sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText(`GAME ${score.currentGameNumber} (${score.playerGames}-${score.opponentGames})`, w / 2, boardY + 30);

    // Opponent Name & Score (with flash animation)
    ctx.font = '700 16px sans-serif';
    ctx.fillStyle = gameState.opponent ? gameState.opponent.shirtColor : '#EF4444';
    ctx.textAlign = 'right';
    ctx.fillText(gameState.opponent ? gameState.opponent.name.toUpperCase() : 'CPU', boardX + boardW - 20, boardY + 31);

    const oScale = this.opponentFlashTimer > 0 ? 1.3 : 1.0;
    ctx.save();
    ctx.font = '900 22px monospace';
    ctx.fillStyle = this.opponentFlashTimer > 0 ? '#F87171' : '#FFFFFF';
    ctx.translate(boardX + boardW - 145, boardY + 33);
    ctx.scale(oScale, oScale);
    ctx.fillText(`${score.opponentScore}`, 0, 0);
    ctx.restore();

    ctx.restore();

    // --- Item #4: Player Stamina Bar ---
    if (player) {
      const barW = 140;
      const barH = 10;
      const barX = 20;
      const barY = h - 30;

      ctx.save();
      // Background container
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, [5]);
      ctx.fill();
      ctx.stroke();

      // Fill bar
      const fillW = Math.max(0, barW * player.stamina);
      ctx.fillStyle = player.stamina < 0.3 ? '#EF4444' : '#3B82F6';
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, [5]);
      ctx.fill();

      // Label
      ctx.font = '700 11px sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.textAlign = 'left';
      ctx.fillText('STAMINA', barX, barY - 5);
      ctx.restore();
    }

    // --- 2. Action Prompts ---
    if (gameState.state === GAME_STATES.PRE_SERVE) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '800 22px sans-serif';
      ctx.fillStyle = '#FACC15';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;

      if (score.server === 'player') {
        ctx.fillText('PRESS SPACE / TAP TO SERVE', w / 2, h * 0.75);
      } else {
        ctx.fillText(`${gameState.opponent ? gameState.opponent.name : 'CPU'} IS SERVING...`, w / 2, h * 0.75);
      }
      ctx.restore();
    } else if (gameState.state === GAME_STATES.RALLY) {
      if (gameState.shuttlecock && gameState.shuttlecock.lastHitter === 'opponent' && gameState.shuttlecock.inFlight) {
        ctx.save();
        ctx.textAlign = 'center';

        const s = gameState.shuttlecock;
        const p = gameState.player;
        const canHit = (p && s.isHittableBy) ? s.isHittableBy('player', p) : false;
        const zTiming = p ? (s.z - p.z) : 0;
        const inSweetSpot = canHit && (zTiming >= -0.15 && zTiming <= 0.28);
        const isLate = canHit && (zTiming < -0.15);

        if (inSweetSpot) {
          ctx.font = '900 24px sans-serif';
          ctx.fillStyle = '#22C55E';
          ctx.shadowColor = '#15803D';
          ctx.shadowBlur = 12;
          ctx.fillText('⚡ SWEET SPOT! HIT NOW! ⚡', w / 2, h * 0.77);
        } else if (isLate) {
          ctx.font = '800 20px sans-serif';
          ctx.fillStyle = '#FB923C';
          ctx.shadowColor = '#C2410C';
          ctx.shadowBlur = 8;
          ctx.fillText('HIT LATE!', w / 2, h * 0.77);
        } else {
          ctx.font = '700 17px sans-serif';
          ctx.fillStyle = '#67E8F9';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 6;
          ctx.fillText('PRESS SPACE / TAP TO SWING', w / 2, h * 0.78);
        }
        ctx.restore();
      }
    }

    // --- 3. Controls Hint Badge (Bottom Right) ---
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    const badgeW = 264;
    const badgeH = 26;
    const badgeX = w - badgeW - 20;
    const badgeY = h - 35;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, [8]);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 11px sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / ARROWS : Footwork  •  SPACE : Swing', badgeX + badgeW / 2, badgeY + 17);
    ctx.restore();

    // --- 4. Round Result Banner ---
    if (gameState.bannerMessage) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, h * 0.4, w, 80);

      ctx.font = '900 28px sans-serif';
      ctx.fillStyle = gameState.bannerColor || '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(gameState.bannerMessage, w / 2, h * 0.4 + 48);
      ctx.restore();
    }
  }
}
