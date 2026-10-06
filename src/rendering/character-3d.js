import * as THREE from 'three';

export class Character3D {
  constructor(scene, role = 'player') {
    this.scene = scene;
    this.role = role;
    this.isPlayer = role === 'player';

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Color definitions
    this.teamColor = this.isPlayer ? 0x3B82F6 : 0xEF4444;
    this.teamDark  = this.isPlayer ? 0x1D4ED8 : 0xB91C1C;
    this.shortColor = this.isPlayer ? 0x60A5FA : 0xF87171;
    this.skinColor = 0xFDDBC8;
    this.hairColor = this.isPlayer ? 0x3D2407 : 0xD4A346; // Rich dark brown for player, golden blonde for opponent
    this.racketFrameColor = 0xE91E8C; // Wii-style vibrant pink racket

    this._initMaterials();
    this._buildModel();
  }

  _generateShirtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Clean white athletic jersey fabric
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle athletic side panels in team color
    ctx.fillStyle = this.isPlayer ? '#3B82F6' : '#EF4444';
    ctx.fillRect(0, 80, 48, 432);
    ctx.fillRect(512 - 48, 80, 48, 432);

    // V-neck collar band at top
    ctx.fillStyle = this.isPlayer ? '#2563EB' : '#DC2626';
    ctx.fillRect(0, 0, 512, 50);

    // Player Number on the back (texture is wrapped around cylinder: back is at x=0 & 512, front is at x=256)
    ctx.fillStyle = this.isPlayer ? '#2563EB' : '#DC2626';
    ctx.font = '900 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Back number (centered around the seam x=0 / x=512)
    ctx.fillText(this.isPlayer ? '7' : '1', 512, 280);
    ctx.fillText(this.isPlayer ? '7' : '1', 0, 280);

    // Front badge (centered at x=256)
    ctx.fillStyle = this.isPlayer ? '#3B82F6' : '#EF4444';
    ctx.beginPath();
    ctx.arc(210, 180, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 24px sans-serif';
    ctx.fillText('WII', 210, 180);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  _initMaterials() {
    this.skinMat = new THREE.MeshToonMaterial({ color: this.skinColor });
    this.shirtMat = new THREE.MeshToonMaterial({
      map: this._generateShirtTexture(),
    });
    this.shortMat = new THREE.MeshToonMaterial({ color: this.shortColor });
    this.hairMat = new THREE.MeshToonMaterial({ color: this.hairColor });
    this.shoeMat = new THREE.MeshToonMaterial({ color: 0x1E1E24 });
    this.soleMat = new THREE.MeshToonMaterial({ color: 0xF8FAFC });
    this.sweatbandMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0x111122 });
    this.shineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    this.blushMat = new THREE.MeshBasicMaterial({ color: 0xFFA090, transparent: true, opacity: 0.65 });
    this.racketGripMat = new THREE.MeshToonMaterial({ color: 0x5C381E });
    this.racketShaftMat = new THREE.MeshToonMaterial({ color: 0x222222 });
    this.racketFrameMat = new THREE.MeshToonMaterial({ color: this.racketFrameColor });
    this.stringMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.swooshMat = new THREE.MeshBasicMaterial({
      color: 0x60A5FA,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
  }

  _buildHair() {
    const hairGroup = new THREE.Group();

    // 1. Crown & Top Dome
    const crownGeo = new THREE.SphereGeometry(0.292, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const crown = new THREE.Mesh(crownGeo, this.hairMat);
    crown.castShadow = true;
    hairGroup.add(crown);

    // 2. Full Back Hair Mass (Crucial: covers entire -Z back of head seen by camera!)
    // phiStart = Math.PI, phiLength = Math.PI covers Z <= 0 (the whole back half)
    // thetaLength = Math.PI * 0.78 extends all the way down to nape of neck
    const backGeo = new THREE.SphereGeometry(0.295, 24, 20, Math.PI, Math.PI, 0, Math.PI * 0.78);
    const backHair = new THREE.Mesh(backGeo, this.hairMat);
    backHair.castShadow = true;
    hairGroup.add(backHair);

    // 3. Front Bangs framing the forehead
    const bangsGeo = new THREE.SphereGeometry(0.292, 20, 12, 0, Math.PI, Math.PI * 0.12, Math.PI * 0.32);
    const bangs = new THREE.Mesh(bangsGeo, this.hairMat);
    bangs.castShadow = true;
    hairGroup.add(bangs);

    // 4. Side locks / sideburns framing the ears
    const sideGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const leftSide = new THREE.Mesh(sideGeo, this.hairMat);
    leftSide.scale.set(0.65, 1.6, 0.85);
    leftSide.position.set(0.24, -0.06, 0.05);
    leftSide.castShadow = true;
    hairGroup.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo, this.hairMat);
    rightSide.scale.set(0.65, 1.6, 0.85);
    rightSide.position.set(-0.24, -0.06, 0.05);
    rightSide.castShadow = true;
    hairGroup.add(rightSide);

    // 5. Opponent Special: Sporty Ponytail at the back!
    if (!this.isPlayer) {
      const tieGeo = new THREE.TorusGeometry(0.045, 0.016, 8, 16);
      const tieMat = new THREE.MeshToonMaterial({ color: 0xEF4444 });
      const tie = new THREE.Mesh(tieGeo, tieMat);
      tie.position.set(0, 0.02, -0.30);
      tie.rotation.x = Math.PI / 2;
      hairGroup.add(tie);

      const ponyGeo = new THREE.ConeGeometry(0.075, 0.24, 12);
      const ponytail = new THREE.Mesh(ponyGeo, this.hairMat);
      ponytail.position.set(0, -0.09, -0.33);
      ponytail.rotation.x = 0.45;
      ponytail.castShadow = true;
      hairGroup.add(ponytail);
    } else {
      // Player: Clean tapered back hair volume
      const neckTaperGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.14, 16);
      const neckTaper = new THREE.Mesh(neckTaperGeo, this.hairMat);
      neckTaper.position.set(0, -0.16, -0.18);
      neckTaper.rotation.x = 0.35;
      neckTaper.castShadow = true;
      hairGroup.add(neckTaper);
    }

    return hairGroup;
  }

