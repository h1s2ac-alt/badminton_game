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

  _buildLandingRing() {
    // Projected target reticle on the court surface (larger + with center focal dot)
    const ringGroup = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.35, 0.46, 32);
    this.landingRingMat = new THREE.MeshBasicMaterial({
      color: 0xFACC15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, this.landingRingMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringGroup.add(ringMesh);

    // Center focal dot
    const dotGeo = new THREE.CircleGeometry(0.12, 16);
    this.landingDotMat = new THREE.MeshBasicMaterial({
      color: 0xFACC15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const dotMesh = new THREE.Mesh(dotGeo, this.landingDotMat);
    dotMesh.rotation.x = -Math.PI / 2;
    ringGroup.add(dotMesh);

    this.landingRing = ringGroup;
    this.landingRing.position.y = 0.005; // Just above court surface
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

  update(shuttlecock) {
    if (!shuttlecock) {
      this.meshGroup.visible = false;
      this.landingRing.visible = false;
      this.trailLine.visible = false;
      return;
    }

    this.meshGroup.visible = true;

    // 1. Position in 3D space (mapped to camera perspective)
    this.meshGroup.position.set(-shuttlecock.x, Math.max(0.04, shuttlecock.y), shuttlecock.z);

    // 2. Orient cork towards flight direction with axial aerodynamic spin
    const speed = Math.hypot(shuttlecock.vx || 0, shuttlecock.vy || 0, shuttlecock.vz || 0);
    if (speed > 0.2 && shuttlecock.inFlight) {
      const dir = new THREE.Vector3(-shuttlecock.vx, shuttlecock.vy, shuttlecock.vz).normalize();
      // Shuttle model cork is along +Y, so orient +Y towards flight direction
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      this.spinAngle = ((this.spinAngle || 0) + speed * 0.08) % (Math.PI * 2);
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(up, this.spinAngle);
      quat.multiply(rollQuat);
      this.meshGroup.quaternion.copy(quat);
    } else {
      // Resting on ground
      this.meshGroup.rotation.set(Math.PI / 2, 0, 0);
    }

    // 3. Landing Target Reticle
    if (shuttlecock.inFlight && shuttlecock.lastHitter === 'opponent' && shuttlecock.trajectory) {
      const traj = shuttlecock.trajectory;
      const t = traj.duration > 0 ? Math.min(1, traj.elapsed / traj.duration) : 0;
      const ringScale = Math.max(0.4, (1 - t * 0.7));

      const target = traj.target || traj.targetPos;
      if (target) {
        this.landingRing.visible = true;
        this.landingRing.position.set(-target.x, 0.005, target.z);
        this.landingRing.scale.set(ringScale, ringScale, 1);
      }

      // Flash green when close to hitting sweet-spot
      if (t > 0.65) {
        this.landingRingMat.color.setHex(0x4ADE80);
        this.landingDotMat.color.setHex(0x4ADE80);
      } else {
        this.landingRingMat.color.setHex(0xFACC15);
        this.landingDotMat.color.setHex(0xFACC15);
      }
    } else {
      this.landingRing.visible = false;
    }

    // 4. Trail history update
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
      const trailColor = TRAIL_COLORS_HEX[shuttlecock.shotType] || 0xFFFFFF;
      this.trailMat.color.setHex(trailColor);
    } else {
      this.trailLine.visible = false;
    }
  }
}
