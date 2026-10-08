import * as THREE from 'three';
import { SHOT_TYPES } from '../utils/constants.js';

const TRAIL_COLORS_HEX = {
  [SHOT_TYPES.SMASH]: 0xFF3C28,
  [SHOT_TYPES.CLEAR]: 0x88CCFF,
  [SHOT_TYPES.DROP]:  0x55E070,
  [SHOT_TYPES.DRIVE]: 0xFFA028,
  [SHOT_TYPES.NET]:   0x70FFB0,
  [SHOT_TYPES.SERVE]: 0xA0B0FF,
};

export class Shuttle3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._buildShuttleMesh();
    this._buildLandingRing();
    this._buildDropBeamAndShadow();
    this._buildTrailLine();
  }

  _buildShuttleMesh() {
    this.meshGroup = new THREE.Group();
    // Arcade scale for crystal-clear visual tracking across entire court
    this.meshGroup.scale.set(2.4, 2.4, 2.4);
    this.group.add(this.meshGroup);

    // 1. Rounded cork base (high-visibility bright white/cream)
    const corkGeo = new THREE.SphereGeometry(0.028, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const corkMat = new THREE.MeshToonMaterial({ color: 0xFFFFF5 });
    const cork = new THREE.Mesh(corkGeo, corkMat);
    cork.castShadow = true;
    this.meshGroup.add(cork);

    // 2. High-contrast electric blue binding tape
    const tapeGeo = new THREE.CylinderGeometry(0.029, 0.029, 0.008, 16);
    const tapeMat = new THREE.MeshToonMaterial({ color: 0x2563EB });
    const tape = new THREE.Mesh(tapeGeo, tapeMat);
    tape.position.y = -0.005;
    this.meshGroup.add(tape);

    // 3. Flared feather / nylon skirt
    const skirtGeo = new THREE.CylinderGeometry(0.065, 0.029, 0.085, 16, 1, true);
    const skirtMat = new THREE.MeshToonMaterial({
      color: 0xFEFCE8, // Bright crisp white-yellow badminton nylon
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = -0.048;
    skirt.castShadow = true;
    this.meshGroup.add(skirt);

    // 4. Feather vane ribs around skirt
    const ribGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.086, 6);
    const ribMat = new THREE.MeshToonMaterial({ color: 0xCBD5E1 });
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const rib = new THREE.Mesh(ribGeo, ribMat);
      const r = (0.029 + 0.065) / 2;
      rib.position.set(Math.cos(angle) * r, -0.048, Math.sin(angle) * r);
      rib.rotation.z = Math.cos(angle) * 0.23;
      rib.rotation.x = -Math.sin(angle) * 0.23;
      this.meshGroup.add(rib);
    }

    this.spinAngle = 0;
  }

  _buildDropBeamAndShadow() {
    // 1. Vertical laser drop beam (visualizes 3D height and connects bird to floor projection)
    const beamGeo = new THREE.BufferGeometry();
    const beamPositions = new Float32Array(6); // 2 vertices: (x, y, z) and (x, 0, z)
    beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPositions, 3));
    this.dropBeamMat = new THREE.LineBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.55,
      linewidth: 1.5,
    });
    this.dropBeam = new THREE.Line(beamGeo, this.dropBeamMat);
    this.dropBeam.frustumCulled = false;
    this.dropBeam.visible = false;
    this.scene.add(this.dropBeam);

    // 2. Direct ground drop shadow disk
    const shadowGeo = new THREE.CircleGeometry(0.24, 24);
    this.groundShadowMat = new THREE.MeshBasicMaterial({
      color: 0x050D1A,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.groundShadow = new THREE.Mesh(shadowGeo, this.groundShadowMat);
    this.groundShadow.rotation.x = -Math.PI / 2;
    this.groundShadow.position.y = 0.003;
    this.groundShadow.visible = false;
    this.scene.add(this.groundShadow);
  }

  _buildLandingRing() {
    const ringGroup = new THREE.Group();

    // 1. Target boundary ring
    const baseGeo = new THREE.RingGeometry(0.38, 0.45, 32);
    this.landingRingMat = new THREE.MeshBasicMaterial({
      color: 0xFACC15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const baseMesh = new THREE.Mesh(baseGeo, this.landingRingMat);
    baseMesh.rotation.x = -Math.PI / 2;
    ringGroup.add(baseMesh);

    // 2. Crosshair tick marks (N, S, E, W)
    const tickGeo = new THREE.PlaneGeometry(0.04, 0.16);
    const tickMat = this.landingRingMat;
    const ticks = [
      { x: 0, z: -0.48, rotZ: 0 },
      { x: 0, z: 0.48, rotZ: 0 },
      { x: -0.48, z: 0, rotZ: Math.PI / 2 },
      { x: 0.48, z: 0, rotZ: Math.PI / 2 },
    ];
    ticks.forEach(t => {
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.rotation.x = -Math.PI / 2;
      tick.rotation.z = t.rotZ;
      tick.position.set(t.x, 0, t.z);
      ringGroup.add(tick);
    });

    // 3. Contracting Countdown Timing Ring (contracts smoothly to bullseye on arrival)
    const timingGeo = new THREE.RingGeometry(0.48, 0.54, 32);
    this.timingRingMat = new THREE.MeshBasicMaterial({
      color: 0xFACC15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.timingRingMesh = new THREE.Mesh(timingGeo, this.timingRingMat);
    this.timingRingMesh.rotation.x = -Math.PI / 2;
    ringGroup.add(this.timingRingMesh);

    // 4. Sweet-Spot Pulsing Halo
    const haloGeo = new THREE.RingGeometry(0.18, 0.36, 32);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0x22C55E,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
    this.haloMesh.rotation.x = -Math.PI / 2;
    ringGroup.add(this.haloMesh);

    // 5. Center focal bullseye dot
    const dotGeo = new THREE.CircleGeometry(0.12, 20);
    this.landingDotMat = new THREE.MeshBasicMaterial({
      color: 0xFACC15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    this.dotMesh = new THREE.Mesh(dotGeo, this.landingDotMat);
    this.dotMesh.rotation.x = -Math.PI / 2;
    ringGroup.add(this.dotMesh);

    this.landingRing = ringGroup;
    this.landingRing.position.y = 0.005;
    this.landingRing.visible = false;
    this.scene.add(this.landingRing);
  }

  _buildTrailLine() {
    // Dynamic 3D trajectory trail
    this.maxTrailPoints = 30;
    this.trailPositions = new Float32Array(this.maxTrailPoints * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));

    this.trailMat = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.65,
      linewidth: 2,
    });

    this.trailLine = new THREE.Line(trailGeo, this.trailMat);
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);
  }

  update(shuttlecock, player = null) {
    if (!shuttlecock) {
      this.meshGroup.visible = false;
      this.landingRing.visible = false;
      this.trailLine.visible = false;
      if (this.dropBeam) this.dropBeam.visible = false;
      if (this.groundShadow) this.groundShadow.visible = false;
      return;
    }

    this.meshGroup.visible = true;

    // 1. Position in 3D space (mapped to camera perspective)
    const posX = -shuttlecock.x;
    const posY = Math.max(0.04, shuttlecock.y);
    const posZ = shuttlecock.z;
    this.meshGroup.position.set(posX, posY, posZ);

    // 2. Orient cork towards flight direction with axial aerodynamic spin
    const speed = Math.hypot(shuttlecock.vx || 0, shuttlecock.vy || 0, shuttlecock.vz || 0);
    if (speed > 0.2 && shuttlecock.inFlight) {
      const dir = new THREE.Vector3(-shuttlecock.vx, shuttlecock.vy, shuttlecock.vz).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      this.spinAngle = ((this.spinAngle || 0) + speed * 0.08) % (Math.PI * 2);
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(up, this.spinAngle);
      quat.multiply(rollQuat);
      this.meshGroup.quaternion.copy(quat);
    } else {
      this.meshGroup.rotation.set(Math.PI / 2, 0, 0);
    }

    // 3. Vertical laser drop beam and ground drop shadow
    if (shuttlecock.inFlight && this.dropBeam && this.groundShadow) {
      this.dropBeam.visible = true;
      const beamPos = this.dropBeam.geometry.attributes.position.array;
      beamPos[0] = posX; beamPos[1] = posY; beamPos[2] = posZ;
      beamPos[3] = posX; beamPos[4] = 0.005; beamPos[5] = posZ;
      this.dropBeam.geometry.attributes.position.needsUpdate = true;

      this.groundShadow.visible = true;
      this.groundShadow.position.set(posX, 0.004, posZ);
      const height = Math.max(0, shuttlecock.y);
      const shadowScale = Math.max(0.4, Math.min(1.4, 0.45 + height * 0.2));
      this.groundShadow.scale.set(shadowScale, shadowScale, 1);
      this.groundShadowMat.opacity = Math.max(0.18, 0.65 - height * 0.12);
    } else {
      if (this.dropBeam) this.dropBeam.visible = false;
      if (this.groundShadow) this.groundShadow.visible = false;
    }

    // 4. Arcade Sweet-Spot Landing Reticle
    if (shuttlecock.inFlight && shuttlecock.lastHitter === 'opponent' && shuttlecock.trajectory) {
      const traj = shuttlecock.trajectory;
      const t = traj.duration > 0 ? Math.min(1, Math.max(0, traj.elapsed / traj.duration)) : 0;
      const target = traj.target || traj.targetPos;

      if (target) {
        this.landingRing.visible = true;
        this.landingRing.position.set(-target.x, 0.005, target.z);

        // Contracting countdown wave: starts wide (2.5x) and contracts smoothly to target (1.0x)
        const contractScale = Math.max(0.95, 1.0 + (1 - t) * 1.55);
        this.timingRingMesh.scale.set(contractScale, contractScale, 1);

        // Check sweet spot hitting window relative to player
        const canHit = (player && shuttlecock.isHittableBy) ? shuttlecock.isHittableBy('player', player) : (t >= 0.65);
        const zTiming = player ? (shuttlecock.z - player.z) : 0;
        const inSweetSpot = canHit && (!player || (zTiming >= -0.15 && zTiming <= 0.28));
        const isLate = canHit && player && (zTiming < -0.15);

        if (inSweetSpot) {
          // 🟢 SWEET SPOT! HIT NOW!
          const pulse = 1.0 + Math.sin(performance.now() * 0.016) * 0.12;
          this.landingRingMat.color.setHex(0x22C55E); // Radiant emerald
          this.timingRingMat.color.setHex(0x4ADE80);
          this.landingDotMat.color.setHex(0x22C55E);

          this.haloMat.color.setHex(0x22C55E);
          this.haloMat.opacity = 0.75 + Math.sin(performance.now() * 0.016) * 0.2;
          this.haloMesh.scale.set(pulse, pulse, 1);
          this.dotMesh.scale.set(pulse * 1.1, pulse * 1.1, 1);
        } else if (isLate) {
          // 🟠 LATE RECOVERY WINDOW
          this.landingRingMat.color.setHex(0xFB923C);
          this.timingRingMat.color.setHex(0xFB923C);
          this.landingDotMat.color.setHex(0xFB923C);
          this.haloMat.opacity = 0;
          this.dotMesh.scale.set(1, 1, 1);
        } else {
          // 🟡 APPROACHING / EARLY WINDOW
          this.landingRingMat.color.setHex(0xFACC15);
          this.timingRingMat.color.setHex(0xFACC15);
          this.landingDotMat.color.setHex(0xFACC15);
          this.haloMat.opacity = 0;
          this.dotMesh.scale.set(1, 1, 1);
        }
      }
    } else {
      this.landingRing.visible = false;
    }

    // 5. Trail history update
    if (shuttlecock.inFlight && shuttlecock.trailHistory && shuttlecock.trailHistory.length > 1) {
      this.trailLine.visible = true;
      const trail = shuttlecock.trailHistory;
      const count = Math.min(trail.length, this.maxTrailPoints);

      for (let i = 0; i < count; i++) {
        const pt = trail[trail.length - count + i];
        this.trailPositions[i * 3]     = -pt.x;
        this.trailPositions[i * 3 + 1] = pt.y;
        this.trailPositions[i * 3 + 2] = pt.z;
      }

      this.trailLine.geometry.setDrawRange(0, count);
      this.trailLine.geometry.attributes.position.needsUpdate = true;

      // Color trail based on shot type
      const trailColor = TRAIL_COLORS_HEX[shuttlecock.currentShotType || shuttlecock.shotType] || 0xFFFFFF;
      this.trailMat.color.setHex(trailColor);
    } else {
      this.trailLine.visible = false;
    }
  }
}