  _buildModel() {
    // Character root
    // Player faces +Z (towards net/opponent)
    // Opponent faces -Z (towards net/player)
    this.bodyGroup = new THREE.Group();
    if (!this.isPlayer) {
      this.bodyGroup.rotation.y = Math.PI;
    }
    this.group.add(this.bodyGroup);

    // ── 1. Pelvis & Shorts ──────────────────────────────────────────────
    const shortGeo = new THREE.CylinderGeometry(0.19, 0.18, 0.18, 16);
    this.shorts = new THREE.Mesh(shortGeo, this.shortMat);
    this.shorts.position.y = 0.62;
    this.shorts.castShadow = true;
    this.bodyGroup.add(this.shorts);

    // White piping trim along bottom of shorts
    const trimGeo = new THREE.TorusGeometry(0.182, 0.01, 8, 24);
    const trim = new THREE.Mesh(trimGeo, this.soleMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.54;
    this.bodyGroup.add(trim);

    // ── 2. Legs & Shoes ─────────────────────────────────────────────────
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(0.11, 0.58, 0);
    this.bodyGroup.add(this.leftLegGroup);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(-0.11, 0.58, 0);
    this.bodyGroup.add(this.rightLegGroup);

    const legGeo = new THREE.CylinderGeometry(0.052, 0.046, 0.32, 12);
    legGeo.translate(0, -0.16, 0);

    const leftLegMesh = new THREE.Mesh(legGeo, this.skinMat);
    leftLegMesh.castShadow = true;
    this.leftLegGroup.add(leftLegMesh);

    const rightLegMesh = new THREE.Mesh(legGeo, this.skinMat);
    rightLegMesh.castShadow = true;
    this.rightLegGroup.add(rightLegMesh);

    // White socks
    const sockGeo = new THREE.CylinderGeometry(0.054, 0.052, 0.08, 12);
    const leftSock = new THREE.Mesh(sockGeo, this.soleMat);
    leftSock.position.y = -0.28;
    this.leftLegGroup.add(leftSock);

    const rightSock = new THREE.Mesh(sockGeo, this.soleMat);
    rightSock.position.y = -0.28;
    this.rightLegGroup.add(rightSock);

    // Athletic Shoes
    const shoeGeo = new THREE.BoxGeometry(0.11, 0.085, 0.17);
    const soleGeo = new THREE.BoxGeometry(0.116, 0.024, 0.176);

    const buildShoe = () => {
      const g = new THREE.Group();
      const shoe = new THREE.Mesh(shoeGeo, this.shoeMat);
      shoe.position.set(0, 0.04, 0.02);
      shoe.castShadow = true;
      g.add(shoe);

      const sole = new THREE.Mesh(soleGeo, this.soleMat);
      sole.position.set(0, 0.012, 0.02);
      g.add(sole);

      // Color accent stripe on shoe
      const stripeGeo = new THREE.BoxGeometry(0.118, 0.018, 0.06);
      const stripeMat = new THREE.MeshToonMaterial({ color: this.teamColor });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(0, 0.045, 0.01);
      g.add(stripe);

      return g;
    };

    const leftShoe = buildShoe();
    leftShoe.position.y = -0.32;
    this.leftLegGroup.add(leftShoe);

    const rightShoe = buildShoe();
    rightShoe.position.y = -0.32;
    this.rightLegGroup.add(rightShoe);

    // ── 3. Torso (Athletic Jersey with Number Badge) ─────────────────────
    const torsoGeo = new THREE.CylinderGeometry(0.21, 0.20, 0.40, 18);
    this.torso = new THREE.Mesh(torsoGeo, this.shirtMat);
    this.torso.position.y = 0.88;
    this.torso.castShadow = true;
    this.bodyGroup.add(this.torso);

    // ── 4. Neck & Head (Mii Big Round Head) ──────────────────────────────
    const neckGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.09, 14);
    const neck = new THREE.Mesh(neckGeo, this.skinMat);
    neck.position.y = 1.09;
    neck.castShadow = true;
    this.bodyGroup.add(neck);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.36, 0);
    this.bodyGroup.add(this.headGroup);

