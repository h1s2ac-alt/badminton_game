import * as THREE from 'three';
import { COURT } from '../utils/constants.js';

export class Court3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._initLights();
    this._initFloor();
    this._initWalls();
    this._initNet();
  }

  _initLights() {
    // Soft ambient light to keep cartoon aesthetics bright
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.group.add(ambientLight);

    // Main key light with shadows
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.25);
    keyLight.position.set(4, 13, -5);
    keyLight.target.position.set(0, 0, 0);
    keyLight.castShadow = true;

    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 35.0;
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    keyLight.shadow.bias = -0.0008;

    this.group.add(keyLight);
    this.group.add(keyLight.target);

    // Cool fill light from behind net
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.45);
    fillLight.position.set(-5, 9, 8);
    this.group.add(fillLight);
  }

  _generateCourtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Vibrant rich cyan-blue court color (matches reference image)
    const grad = ctx.createLinearGradient(0, 0, 0, 2048);
    grad.addColorStop(0,   '#0288D1');
    grad.addColorStop(0.5, '#03A9F4');
    grad.addColorStop(1,   '#0277BD');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 2048);

    // Coordinates mapping
    // Court width = 5.18m (mapped to 1024px -> scaleX = 1024 / 5.18 = 197.68)
    // Court length = 13.4m (mapped to 2048px -> scaleZ = 2048 / 13.4 = 152.83)
    const toPxX = (x) => (x + COURT.WIDTH / 2) * (1024 / COURT.WIDTH);
    // In Three.js plane, Top is Z=-6.7 (player baseline), Bottom is Z=+6.7 (opponent baseline)
    const toPxY = (z) => (z + COURT.HALF_LENGTH) * (2048 / COURT.TOTAL_LENGTH);

    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineCap = 'square';

    const drawLine = (x1, z1, x2, z2, width = 12) => {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(toPxX(x1), toPxY(z1));
      ctx.lineTo(toPxX(x2), toPxY(z2));
      ctx.stroke();
    };

    const hw = COURT.WIDTH / 2;
    const hl = COURT.HALF_LENGTH;

    // Outer Boundary (thick white lines)
    drawLine(-hw, -hl,  hw, -hl, 18);
    drawLine(-hw,  hl,  hw,  hl, 18);
    drawLine(-hw, -hl, -hw,  hl, 18);
    drawLine( hw, -hl,  hw,  hl, 18);

    // Short service lines
    drawLine(-hw, -COURT.SHORT_SERVICE_DIST, hw, -COURT.SHORT_SERVICE_DIST, 14);
    drawLine(-hw,  COURT.SHORT_SERVICE_DIST, hw,  COURT.SHORT_SERVICE_DIST, 14);

    // Center service lines
    drawLine(0, -hl, 0, -COURT.SHORT_SERVICE_DIST, 14);
    drawLine(0,  COURT.SHORT_SERVICE_DIST, 0, hl, 14);

    // Net line (subtle)
    drawLine(-hw, 0, hw, 0, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  _generateWoodWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Warm indoor gym wood paneling (rich amber-brown)
    ctx.fillStyle = '#6E4E30';
    ctx.fillRect(0, 0, 1024, 512);

    // Planks
    const numPlanks = 14;
    const plankH = 512 / numPlanks;
    for (let i = 0; i < numPlanks; i++) {
      const y = i * plankH;
      const shade = (i % 2 === 0) ? '#7E5B38' : '#69482C';
      ctx.fillStyle = shade;
      ctx.fillRect(0, y, 1024, plankH);

      // Plank seam line
      ctx.strokeStyle = '#4A301A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2);
    return texture;
  }

  _initFloor() {
    // 1. Main court playing area
    const courtGeo = new THREE.PlaneGeometry(COURT.WIDTH, COURT.TOTAL_LENGTH);
    const courtMat = new THREE.MeshToonMaterial({
      map: this._generateCourtTexture(),
      roughness: 0.25,
    });
    const courtMesh = new THREE.Mesh(courtGeo, courtMat);
    courtMesh.rotation.x = -Math.PI / 2;
    courtMesh.position.y = 0.002;
    courtMesh.receiveShadow = true;
    this.group.add(courtMesh);

    // 2. Outer gym floor surround (deep navy/blue)
    const outerGeo = new THREE.PlaneGeometry(26, 32);
    const outerMat = new THREE.MeshToonMaterial({
      color: 0x01579B,
      roughness: 0.45,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = -Math.PI / 2;
    outerMesh.position.y = 0;
    outerMesh.receiveShadow = true;
    this.group.add(outerMesh);
  }

  _initWalls() {
    const woodTex = this._generateWoodWallTexture();
    const wallMat = new THREE.MeshToonMaterial({
      map: woodTex,
      roughness: 0.6,
    });

    // Back wall (behind opponent)
    const backGeo = new THREE.PlaneGeometry(24, 10);
    const backWall = new THREE.Mesh(backGeo, wallMat);
    backWall.position.set(0, 5, 14);
    backWall.rotation.y = Math.PI;
    this.group.add(backWall);

    // Arena Tournament Banner on back wall
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1024;
    bannerCanvas.height = 256;
    const bCtx = bannerCanvas.getContext('2d');
    bCtx.fillStyle = '#0F172A';
    bCtx.fillRect(0, 0, 1024, 256);
    // Gold borders
    bCtx.strokeStyle = '#F59E0B';
    bCtx.lineWidth = 12;
    bCtx.strokeRect(10, 10, 1004, 236);
    // Text
    bCtx.fillStyle = '#F8FAFC';
    bCtx.font = '900 68px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('WII BADMINTON ARENA', 512, 110);
    bCtx.font = '700 36px sans-serif';
    bCtx.fillStyle = '#38BDF8';
    bCtx.fillText('★ COURT 1 • CHAMPIONSHIP ★', 512, 185);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshToonMaterial({ map: bannerTex });
    const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), bannerMat);
    bannerMesh.position.set(0, 4.6, 13.92);
    bannerMesh.rotation.y = Math.PI;
    this.group.add(bannerMesh);

    // Left side wall
    const leftGeo = new THREE.PlaneGeometry(30, 10);
    const leftWall = new THREE.Mesh(leftGeo, wallMat);
    leftWall.position.set(-12, 5, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.group.add(leftWall);

    // Right side wall
    const rightWall = new THREE.Mesh(leftGeo, wallMat);
    rightWall.position.set(12, 5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.group.add(rightWall);

    // Front wall (behind player/camera)
    const frontWall = new THREE.Mesh(backGeo, wallMat);
    frontWall.position.set(0, 5, -14);
    this.group.add(frontWall);

    // Overhead gym light fixtures
    const lightFixtureMat = new THREE.MeshToonMaterial({ color: 0x334155 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFFBEB });
    [-4, 4].forEach(x => {
      [-4, 0, 4].forEach(z => {
        const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 2.2), lightFixtureMat);
        fixture.position.set(x, 9.8, z);
        this.group.add(fixture);

        const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.0), bulbMat);
        bulb.rotation.x = Math.PI / 2;
        bulb.position.set(x, 9.68, z);
        this.group.add(bulb);
      });
    });
  }

  _generateNetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 128);

    // Top white tape (top ~18 pixels)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 20);

    // Semi-transparent mesh grid
    ctx.strokeStyle = 'rgba(230, 240, 255, 0.45)';
    ctx.lineWidth = 1.5;

    // Horizontal strands
    for (let y = 20; y <= 128; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    // Vertical strands
    for (let x = 0; x <= 512; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(4, 1);
    return texture;
  }

  _initNet() {
    const hw = COURT.WIDTH / 2;
    const postHeight = COURT.NET_HEIGHT;
    const postRadius = 0.045;

    // Silver metallic posts
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
    const postMat = new THREE.MeshToonMaterial({
      color: 0xCCCCCC,
      roughness: 0.2,
    });

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(-hw, postHeight / 2, 0);
    leftPost.castShadow = true;
    this.group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(hw, postHeight / 2, 0);
    rightPost.castShadow = true;
    this.group.add(rightPost);

    // Post caps (black/dark chrome balls)
    const capGeo = new THREE.SphereGeometry(postRadius * 1.25, 16, 16);
    const capMat = new THREE.MeshToonMaterial({ color: 0x333333 });

    const leftCap = new THREE.Mesh(capGeo, capMat);
    leftCap.position.set(-hw, postHeight + 0.02, 0);
    this.group.add(leftCap);

    const rightCap = new THREE.Mesh(capGeo, capMat);
    rightCap.position.set(hw, postHeight + 0.02, 0);
    this.group.add(rightCap);

    // Net Mesh
    // Badminton net height: 0.76m deep. Top at 1.55m, bottom at 0.79m
    const netDepth = 0.76;
    const netY = postHeight - netDepth / 2;

    const netGeo = new THREE.PlaneGeometry(COURT.WIDTH, netDepth, 16, 4);

    // Center droop: vertex manipulation (1.524m at center vs 1.55m at posts)
    const posAttr = netGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const normalizedX = x / hw; // -1 to 1
      const droop = (1 - normalizedX * normalizedX) * 0.026; // Droop in center
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
}
