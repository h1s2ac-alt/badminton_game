import * as THREE from 'three';
import { COURT } from '../utils/constants.js';

export class Court3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.spectators = [];

    this._initLights();
    this._initFloor();
    this._initWalls();
    this._initBleachersAndCrowd();
    this._initUmpireChair();
    this._initNet();
    this._initRoofTrussesAndFloodlights();
  }

  _initLights() {
    // Soft warm ambient light
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.90);
    this.group.add(ambientLight);

    // Main stadium key floodlight with shadow maps
    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    keyLight.position.set(4, 15, -4);
    keyLight.target.position.set(0, 0, 0);
    keyLight.castShadow = true;

    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 40.0;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.bias = -0.0008;

    this.group.add(keyLight);
    this.group.add(keyLight.target);

    // Cool fill light from behind net
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.55);
    fillLight.position.set(-6, 11, 9);
    this.group.add(fillLight);

    // Stadium side accent rim lights
    const rimLeft = new THREE.DirectionalLight(0x60a5fa, 0.35);
    rimLeft.position.set(-14, 8, 0);
    this.group.add(rimLeft);

    const rimRight = new THREE.DirectionalLight(0xfcd34d, 0.25);
    rimRight.position.set(14, 8, 0);
    this.group.add(rimRight);
  }

  _generateCourtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Vibrant tournament Olympic electric cyan-blue court mat
    const grad = ctx.createLinearGradient(0, 0, 0, 2048);
    grad.addColorStop(0,   '#0284C7');
    grad.addColorStop(0.5, '#0EA5E9');
    grad.addColorStop(1,   '#0284C7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 2048);

    // Subtle high-grip tournament mat texture grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let y = 0; y < 2048; y += 4) {
      ctx.fillRect(0, y, 1024, 2);
    }

    // Coordinates mapping
    const toPxX = (x) => (x + COURT.WIDTH / 2) * (1024 / COURT.WIDTH);
    const toPxY = (z) => (z + COURT.HALF_LENGTH) * (2048 / COURT.TOTAL_LENGTH);

    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineCap = 'square';

    const drawLine = (x1, z1, x2, z2, width = 14) => {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(toPxX(x1), toPxY(z1));
      ctx.lineTo(toPxX(x2), toPxY(z2));
      ctx.stroke();
    };

    const hw = COURT.WIDTH / 2;
    const hl = COURT.HALF_LENGTH;

    // Outer Boundary (thick white lines)
    drawLine(-hw, -hl,  hw, -hl, 20);
    drawLine(-hw,  hl,  hw,  hl, 20);
    drawLine(-hw, -hl, -hw,  hl, 20);
    drawLine( hw, -hl,  hw,  hl, 20);

    // Singles sidelines (0.46m inside doubles sidelines)
    const singlesW = (COURT.WIDTH - 0.92) / 2;
    drawLine(-singlesW, -hl, -singlesW, hl, 14);
    drawLine( singlesW, -hl,  singlesW, hl, 14);

    // Short service lines (1.98m from net)
    drawLine(-hw, -COURT.SHORT_SERVICE_DIST, hw, -COURT.SHORT_SERVICE_DIST, 16);
    drawLine(-hw,  COURT.SHORT_SERVICE_DIST, hw,  COURT.SHORT_SERVICE_DIST, 16);

    // Long service lines for doubles (0.76m inside back baseline)
    const longServDist = hl - 0.76;
    drawLine(-hw, -longServDist, hw, -longServDist, 14);
    drawLine(-hw,  longServDist, hw,  longServDist, 14);

    // Center service line (runs from short service line to back baseline)
    drawLine(0, -hl, 0, -COURT.SHORT_SERVICE_DIST, 16);
    drawLine(0,  COURT.SHORT_SERVICE_DIST, 0, hl, 16);

    // Net line
    drawLine(-hw, 0, hw, 0, 10);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  _generateParquetFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Warm rich honey-oak gym floor
    ctx.fillStyle = '#854D0E';
    ctx.fillRect(0, 0, 1024, 1024);

    // Alternating parquet slat blocks
    const block = 128;
    for (let bx = 0; bx < 1024; bx += block) {
      for (let by = 0; by < 1024; by += block) {
        const isHorizontal = ((bx / block) + (by / block)) % 2 === 0;
        const shade = ((bx + by) % 256 === 0) ? '#925413' : '#78430C';
        ctx.fillStyle = shade;
        ctx.fillRect(bx + 1, by + 1, block - 2, block - 2);

        // Individual wood slats
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        const numSlats = 4;
        const slatSize = block / numSlats;
        for (let s = 1; s < numSlats; s++) {
          if (isHorizontal) {
            ctx.fillRect(bx, by + s * slatSize, block, 2);
          } else {
            ctx.fillRect(bx + s * slatSize, by, 2, block);
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    return texture;
  }

  _initFloor() {
    // 1. Main tournament court playing mat
    const courtGeo = new THREE.PlaneGeometry(COURT.WIDTH, COURT.TOTAL_LENGTH);
    const courtMat = new THREE.MeshStandardMaterial({
      map: this._generateCourtTexture(),
      roughness: 0.32,
      metalness: 0.04,
    });
    const courtMesh = new THREE.Mesh(courtGeo, courtMat);
    courtMesh.rotation.x = -Math.PI / 2;
    courtMesh.position.y = 0.003;
    courtMesh.receiveShadow = true;
    this.group.add(courtMesh);

    // 2. Surrounding polished hardwood parquet floor with authentic gym gloss
    const outerGeo = new THREE.PlaneGeometry(30, 38);
    const outerMat = new THREE.MeshStandardMaterial({
      map: this._generateParquetFloorTexture(),
      roughness: 0.22,
      metalness: 0.06,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = -Math.PI / 2;
    outerMesh.position.y = 0;
    outerMesh.receiveShadow = true;
    this.group.add(outerMesh);
  }

  _initWalls() {
    // Dark modern tournament arena walls (slate navy acoustic paneling)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0F172A,
      roughness: 0.85,
    });

    // Back wall (behind opponent)
    const backGeo = new THREE.PlaneGeometry(30, 14);
    const backWall = new THREE.Mesh(backGeo, wallMat);
    backWall.position.set(0, 7, 16.5);
    backWall.rotation.y = Math.PI;
    this.group.add(backWall);

    // Front wall (behind camera)
    const frontWall = new THREE.Mesh(backGeo, wallMat);
    frontWall.position.set(0, 7, -16.5);
    this.group.add(frontWall);

    // Left wall
    const sideGeo = new THREE.PlaneGeometry(38, 14);
    const leftWall = new THREE.Mesh(sideGeo, wallMat);
    leftWall.position.set(-14.5, 7, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.group.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(sideGeo, wallMat);
    rightWall.position.set(14.5, 7, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.group.add(rightWall);

    // Arena Grand Championship Banner on back wall
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1024;
    bannerCanvas.height = 256;
    const bCtx = bannerCanvas.getContext('2d');
    bCtx.fillStyle = '#090D16';
    bCtx.fillRect(0, 0, 1024, 256);
    // Gold glowing borders
    bCtx.strokeStyle = '#F59E0B';
    bCtx.lineWidth = 14;
    bCtx.strokeRect(12, 12, 1000, 232);
    // Text
    bCtx.fillStyle = '#F8FAFC';
    bCtx.font = '900 64px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('★ BADMINTON WORLD TOUR ★', 512, 105);
    bCtx.font = '700 34px sans-serif';
    bCtx.fillStyle = '#38BDF8';
    bCtx.fillText('CHAMPIONSHIP ARENA • COURT 1', 512, 175);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.6), bannerMat);
    bannerMesh.position.set(0, 6.8, 16.4);
    bannerMesh.rotation.y = Math.PI;
    this.group.add(bannerMesh);
  }

  _initBleachersAndCrowd() {
    const bleacherMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      roughness: 0.65,
    });
    const seatColors = [0x3B82F6, 0xEF4444, 0x10B981, 0xF59E0B, 0x8B5CF6, 0xEC4899];
    const spectatorShirtColors = [0x2563EB, 0xDC2626, 0x059669, 0xD97706, 0x7C3AED, 0xDB2777, 0x0284C7, 0xEA580C];
    const skinTones = [0xFDE047, 0xFBBF24, 0xFCD34D, 0xF59E0B];

    // ── 1. Back Bleachers (Behind Opponent) ──────────────────────────────
    const numTiers = 4;
    for (let t = 0; t < numTiers; t++) {
      const tierZ = 11.2 + t * 1.1;
      const tierY = 0.4 + t * 0.75;
      const tierGeo = new THREE.BoxGeometry(22, 0.75, 1.2);
      const tierMesh = new THREE.Mesh(tierGeo, bleacherMat);
      tierMesh.position.set(0, tierY, tierZ);
      tierMesh.receiveShadow = true;
      this.group.add(tierMesh);

      // Seats & Spectators on this tier
      const spectatorsInRow = 12;
      for (let i = 0; i < spectatorsInRow; i++) {
        const specX = -8.5 + (i / (spectatorsInRow - 1)) * 17.0 + (Math.random() - 0.5) * 0.25;
        const seatColor = seatColors[(i + t) % seatColors.length];
        const shirtColor = spectatorShirtColors[(i * 3 + t * 2) % spectatorShirtColors.length];
        const skinColor = skinTones[i % skinTones.length];

        // Seat bucket
        const seatGeo = new THREE.BoxGeometry(0.5, 0.12, 0.5);
        const seatMat = new THREE.MeshToonMaterial({ color: seatColor });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(specX, tierY + 0.42, tierZ - 0.15);
        this.group.add(seat);

        // Spectator Figurine
        const specGroup = new THREE.Group();
        specGroup.position.set(specX, tierY + 0.48, tierZ - 0.15);

        // Torso (Jersey)
        const torsoGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.34, 10);
        const torsoMat = new THREE.MeshToonMaterial({ color: shirtColor });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 0.17;
        specGroup.add(torso);

        // Head
        const headGeo = new THREE.SphereGeometry(0.12, 12, 10);
        const headMat = new THREE.MeshToonMaterial({ color: skinColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.44;
        specGroup.add(head);

        // Hair / Cap
        const capGeo = new THREE.SphereGeometry(0.125, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const capMat = new THREE.MeshToonMaterial({ color: ((i + t) % 2 === 0) ? 0x1E293B : shirtColor });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 0.45;
        specGroup.add(cap);

        // Clapping/Cheering hands
        const handGeo = new THREE.SphereGeometry(0.045, 8, 8);
        const leftHand = new THREE.Mesh(handGeo, headMat);
        leftHand.position.set(0.18, 0.24, 0.12);
        specGroup.add(leftHand);

        const rightHand = new THREE.Mesh(handGeo, headMat);
        rightHand.position.set(-0.18, 0.24, 0.12);
        specGroup.add(rightHand);

        this.group.add(specGroup);

        this.spectators.push({
          mesh: specGroup,
          baseY: specGroup.position.y,
          phase: Math.random() * Math.PI * 2,
          speed: 2.2 + Math.random() * 2.5,
        });
      }
    }

    // ── 2. Side Bleachers (Left & Right Wings) ───────────────────────────
    [-1, 1].forEach(side => {
      for (let t = 0; t < 3; t++) {
        const tierX = (8.8 + t * 1.1) * side;
        const tierY = 0.4 + t * 0.75;
        const tierGeo = new THREE.BoxGeometry(1.2, 0.75, 20);
        const tierMesh = new THREE.Mesh(tierGeo, bleacherMat);
        tierMesh.position.set(tierX, tierY, 0);
        tierMesh.receiveShadow = true;
        this.group.add(tierMesh);

        // Side spectators
        const sideSpectators = 8;
        for (let i = 0; i < sideSpectators; i++) {
          const specZ = -7.5 + (i / (sideSpectators - 1)) * 15.0;
          const shirtColor = spectatorShirtColors[(i * 2 + t * 3) % spectatorShirtColors.length];
          const skinColor = skinTones[(i + t) % skinTones.length];

          const specGroup = new THREE.Group();
          specGroup.position.set(tierX - (0.15 * side), tierY + 0.48, specZ);
          specGroup.rotation.y = (side === 1) ? -Math.PI / 2 : Math.PI / 2;

          const torso = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.12, 0.34, 8),
            new THREE.MeshToonMaterial({ color: shirtColor })
          );
          torso.position.y = 0.17;
          specGroup.add(torso);

          const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 10, 8),
            new THREE.MeshToonMaterial({ color: skinColor })
          );
          head.position.y = 0.44;
          specGroup.add(head);

          this.group.add(specGroup);
          this.spectators.push({
            mesh: specGroup,
            baseY: specGroup.position.y,
            phase: Math.random() * Math.PI * 2,
            speed: 2.0 + Math.random() * 2.2,
          });
        }
      }
    });

    // ── 3. LED Perimeter Sponsor Ribbon Boards ───────────────────────────
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = 1024;
    ledCanvas.height = 128;
    const lCtx = ledCanvas.getContext('2d');
    lCtx.fillStyle = '#0284C7';
    lCtx.fillRect(0, 0, 1024, 128);
    lCtx.fillStyle = '#FFFFFF';
    lCtx.font = '900 48px sans-serif';
    lCtx.textAlign = 'center';
    lCtx.fillText('★ BADMINTON PRO TOUR • SMASH ARENA • POWER SERVE ★', 512, 82);

    const ledTex = new THREE.CanvasTexture(ledCanvas);
    const ledMat = new THREE.MeshBasicMaterial({ map: ledTex });

    // Back LED board (in front of back bleachers)
    const backLed = new THREE.Mesh(new THREE.BoxGeometry(18, 0.72, 0.15), ledMat);
    backLed.position.set(0, 0.36, 10.3);
    this.group.add(backLed);

    // Left & Right LED boards
    const sideLedGeo = new THREE.BoxGeometry(0.15, 0.72, 18);
    const leftLed = new THREE.Mesh(sideLedGeo, ledMat);
    leftLed.position.set(-8.0, 0.36, 0);
    this.group.add(leftLed);

    const rightLed = new THREE.Mesh(sideLedGeo, ledMat);
    rightLed.position.set(8.0, 0.36, 0);
    this.group.add(rightLed);
  }

  _initUmpireChair() {
    // Official Tournament Referee / Umpire High Chair next to left net post
    const chairGroup = new THREE.Group();
    chairGroup.position.set(-3.45, 0, 0);

    const metalMat = new THREE.MeshToonMaterial({ color: 0x94A3B8 });
    const seatMat = new THREE.MeshToonMaterial({ color: 0x2563EB });

    // Ladder A-frame legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.0, 8);
    [
      { x: -0.22, z: -0.25, rotZ: 0.12, rotX: -0.1 },
      { x: 0.22,  z: -0.25, rotZ: -0.12, rotX: -0.1 },
      { x: -0.22, z: 0.25,  rotZ: 0.12, rotX: 0.1 },
      { x: 0.22,  z: 0.25,  rotZ: -0.12, rotX: 0.1 },
    ].forEach(p => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(p.x, 1.0, p.z);
      leg.rotation.z = p.rotZ;
      leg.rotation.x = p.rotX;
      chairGroup.add(leg);
    });

    // Ladder rungs
    const rungGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.44, 8);
    rungGeo.rotateZ(Math.PI / 2);
    [0.4, 0.8, 1.2, 1.6].forEach(y => {
      const rung = new THREE.Mesh(rungGeo, metalMat);
      rung.position.set(0, y, -0.22);
      chairGroup.add(rung);
    });

    // Elevated chair platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), metalMat);
    platform.position.set(0, 1.78, 0);
    chairGroup.add(platform);

    // Blue bucket chair seat & backrest
    const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.42), seatMat);
    seatMesh.position.set(0, 1.85, 0);
    chairGroup.add(seatMesh);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.06), seatMat);
    backrest.position.set(0, 2.10, -0.18);
    chairGroup.add(backrest);

    // Umpire Figurine
    const umpireTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.10, 0.32, 10),
      new THREE.MeshToonMaterial({ color: 0x1E3A8A }) // Navy blazer
    );
    umpireTorso.position.set(0, 2.05, 0);
    chairGroup.add(umpireTorso);

    const umpireHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 12, 10),
      new THREE.MeshToonMaterial({ color: 0xFDE047 })
    );
    umpireHead.position.set(0, 2.30, 0);
    chairGroup.add(umpireHead);

    const umpireCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshToonMaterial({ color: 0xFFFFFF }) // White official cap
    );
    umpireCap.position.set(0, 2.32, 0);
    chairGroup.add(umpireCap);

    this.group.add(chairGroup);
  }

  _initNet() {
    const hw = COURT.WIDTH / 2;
    const postHeight = COURT.NET_HEIGHT;
    const postRadius = 0.045;

    // Silver metallic posts
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xCBD5E1,
      roughness: 0.15,
      metalness: 0.85,
    });

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(-hw, postHeight / 2, 0);
    leftPost.castShadow = true;
    this.group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(hw, postHeight / 2, 0);
    rightPost.castShadow = true;
    this.group.add(rightPost);

    // Post caps
    const capGeo = new THREE.SphereGeometry(postRadius * 1.25, 16, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.1 });

    const leftCap = new THREE.Mesh(capGeo, capMat);
    leftCap.position.set(-hw, postHeight + 0.02, 0);
    this.group.add(leftCap);

    const rightCap = new THREE.Mesh(capGeo, capMat);
    rightCap.position.set(hw, postHeight + 0.02, 0);
    this.group.add(rightCap);

    // Net Mesh
    const netDepth = 0.76;
    const netY = postHeight - netDepth / 2;

    const netGeo = new THREE.PlaneGeometry(COURT.WIDTH, netDepth, 16, 4);

    // Center droop: vertex manipulation (1.524m at center vs 1.55m at posts)
    const posAttr = netGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const normalizedX = x / hw;
      const droop = (1 - normalizedX * normalizedX) * 0.026;
      posAttr.setY(i, posAttr.getY(i) - droop);
    }
    netGeo.computeVertexNormals();

    const netMat = new THREE.MeshToonMaterial({
      map: this._generateNetTexture(),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, netY, 0);
    this.group.add(netMesh);
  }

  _generateNetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 128);

    // Top white tape (top ~22 pixels)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 22);

    // Semi-transparent mesh grid
    ctx.strokeStyle = 'rgba(235, 245, 255, 0.55)';
    ctx.lineWidth = 1.5;

    for (let y = 22; y <= 128; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    for (let x = 0; x <= 512; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(4, 1);
    return texture;
  }

  _initRoofTrussesAndFloodlights() {
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.35,
    });
    const floodlightBulbMat = new THREE.MeshBasicMaterial({ color: 0xFFFBEB });

    // 3 Steel lattice trusses across ceiling
    [-7, 0, 7].forEach(z => {
      const trussBeam = new THREE.Mesh(new THREE.BoxGeometry(28, 0.45, 0.45), trussMat);
      trussBeam.position.set(0, 11.2, z);
      this.group.add(trussBeam);

      // Angled stadium floodlight banks on each side of the truss
      [-5.5, 5.5].forEach(x => {
        const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.8), trussMat);
        fixture.position.set(x, 10.9, z);
        fixture.rotation.z = (x < 0) ? -0.25 : 0.25;
        this.group.add(fixture);

        const bulb = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), floodlightBulbMat);
        bulb.position.set(x, 10.72, z);
        bulb.rotation.x = Math.PI / 2;
        bulb.rotation.z = (x < 0) ? -0.25 : 0.25;
        this.group.add(bulb);
      });
    });
  }

  update(dt) {
    // Dynamic spectator bounce/cheer animation
    const time = performance.now() * 0.001;
    for (let i = 0; i < this.spectators.length; i++) {
      const s = this.spectators[i];
      s.mesh.position.y = s.baseY + Math.abs(Math.sin(time * s.speed + s.phase)) * 0.12;
    }
  }
}