    // Head base sphere
    const headGeo = new THREE.SphereGeometry(0.28, 24, 24);
    this.head = new THREE.Mesh(headGeo, this.skinMat);
    this.head.castShadow = true;
    this.headGroup.add(this.head);

    // Add Styled 3D Hair
    this.hairMesh = this._buildHair();
    this.headGroup.add(this.hairMesh);

    // Eyes (Classic Clean Mii ovals + specular shine)
    const eyeGeo = new THREE.SphereGeometry(0.038, 14, 14);
    const shineGeo = new THREE.SphereGeometry(0.014, 8, 8);

    const buildEye = (side) => {
      const g = new THREE.Group();
      const eyeMesh = new THREE.Mesh(eyeGeo, this.eyeMat);
      eyeMesh.scale.set(0.7, 1.25, 0.3);
      g.add(eyeMesh);

      const shine = new THREE.Mesh(shineGeo, this.shineMat);
      shine.position.set(0.01, 0.02, 0.015);
      g.add(shine);

      g.position.set(side * 0.095, 0.02, 0.26);
      return g;
    };

    this.headGroup.add(buildEye(1));  // Left eye
    this.headGroup.add(buildEye(-1)); // Right eye

    // Cheeks (Soft blush discs)
    const blushGeo = new THREE.CircleGeometry(0.046, 16);
    const leftBlush = new THREE.Mesh(blushGeo, this.blushMat);
    leftBlush.position.set(0.165, -0.06, 0.23);
    leftBlush.rotation.y = 0.4;
    this.headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, this.blushMat);
    rightBlush.position.set(-0.165, -0.06, 0.23);
    rightBlush.rotation.y = -0.4;
    this.headGroup.add(rightBlush);

    // Smile Arc (Mii friendly curve)
    const smileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.06, -0.10, 0.26),
      new THREE.Vector3(0, -0.14, 0.27),
      new THREE.Vector3(-0.06, -0.10, 0.26)
    );
    const smileGeo = new THREE.TubeGeometry(smileCurve, 12, 0.0075, 6, false);
    const smileMesh = new THREE.Mesh(smileGeo, new THREE.MeshBasicMaterial({ color: 0x9A5540 }));
    this.headGroup.add(smileMesh);

    // ── 5. Arms & Wristbands ────────────────────────────────────────────
    const armGeo = new THREE.CylinderGeometry(0.046, 0.042, 0.32, 12);
    armGeo.translate(0, -0.16, 0);

    const sweatbandGeo = new THREE.CylinderGeometry(0.049, 0.047, 0.06, 12);

    // Free arm (Left arm - screen left)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(0.25, 1.04, 0);
    this.bodyGroup.add(this.leftArmGroup);

    const leftArmMesh = new THREE.Mesh(armGeo, this.skinMat);
    leftArmMesh.castShadow = true;
    this.leftArmGroup.add(leftArmMesh);

    const leftSweatband = new THREE.Mesh(sweatbandGeo, this.sweatbandMat);
    leftSweatband.position.y = -0.27;
    this.leftArmGroup.add(leftSweatband);

    // Racket arm (Right arm - screen right)
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(-0.25, 1.04, 0);
    this.bodyGroup.add(this.rightArmGroup);

    const rightArmMesh = new THREE.Mesh(armGeo, this.skinMat);
    rightArmMesh.castShadow = true;
    this.rightArmGroup.add(rightArmMesh);

    const rightSweatband = new THREE.Mesh(sweatbandGeo, this.sweatbandMat);
    rightSweatband.position.y = -0.27;
    this.rightArmGroup.add(rightSweatband);

    // ── 6. Badminton Racket (High-Visibility Arcade Scale) ──────────────
    this.racketGroup = new THREE.Group();
    this.racketGroup.position.set(0, -0.32, 0); // Held firmly in hand
    this.racketGroup.scale.set(1.45, 1.45, 1.45); // 1.45x arcade scale for crisp visibility
    this.rightArmGroup.add(this.racketGroup);

    // Grip
    const gripGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.15, 10);
    gripGeo.translate(0, 0.075, 0);
    const grip = new THREE.Mesh(gripGeo, this.racketGripMat);
    this.racketGroup.add(grip);

    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.34, 10);
    shaftGeo.translate(0, 0.32, 0);
    const shaft = new THREE.Mesh(shaftGeo, this.racketShaftMat);
    this.racketGroup.add(shaft);

    // Racket Head (Vibrant neon frame)
    const headFrameGeo = new THREE.TorusGeometry(0.125, 0.015, 10, 26);
    headFrameGeo.scale(1.0, 1.36, 1.0);
    headFrameGeo.translate(0, 0.62, 0);
    const headFrame = new THREE.Mesh(headFrameGeo, this.racketFrameMat);
    this.racketGroup.add(headFrame);

    // String Bed (Translucent disc)
    const stringGeo = new THREE.CircleGeometry(0.12, 16);
    stringGeo.scale(1.0, 1.36, 1.0);
    stringGeo.translate(0, 0.62, 0);
    const stringBed = new THREE.Mesh(stringGeo, this.stringMat);
    this.racketGroup.add(stringBed);

    // Racket Motion Swoosh Blade (vivid wide sweeping ribbon arc during swing)
    const swooshGeo = new THREE.RingGeometry(0.12, 0.50, 24, 1, 0, Math.PI * 1.2);
    swooshGeo.translate(0, 0.62, 0);
    this.swooshMesh = new THREE.Mesh(swooshGeo, this.swooshMat);
    this.swooshMesh.visible = false;
    this.racketGroup.add(this.swooshMesh);
  }

  update(character, dt) {
    if (!character) return;

    // 1. Position character in 3D world space (mapped to camera perspective)
    this.group.position.set(-character.x, 0, character.z);

    // 2. Base ready stance poses
    let leftLegAngle = 0;
    let rightLegAngle = 0;
    let leftArmAngle = 0.25;
    let leftArmRotZ = 0.2;
    let rightArmRotX = 0.3; // Racket held forward in ready anticipation
    let rightArmRotY = 0;
    let rightArmRotZ = -0.3;
    let torsoBob = 0;
    let torsoRotX = 0;
    let torsoRotY = 0;
    let headRotX = 0;
    let swooshActive = false;
    let swooshOpacity = 0;

    // 3. Running walk-cycle animation
    if (character.animState === 'RUNNING') {
      const walkPhase = (character.runAnimTime || 0) * 14;
      leftLegAngle = Math.sin(walkPhase) * 0.48;
      rightLegAngle = -Math.sin(walkPhase) * 0.48;
      leftArmAngle = -Math.sin(walkPhase) * 0.45;
      rightArmRotX = 0.3 + Math.sin(walkPhase) * 0.35;
      torsoBob = Math.abs(Math.sin(walkPhase * 2)) * 0.04;
    }

    // 4. Distinctive Shot-Specific Swing Animations
    else if (character.animState === 'SWINGING') {
      const dur = character.swingDuration || 0.58;
      const elapsed = dur - (character.animTimer || 0);
      const t = dur > 0 ? Math.min(1, Math.max(0, elapsed / dur)) : 0;
      const shotType = character.currentShotType || 'CLEAR';

      if (shotType === 'SMASH') {
        // ── OVERHEAD JUMP SMASH ──────────────────────────────────────────
        // Leaps into air at apex of stroke!
        torsoBob = Math.sin(t * Math.PI) * 0.42;

        if (t < 0.28) {
          // Jump windup: arm reaches high behind head
          const p = t / 0.28;
          rightArmRotX = THREE.MathUtils.lerp(0.3, -2.25, p);
          rightArmRotZ = THREE.MathUtils.lerp(-0.3, 0.45, p);
          leftArmAngle = THREE.MathUtils.lerp(0.25, -1.2, p); // Non-racket arm points up for balance
          torsoRotX = THREE.MathUtils.lerp(0, -0.15, p);     // Chest arches back
          headRotX = THREE.MathUtils.lerp(0, -0.35, p);      // Eyes look up at shuttle
          // Legs tuck up in mid-air
          leftLegAngle = -0.35 * p;
          rightLegAngle = -0.45 * p;
        } else if (t < 0.65) {
          // Ferocious downward smash snap!
          const p = (t - 0.28) / 0.37;
          rightArmRotX = THREE.MathUtils.lerp(-2.25, 2.05, p);
          rightArmRotZ = THREE.MathUtils.lerp(0.45, -0.65, p);
          leftArmAngle = THREE.MathUtils.lerp(-1.2, 0.4, p);
          torsoRotX = THREE.MathUtils.lerp(-0.15, 0.32, p);  // Crunch forward with impact!
          headRotX = THREE.MathUtils.lerp(-0.35, 0.25, p);
          leftLegAngle = THREE.MathUtils.lerp(-0.35, 0.1, p);
          rightLegAngle = THREE.MathUtils.lerp(-0.45, 0.2, p);

          swooshActive = true;
          swooshOpacity = Math.sin(p * Math.PI) * 0.95;
          this.swooshMat.color.setHex(0xFF4020); // Fiery orange-red swoosh
        } else {
          // Landing recovery & return to stance
          const p = (t - 0.65) / 0.35;
          rightArmRotX = THREE.MathUtils.lerp(2.05, 0.3, p);
          rightArmRotZ = THREE.MathUtils.lerp(-0.65, -0.3, p);
          torsoRotX = THREE.MathUtils.lerp(0.32, 0, p);
          headRotX = THREE.MathUtils.lerp(0.25, 0, p);
        }
      } else if (shotType === 'DRIVE') {
        // ── FLAT SIDEARM DRIVE WHIP ──────────────────────────────────────
        // Powerful horizontal chest-height slash with torso twist
        if (t < 0.24) {
          const p = t / 0.24;
          rightArmRotX = THREE.MathUtils.lerp(0.3, -0.4, p);
          rightArmRotY = THREE.MathUtils.lerp(0, -0.85, p);
          rightArmRotZ = THREE.MathUtils.lerp(-0.3, 0.55, p);
          torsoRotY = THREE.MathUtils.lerp(0, -0.35, p); // Torso coils back
        } else if (t < 0.60) {
          const p = (t - 0.24) / 0.36;
          rightArmRotX = THREE.MathUtils.lerp(-0.4, 0.85, p);
          rightArmRotY = THREE.MathUtils.lerp(-0.85, 1.25, p);
          rightArmRotZ = THREE.MathUtils.lerp(0.55, -0.5, p);
          torsoRotY = THREE.MathUtils.lerp(-0.35, 0.42, p); // Uncoils forward with speed

          swooshActive = true;
          swooshOpacity = Math.sin(p * Math.PI) * 0.85;
          this.swooshMat.color.setHex(0x38BDF8); // Electric sky blue swoosh
        } else {
          const p = (t - 0.60) / 0.40;
          rightArmRotX = THREE.MathUtils.lerp(0.85, 0.3, p);
          rightArmRotY = THREE.MathUtils.lerp(1.25, 0, p);
          rightArmRotZ = THREE.MathUtils.lerp(-0.5, -0.3, p);
          torsoRotY = THREE.MathUtils.lerp(0.42, 0, p);
        }
      } else if (shotType === 'DROP' || shotType === 'NET') {
        // ── UNDERHAND NET SCOOP / DROP ──────────────────────────────────
        // Knees bend low, gentle touch lifting from underneath
        torsoBob = -0.12 * Math.sin(t * Math.PI);
        leftLegAngle = 0.25 * Math.sin(t * Math.PI);
        rightLegAngle = 0.25 * Math.sin(t * Math.PI);

        if (t < 0.32) {
          const p = t / 0.32;
          rightArmRotX = THREE.MathUtils.lerp(0.3, 1.55, p); // Drops low towards floor
          rightArmRotZ = THREE.MathUtils.lerp(-0.3, -0.1, p);
          torsoRotX = THREE.MathUtils.lerp(0, 0.18, p);
        } else if (t < 0.68) {
          const p = (t - 0.32) / 0.36;
          rightArmRotX = THREE.MathUtils.lerp(1.55, -0.45, p); // Delicate upward lift
          rightArmRotZ = THREE.MathUtils.lerp(-0.1, -0.35, p);
          torsoRotX = THREE.MathUtils.lerp(0.18, -0.05, p);

          swooshActive = true;
          swooshOpacity = Math.sin(p * Math.PI) * 0.55;
          this.swooshMat.color.setHex(0x4ADE80); // Emerald touch swoosh
        } else {
          const p = (t - 0.68) / 0.32;
          rightArmRotX = THREE.MathUtils.lerp(-0.45, 0.3, p);
          rightArmRotZ = THREE.MathUtils.lerp(-0.35, -0.3, p);
          torsoRotX = THREE.MathUtils.lerp(-0.05, 0, p);
        }
      } else {
        // ── HIGH OVERHEAD CLEAR ──────────────────────────────────────────
        // High reaching extension deep to back court
        if (t < 0.28) {
          const p = t / 0.28;
          rightArmRotX = THREE.MathUtils.lerp(0.3, -1.85, p);
          rightArmRotZ = THREE.MathUtils.lerp(-0.3, 0.75, p);
          headRotX = THREE.MathUtils.lerp(0, -0.3, p);
        } else if (t < 0.64) {
          const p = (t - 0.28) / 0.36;
          rightArmRotX = THREE.MathUtils.lerp(-1.85, 1.45, p);
          rightArmRotZ = THREE.MathUtils.lerp(0.75, -0.65, p);

          swooshActive = true;
          swooshOpacity = Math.sin(p * Math.PI) * 0.75;
          this.swooshMat.color.setHex(0xFACC15); // Golden clear swoosh
        } else {
          const p = (t - 0.64) / 0.36;
          rightArmRotX = THREE.MathUtils.lerp(1.45, 0.3, p);
          rightArmRotZ = THREE.MathUtils.lerp(-0.65, -0.3, p);
        }
      }
    }

    // 5. Celebration Reaction (Joyful Victory Hop)
    else if (character.animState === 'CELEBRATE') {
      const hopPhase = ((character.animTimer || 0) * 12);
      torsoBob = Math.abs(Math.sin(hopPhase)) * 0.14;
      leftArmAngle = -2.1 + Math.sin(hopPhase * 2) * 0.2;
      leftArmRotZ = 0.5;
      rightArmRotX = -2.1 + Math.sin(hopPhase * 2) * 0.2;
      rightArmRotZ = -0.5;
      headRotX = -0.22;
    }

    // 6. Disappointment Reaction (Point Lost)
    else if (character.animState === 'DISAPPOINTED') {
      headRotX = 0.45;
      torsoRotX = 0.22;
      leftArmAngle = 0.15;
      leftArmRotZ = 0.05;
      rightArmRotX = 0.15;
      rightArmRotZ = -0.05;
    }

    // 7. Whiff / Stumble Reaction
    else if (character.animState === 'STUMBLE' || character.animState === 'WHIFF') {
      leftArmAngle = 1.2;
      leftArmRotZ = 0.4;
      rightArmRotX = 1.1;
      rightArmRotZ = 0.7;
      torsoRotX = 0.18;
    }

    // Apply motion swoosh visibility
    this.swooshMesh.visible = swooshActive;
    if (swooshActive) {
      this.swooshMat.opacity = swooshOpacity;
    }

    // Apply joint and bone rotations
    this.leftLegGroup.rotation.x = leftLegAngle;
    this.rightLegGroup.rotation.x = rightLegAngle;

    this.leftArmGroup.rotation.x = leftArmAngle;
    this.leftArmGroup.rotation.z = leftArmRotZ;

    this.rightArmGroup.rotation.x = rightArmRotX;
    this.rightArmGroup.rotation.y = rightArmRotY;
    this.rightArmGroup.rotation.z = rightArmRotZ;

    this.bodyGroup.position.y = torsoBob;
    this.bodyGroup.rotation.x = torsoRotX;
    this.bodyGroup.rotation.y = (!this.isPlayer ? Math.PI : 0) + torsoRotY;

    if (this.headGroup) {
      this.headGroup.rotation.x = headRotX;
    }
  }
}
