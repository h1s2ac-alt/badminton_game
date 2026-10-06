export class CharacterRenderer {
  constructor(renderer) {
    this.r = renderer;
  }

  render(character) {
    const ctx = this.r.ctx;

    const pGround = this.r.project(character.x, 0, character.z);
    if (!pGround.visible) return;

    const scale    = pGround.scale;
    const isPlayer = character.role === 'player';

    // ── Clean Nintendo Proportions (big head, simple body) ──────────────────
    const S          = scale / 40;
    const headR      = 22 * S;
    const torsoW     = 20 * S;
    const torsoH     = 28 * S;
    const shortH     = 11 * S;
    const legLen     = 20 * S;
    const shoeW      = 11 * S;
    const shoeH      =  5 * S;
    const armW       = Math.max(3, 7 * S); // thick rounded limbs

    const screenX    = pGround.x;
    const screenY    = pGround.y;

    const footY      = screenY - 2 * S;
    const shortBotY  = footY - legLen;
    const shortTopY  = shortBotY - shortH;
    const torsoBotY  = shortTopY;
    const torsoTopY  = torsoBotY - torsoH;
    const headCenterY = torsoTopY - headR * 0.72;

    // ── Colors ──────────────────────────────────────────────────────────────
    const teamColor  = isPlayer ? '#3B82F6' : '#EF4444';
    const teamDark   = isPlayer ? '#2563EB' : '#DC2626';
    const skinColor  = '#FDDBC8';
    const skinDark   = '#E8A878';
    const hairColor  = isPlayer ? '#3D2407' : '#C8A060';
    const shortColor = isPlayer ? '#60A5FA' : '#F87171';

    // ── Ground Shadow (circular, flat) ──────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, torsoW * 0.9, torsoW * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Swing Animation ─────────────────────────────────────────────────────
    const SWING_DUR    = character.swingDuration || 0.55;
    const swingElapsed = SWING_DUR - (character.animTimer || 0);
    const swingT       = SWING_DUR > 0 ? swingElapsed / SWING_DUR : 0;

    let armAngle;
    if (character.animState !== 'SWINGING') {
      armAngle = isPlayer ? -Math.PI * 0.28 : Math.PI * 0.28;
    } else {
      if (swingT < 0.25) {
        const p = swingT / 0.25;
        const backAngle = isPlayer ? Math.PI * 0.55 : -Math.PI * 0.55;
        const restAngle = isPlayer ? -Math.PI * 0.28 : Math.PI * 0.28;
        armAngle = restAngle + p * (backAngle - restAngle);
      } else if (swingT < 0.55) {
        const p = (swingT - 0.25) / 0.30;
        const backAngle   = isPlayer ? Math.PI * 0.55 : -Math.PI * 0.55;
        const strikeAngle = isPlayer ? -Math.PI * 0.7 : Math.PI * 0.7;
        armAngle = backAngle + p * (strikeAngle - backAngle);
      } else {
        const p = (swingT - 0.55) / 0.45;
        const strikeAngle = isPlayer ? -Math.PI * 0.7 : Math.PI * 0.7;
        const restAngle   = isPlayer ? -Math.PI * 0.28 : Math.PI * 0.28;
        armAngle = strikeAngle + p * (restAngle - strikeAngle);
      }
    }
    if (character.animState === 'WHIFF')   armAngle = isPlayer ? Math.PI * 0.82 : -Math.PI * 0.82;
    if (character.animState === 'STUMBLE') armAngle = isPlayer ? -Math.PI * 0.7  : Math.PI * 0.7;

    let legSwing = 0;
    if (character.animState === 'RUNNING') {
      legSwing = Math.sin(character.runAnimTime * 14) * 5 * S;
    }

    // ── Legs (simple thick rounded strokes) ──────────────────────────────────
    ctx.strokeStyle = skinColor;
    ctx.lineWidth = armW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(screenX - torsoW * 0.24, shortBotY);
    ctx.lineTo(screenX - torsoW * 0.26 + legSwing, footY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(screenX + torsoW * 0.24, shortBotY);
    ctx.lineTo(screenX + torsoW * 0.26 - legSwing, footY);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Shoes (simple dark rounded rects) ────────────────────────────────────
    const drawShoe = (cx, cy) => {
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.roundRect(cx - shoeW * 0.55, cy - shoeH * 0.4, shoeW * 1.1, shoeH * 1.1, [shoeH * 0.5]);
      ctx.fill();
      // White sole line
      ctx.fillStyle = '#DDDDDD';
      ctx.beginPath();
      ctx.roundRect(cx - shoeW * 0.5, cy + shoeH * 0.3, shoeW, shoeH * 0.25, [shoeH * 0.12]);
      ctx.fill();
    };

    drawShoe(screenX - torsoW * 0.26 + legSwing, footY + 2 * S);
    drawShoe(screenX + torsoW * 0.26 - legSwing, footY + 2 * S);

    // ── Shorts (clean solid with subtle gradient) ────────────────────────────
    const shortGrad = ctx.createLinearGradient(0, shortTopY, 0, shortBotY);
    shortGrad.addColorStop(0, shortColor);
    shortGrad.addColorStop(1, teamDark);
    ctx.fillStyle = shortGrad;
    ctx.beginPath();
    ctx.roundRect(screenX - torsoW * 0.54, shortTopY, torsoW * 1.08, shortH, [4 * S, 4 * S, 0, 0]);
    ctx.fill();

    // ── Torso (white shirt with clean gradient) ──────────────────────────────
    const torsoGrad = ctx.createLinearGradient(screenX - torsoW / 2, torsoTopY, screenX + torsoW / 2, torsoBotY);
    torsoGrad.addColorStop(0,   '#FFFFFF');
    torsoGrad.addColorStop(0.5, '#F0F2F8');
    torsoGrad.addColorStop(1,   '#D8DEE8');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.roundRect(screenX - torsoW / 2, torsoTopY, torsoW, torsoH, [5 * S]);
    ctx.fill();

    // Collar stripe (team color band at top)
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.roundRect(screenX - torsoW / 2, torsoTopY, torsoW, 5 * S, [5 * S, 5 * S, 0, 0]);
    ctx.fill();

    // Subtle shirt outline
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.2 * S;
    ctx.beginPath();
    ctx.roundRect(screenX - torsoW / 2, torsoTopY, torsoW, torsoH, [5 * S]);
    ctx.stroke();

    // ── Free Arm (simple thick stroke) ───────────────────────────────────────
    let freeArmAngle;
    if (character.animState === 'STUMBLE') {
      freeArmAngle = isPlayer ? Math.PI * 0.7 : -Math.PI * 0.7;
    } else {
      freeArmAngle = isPlayer
        ? Math.PI * 0.22 + (character.animState === 'RUNNING' ? Math.sin(character.runAnimTime * 14) * 0.3 : 0)
        : -Math.PI * 0.22 + (character.animState === 'RUNNING' ? Math.sin(character.runAnimTime * 14) * 0.3 : 0);
    }
    const freeArmSide   = isPlayer ? -1 : 1;
    const freeShoulderX = screenX + freeArmSide * torsoW * 0.44;
    const freeShoulderY = torsoTopY + torsoH * 0.14;
    const freeHandX     = freeShoulderX + Math.cos(freeArmAngle + (isPlayer ? Math.PI : 0)) * 16 * S;
    const freeHandY     = freeShoulderY + Math.sin(freeArmAngle + (isPlayer ? Math.PI : 0)) * 16 * S;

    ctx.strokeStyle = skinColor;
    ctx.lineWidth = armW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(freeShoulderX, freeShoulderY);
    ctx.lineTo(freeHandX, freeHandY);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Racket Arm (simple thick stroke) ─────────────────────────────────────
    const racketSide  = isPlayer ? 1 : -1;
    const shoulderX   = screenX + racketSide * torsoW * 0.44;
    const shoulderY   = torsoTopY + torsoH * 0.14;
    const handX       = shoulderX + Math.cos(armAngle) * 20 * S;
    const handY       = shoulderY + Math.sin(armAngle) * 20 * S;

    ctx.strokeStyle = skinColor;
    ctx.lineWidth = armW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(handX, handY);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Racket (simple pink/magenta oval on a stick) ─────────────────────────
    const racketLen = 34 * S;
    const rHeadX    = handX + Math.cos(armAngle) * racketLen;
    const rHeadY    = handY + Math.sin(armAngle) * racketLen;

    // Shaft
    ctx.strokeStyle = '#654321';
    ctx.lineWidth   = Math.max(2, 3 * S);
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(rHeadX, rHeadY);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Head frame (pink oval)
    const rW = 10 * S;
    const rH = 14 * S;
    ctx.strokeStyle = '#E91E8C';
    ctx.lineWidth = Math.max(2, 3 * S);
    ctx.beginPath();
    ctx.ellipse(rHeadX, rHeadY, rW, rH, armAngle, 0, Math.PI * 2);
    ctx.stroke();

    // Strings (simple cross-hatch inside)
    ctx.save();
    ctx.translate(rHeadX, rHeadY);
    ctx.rotate(armAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rW, rH, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(0.5, 0.8 * S);
    for (let si = -2; si <= 2; si++) {
      ctx.beginPath();
      ctx.moveTo(si * rW * 0.42, -rH);
      ctx.lineTo(si * rW * 0.42,  rH);
      ctx.stroke();
    }
    for (let si = -3; si <= 3; si++) {
      ctx.beginPath();
      ctx.moveTo(-rW, si * rH * 0.3);
      ctx.lineTo( rW, si * rH * 0.3);
      ctx.stroke();
    }
    ctx.restore();

    // ── Head (big, round, clean smooth gradient) ─────────────────────────────
    const headGrad = ctx.createRadialGradient(
      screenX - headR * 0.28, headCenterY - headR * 0.3, headR * 0.05,
      screenX, headCenterY, headR
    );
    headGrad.addColorStop(0,    '#FFF2E8');
    headGrad.addColorStop(0.45, '#FDDBC8');
    headGrad.addColorStop(0.85, '#E8A878');
    headGrad.addColorStop(1,    '#D08858');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(screenX, headCenterY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Subtle head outline
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.2 * S;
    ctx.beginPath();
    ctx.arc(screenX, headCenterY, headR, 0, Math.PI * 2);
    ctx.stroke();

    // ── Hair (simple solid cap) ──────────────────────────────────────────────
    if (isPlayer) {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.ellipse(screenX, headCenterY - headR * 0.58, headR * 0.9, headR * 0.52, 0, Math.PI, 0);
      ctx.fill();
      // Side hair tufts
      ctx.beginPath();
      ctx.ellipse(screenX - headR * 0.82, headCenterY - headR * 0.1, headR * 0.18, headR * 0.35, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(screenX + headR * 0.82, headCenterY - headR * 0.1, headR * 0.18, headR * 0.35, 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.ellipse(screenX, headCenterY - headR * 0.52, headR * 0.92, headR * 0.55, 0, Math.PI, 0);
      ctx.fill();
      // Slightly longer side hair for opponent
      ctx.beginPath();
      ctx.ellipse(screenX - headR * 0.85, headCenterY - headR * 0.05, headR * 0.18, headR * 0.42, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(screenX + headR * 0.85, headCenterY - headR * 0.05, headR * 0.18, headR * 0.42, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Eyes (simple black ovals — classic Mii style) ────────────────────────
    const eyeOff = headR * 0.3;
    const eyeY   = headCenterY + headR * 0.05;
    const eyeW   = 3 * S;
    const eyeH   = 4.5 * S;

    ctx.fillStyle = '#1A1A2E';
    ctx.beginPath();
    ctx.ellipse(screenX - eyeOff, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.ellipse(screenX + eyeOff, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights (tiny white dot, top-left of each eye)
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(screenX - eyeOff - 1 * S, eyeY - 1.5 * S, 1.3 * S, 0, Math.PI * 2);
    ctx.arc(screenX + eyeOff - 1 * S, eyeY - 1.5 * S, 1.3 * S, 0, Math.PI * 2);
    ctx.fill();

    // ── Mouth (simple friendly arc) ──────────────────────────────────────────
    ctx.strokeStyle = '#A0604A';
    ctx.lineWidth = Math.max(1, 1.8 * S);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(screenX, headCenterY + headR * 0.38, headR * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Cheek blush ──────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,150,130,0.28)';
    ctx.beginPath();
    ctx.ellipse(screenX - headR * 0.5, headCenterY + headR * 0.22, headR * 0.18, headR * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(screenX + headR * 0.5, headCenterY + headR * 0.22, headR * 0.18, headR * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
