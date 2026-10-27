// ============================================================================
// RED DOME OUTPOST — Three.js Scene Manager, Camera, Raycaster & VFX
// ============================================================================

import * as THREE from "../../vendor/three.module.js";
import { DOME_TIERS } from "../content/campaignData.js";
import {
  createHubMesh,
  createDomeAssembly,
  createLandingPadAndRocket,
  createInteriorPlateMesh,
  createExteriorPadMesh,
  createBuildingMesh,
  createColonistMesh,
  createRoverMesh,
  createAlienSaucerMesh,
} from "./meshFactory.js";

export class SceneManager {
  constructor(canvas, sim, onNodePicked) {
    this.canvas = canvas;
    this.sim = sim;
    this.onNodePicked = onNodePicked;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdc9364);
    this.scene.fog = new THREE.FogExp2(0xdc9364, 0.012);

    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 180);

    // Camera orbital state
    this.cameraOrbitAngle = 0.0; // Facing north (-Z is back, +Z is front)
    this.cameraElevation = 0.62;
    this.cameraDistance = 28.5;
    this.targetOrbitAngle = 0.0;
    this.targetElevation = 0.62;
    this.targetDistance = 28.5;
    this.cameraLookAt = new THREE.Vector3(0, 1.2, 0.8);
    this.targetLookAt = new THREE.Vector3(0, 1.2, 0.8);

    this.raycaster = new THREE.Raycaster();
    this.pointerNDC = new THREE.Vector2();
    this.pickableMeshes = [];

    // Scene state maps
    this.currentDomeTier = 0;
    this.plateMeshMap = new Map(); // nodeId -> Group
    this.buildingMeshMap = new Map(); // nodeId -> { key, mesh, popProgress }
    this.roverMeshes = [];
    this.colonistMeshes = [];
    this.laserBolts = [];
    this.explosionParticles = [];
    this.confettiActive = false;
    this.rocketLandingTimer = 0; // >0 while rocket is descending

    this._initLights();
    this._initTerrainAndProps();
    this._initColonyStructures();
    this._initWeatherAndVFX();
    this._bindPointerControls();
    this.resize();
  }

  _initLights() {
    this.ambientLight = new THREE.HemisphereLight(0xffe7cc, 0x8f4e32, 0.92);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1dc, 1.55);
    this.sunLight.position.set(18, 28, 16);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 80;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0xffad70, 0.48);
    this.rimLight.position.set(-20, 12, -16);
    this.scene.add(this.rimLight);

    // Night Raider eerie green point light
    this.raiderLight = new THREE.PointLight(0x69f5be, 0, 22);
    this.raiderLight.position.set(0, 7, 0);
    this.scene.add(this.raiderLight);
  }

  _initTerrainAndProps() {
    // Procedural Martian Dune Terrain with procedural canvas ripple texture
    const rippleCanvas = document.createElement("canvas");
    rippleCanvas.width = 512;
    rippleCanvas.height = 512;
    const ctx = rippleCanvas.getContext("2d");
    ctx.fillStyle = "#c97642";
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 6) {
      const wave = Math.sin(y * 0.08) * 10;
      ctx.fillStyle = y % 12 === 0 ? "#bf6c39" : "#d4804b";
      ctx.fillRect(0, y + wave * 0.15, 512, 3);
    }
    // Fine sand speckles
    for (let i = 0; i < 2400; i++) {
      const sx = (i * 97) % 512;
      const sy = (i * 53) % 512;
      ctx.fillStyle = i % 2 === 0 ? "rgba(110,48,20,0.22)" : "rgba(255,195,140,0.18)";
      ctx.fillRect(sx, sy, 2, 2);
    }
    const sandTex = new THREE.CanvasTexture(rippleCanvas);
    sandTex.wrapS = THREE.RepeatWrapping;
    sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(14, 14);

    const terrainGeo = new THREE.PlaneGeometry(160, 160, 96, 96);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.hypot(x, z);
      // Keep the colony basin (r < 17) completely flat for the dome, pads, and landing pad
      if (dist > 16.5) {
        const blend = Math.min(1, (dist - 16.5) / 10);
        const h =
          (Math.sin(x * 0.11 + z * 0.07) * 1.4 +
            Math.cos(x * 0.06 - z * 0.12) * 1.1) *
          blend;
        pos.setY(i, h);
      } else {
        // Subtle sand trench ring just outside the dome
        const ringDip =
          dist > 9 && dist < 15.5
            ? -Math.sin(((dist - 9) / 6.5) * Math.PI) * 0.18
            : 0;
        pos.setY(i, ringDip);
      }
    }
    terrainGeo.computeVertexNormals();

    this.terrainMat = new THREE.MeshStandardMaterial({
      color: 0xd9824b,
      map: sandTex,
      roughness: 0.88,
      metalness: 0.04,
    });
    this.terrainMesh = new THREE.Mesh(terrainGeo, this.terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Scattered Martian Rocks & Craters around the outskirts
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9e5936,
      roughness: 0.85,
      flatShading: true,
    });
    const rockCoords = [
      [-14, -15, 1.3],
      [-8, -17, 0.9],
      [6, -16, 0.8],
      [14, -14, 1.2],
      [18, -6, 1.5],
      [19, 8, 1.4],
      [-18, 5, 0.9],
      [-16, -8, 1.1],
      [12, 16, 1.0],
      [-12, 17, 1.25],
    ];
    for (const [rx, rz, scale] of rockCoords) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(scale, 0),
        rockMat
      );
      rock.position.set(rx, scale * 0.42, rz);
      rock.rotation.set(rx * 0.3, rz * 0.4, 0.2);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    // Two shallow Martian craters matching landscape_1.png & landscape_3.png
    for (const [cx, cz, cr] of [
      [16.5, -6.5, 2.2],
      [-19.5, -5.0, 2.4],
    ]) {
      const crater = new THREE.Mesh(
        new THREE.TorusGeometry(cr, 0.45, 8, 20),
        rockMat
      );
      crater.rotation.x = Math.PI / 2;
      crater.rotation.y = 0.15;
      crater.position.set(cx, 0.18, cz);
      crater.castShadow = true;
      crater.receiveShadow = true;
      this.scene.add(crater);
    }
  }

  _initColonyStructures() {
    this.colonyRoot = new THREE.Group();
    this.scene.add(this.colonyRoot);

    // Central Command Hub
    this.hubMesh = createHubMesh();
    this.colonyRoot.add(this.hubMesh);
    this.hubMesh.traverse((child) => {
      if (child.isMesh) {
        child.userData.nodeId = "hub";
        this.pickableMeshes.push(child);
      }
    });

    // Rocket Landing Pad & Lander (placed at North-West / Top-Back gap)
    this.landingAssembly = createLandingPadAndRocket(-1.72, 11.8);
    this.colonyRoot.add(this.landingAssembly);

    // Create all 24 interior plates and 19 exterior pads
    for (const plate of this.sim.interiorPlates) {
      const mesh = createInteriorPlateMesh(plate);
      this.colonyRoot.add(mesh);
      this.plateMeshMap.set(plate.id, mesh);
      mesh.traverse((child) => {
        if (child.isMesh) {
          child.userData.nodeId = plate.id;
          this.pickableMeshes.push(child);
        }
      });
    }

    for (const pad of this.sim.exteriorPads) {
      const mesh = createExteriorPadMesh(pad);
      this.colonyRoot.add(mesh);
      this.plateMeshMap.set(pad.id, mesh);
      mesh.traverse((child) => {
        if (child.isMesh) {
          child.userData.nodeId = pad.id;
          this.pickableMeshes.push(child);
        }
      });
    }

    // Alien Raider Saucer (hidden until raider hazard starts)
    this.saucerMesh = createAlienSaucerMesh();
    this.saucerMesh.visible = false;
    this.scene.add(this.saucerMesh);

    this._rebuildDomeForTier(this.sim.domeTier);
  }

  _rebuildDomeForTier(tier) {
    if (this.currentDomeTier === tier && this.domeAssembly) return;
    this.currentDomeTier = tier;
    if (this.domeAssembly) {
      this.colonyRoot.remove(this.domeAssembly);
    }
    const info = DOME_TIERS[tier];
    this.domeAssembly = createDomeAssembly(
      info.domeRadius,
      info.domeHeight,
      info.collarTubeRadius
    );
    this.colonyRoot.add(this.domeAssembly);

    // Adjust exterior pad and landing pad distances slightly so they sit cleanly outside the current dome collar
    const padRingRadius = info.domeRadius + 2.4;
    for (const pad of this.sim.exteriorPads) {
      const r = padRingRadius + (pad.index % 2 === 0 ? 0.35 : -0.15);
      pad.x = Number((Math.cos(pad.angle) * r).toFixed(3));
      pad.z = Number((Math.sin(pad.angle) * r).toFixed(3));
      const padMesh = this.plateMeshMap.get(pad.id);
      if (padMesh) {
        padMesh.position.set(pad.x, 0.03, pad.z);
      }
    }

    const landAngle = -1.62;
    const landDist = info.domeRadius + 3.1;
    this.landingAssembly.position.set(
      Math.cos(landAngle) * landDist,
      0.02,
      Math.sin(landAngle) * landDist
    );
    this.landingAssembly.rotation.y = -landAngle + Math.PI / 2;
  }

  _initWeatherAndVFX() {
    // 1. Swirling Dust Storm Sand Particles
    const stormCount = 420;
    const stormGeo = new THREE.BufferGeometry();
    const stormPositions = new Float32Array(stormCount * 3);
    for (let i = 0; i < stormCount; i++) {
      stormPositions[i * 3] = (Math.random() - 0.5) * 42;
      stormPositions[i * 3 + 1] = Math.random() * 12 + 0.3;
      stormPositions[i * 3 + 2] = (Math.random() - 0.5) * 42;
    }
    stormGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(stormPositions, 3)
    );
    const stormMat = new THREE.PointsMaterial({
      color: 0xffc68a,
      size: 0.42,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.stormParticles = new THREE.Points(stormGeo, stormMat);
    this.scene.add(this.stormParticles);

    // 2. Celebratory 3D Confetti Rain (matches landscape_5.png & portrait_5.png)
    this.confettiGroup = new THREE.Group();
    this.confettiGroup.visible = false;
    const confettiColors = [
      0x5ce1e6, 0xffde59, 0xff66c4, 0x7ed957, 0xff914d, 0xffffff,
    ];
    const pieceGeo = new THREE.PlaneGeometry(0.24, 0.11);
    for (let i = 0; i < 130; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: confettiColors[i % confettiColors.length],
        side: THREE.DoubleSide,
      });
      const piece = new THREE.Mesh(pieceGeo, mat);
      const angle = Math.random() * Math.PI * 2;
      const rad = 2 + Math.random() * 14;
      piece.position.set(
        Math.cos(angle) * rad,
        Math.random() * 11 + 0.5,
        Math.sin(angle) * rad
      );
      piece.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      piece.userData = {
        fallSpeed: 1.4 + Math.random() * 1.5,
        spinX: (Math.random() - 0.5) * 4,
        spinY: (Math.random() - 0.5) * 4,
      };
      this.confettiGroup.add(piece);
    }
    this.scene.add(this.confettiGroup);
  }

  _bindPointerControls() {
    let isDragging = false;
    let downX = 0;
    let downY = 0;
    let movedDist = 0;

    this.canvas.addEventListener("pointerdown", (e) => {
      isDragging = true;
      downX = e.clientX;
      downY = e.clientY;
      movedDist = 0;
    });

    window.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      movedDist += Math.hypot(dx, dy);
      downX = e.clientX;
      downY = e.clientY;

      if (movedDist > 6) {
        this.targetOrbitAngle -= dx * 0.0055;
        this.targetElevation = Math.max(
          0.28,
          Math.min(1.18, this.targetElevation + dy * 0.004)
        );
      }
    });

    window.addEventListener("pointerup", (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (movedDist <= 8 && e.target === this.canvas) {
        this.pickAtClientCoords(e.clientX, e.clientY);
      }
    });

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.targetDistance = Math.max(
          11,
          Math.min(42, this.targetDistance + e.deltaY * 0.018)
        );
      },
      { passive: false }
    );
  }

  pickAtClientCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickableMeshes, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && !obj.userData?.nodeId) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.nodeId) {
        const nodeId = obj.userData.nodeId;
        if (this.sim.isNodeUnlocked(nodeId)) {
          if (this.onNodePicked) this.onNodePicked(nodeId);
          return nodeId;
        }
      }
    }
    return null;
  }

  // Camera view presets for gameplay & cinematic verification
  setCameraPreset(presetName) {
    const isPortrait = window.innerHeight > window.innerWidth;
    const distScale = isPortrait ? 1.32 : 1.0;

    if (presetName === "landing") {
      const lp = this.landingAssembly.position;
      this.targetLookAt.set(lp.x * 0.48, 2.1, lp.z * 0.48);
      this.targetOrbitAngle = -0.32;
      this.targetElevation = 0.24;
      this.targetDistance = 14.5 * distScale;
    } else if (presetName === "closeup") {
      this.targetLookAt.set(0, 1.35, 0.3);
      this.targetOrbitAngle = 0.0;
      this.targetElevation = 0.42;
      this.targetDistance = 13.8 * distScale;
    } else if (presetName === "storm") {
      this.targetLookAt.set(0, 1.5, 0.2);
      this.targetOrbitAngle = 0.08;
      this.targetElevation = 0.36;
      this.targetDistance = 15.8 * distScale;
    } else if (presetName === "raider") {
      this.targetLookAt.set(0, 1.8, 0);
      this.targetOrbitAngle = -0.05;
      this.targetElevation = 0.38;
      this.targetDistance = 19.2 * distScale;
    } else {
      // Default overview matching landscape_3.png / portrait_3.png
      const tier = this.sim.domeTier;
      const baseDist = tier === 1 ? 24.5 : tier === 2 ? 28.5 : 31.5;
      this.targetLookAt.set(0, 1.1, 0.9);
      this.targetOrbitAngle = 0.0;
      this.targetElevation = 0.64;
      this.targetDistance = baseDist * distScale;
    }
  }

  triggerRocketTouchdownAnimation() {
    this.rocketLandingTimer = 3.2;
  }

  spawnLaserBolt(fromX, fromY, fromZ, toX, toY, toZ) {
    const start = new THREE.Vector3(fromX, fromY, fromZ);
    const end = new THREE.Vector3(toX, toY, toZ);
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffd659,
      transparent: true,
      opacity: 0.95,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.laserBolts.push({ mesh: line, life: 0.18 });
  }

  spawnSaucerExplosion(x, y, z) {
    const colors = [0xff8c2b, 0xffdf59, 0x7ef2be, 0xff5252];
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.16, 0),
        new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          transparent: true,
          opacity: 1.0,
        })
      );
      m.position.set(x, y, z);
      const vx = (Math.random() - 0.5) * 9;
      const vy = Math.random() * 6 + 1;
      const vz = (Math.random() - 0.5) * 9;
      this.scene.add(m);
      this.explosionParticles.push({ mesh: m, vx, vy, vz, life: 1.1 });
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    // Slightly wider vertical FOV in portrait orientation so the full dome + ring of outdoor pads stays framed
    this.camera.fov = h > w ? 46 : 38;
    this.camera.updateProjectionMatrix();
  }

  updateAndRender(dt) {
    // 1. Rebuild dome if domeTier changed
    if (this.currentDomeTier !== this.sim.domeTier) {
      this._rebuildDomeForTier(this.sim.domeTier);
    }

    // 2. Update unlocked/selected states on plates & pads
    for (const plate of this.sim.interiorPlates) {
      const mesh = this.plateMeshMap.get(plate.id);
      if (!mesh) continue;
      const unlocked = plate.minTier <= this.sim.domeTier;
      mesh.visible = unlocked;
      if (unlocked) {
        const isSelected = this.sim.selectedNodeId === plate.id;
        mesh.userData.innerMat.color.setHex(isSelected ? 0xffe296 : 0xc49a72);
        mesh.userData.innerMat.emissive.setHex(isSelected ? 0xd99b26 : 0x000000);
        mesh.userData.innerMat.emissiveIntensity = isSelected ? 0.55 : 0.0;
        mesh.userData.borderMat.color.setHex(isSelected ? 0xfff3c4 : 0xdfd0a6);
      }
    }

    for (const pad of this.sim.exteriorPads) {
      const mesh = this.plateMeshMap.get(pad.id);
      if (!mesh) continue;
      const unlocked = pad.minTier <= this.sim.domeTier;
      mesh.visible = unlocked;
      if (unlocked) {
        const isSelected = this.sim.selectedNodeId === pad.id;
        mesh.userData.innerMat.color.setHex(isSelected ? 0xffe296 : 0xb68b62);
        mesh.userData.innerMat.emissive.setHex(isSelected ? 0xd99b26 : 0x000000);
        mesh.userData.innerMat.emissiveIntensity = isSelected ? 0.55 : 0.0;
        mesh.userData.borderMat.color.setHex(isSelected ? 0xfff3c4 : 0xe0cb96);
      }
    }

    // 3. Synchronize 3D Building Meshes with sim.buildingsByNode
    for (const [nodeId, entry] of this.buildingMeshMap.entries()) {
      const simBld = this.sim.buildingsByNode.get(nodeId);
      const expectedKey = simBld ? `${simBld.type}_${simBld.level}` : null;
      if (!simBld || entry.key !== expectedKey) {
        this.colonyRoot.remove(entry.mesh);
        this.buildingMeshMap.delete(nodeId);
      }
    }

    for (const [nodeId, simBld] of this.sim.buildingsByNode.entries()) {
      const expectedKey = `${simBld.type}_${simBld.level}`;
      if (!this.buildingMeshMap.has(nodeId)) {
        const node = this.sim.nodeMap.get(nodeId);
        if (!node) continue;
        const bMesh = createBuildingMesh(simBld.type, simBld.level);
        bMesh.position.set(node.x, 0.06, node.z);
        bMesh.traverse((child) => {
          if (child.isMesh) {
            child.userData.nodeId = nodeId;
            this.pickableMeshes.push(child);
          }
        });
        this.colonyRoot.add(bMesh);
        this.buildingMeshMap.set(nodeId, {
          key: expectedKey,
          mesh: bMesh,
          popProgress: 0.15,
          targetScale: 1 + (simBld.level - 1) * 0.08,
        });
      }
    }

    // Animate building sub-parts & construction pop-in
    const now = this.sim.elapsedSec;
    for (const entry of this.buildingMeshMap.values()) {
      if (entry.popProgress < 1) {
        entry.popProgress = Math.min(1, entry.popProgress + dt * 4.5);
        const s = entry.targetScale * (0.2 + 0.8 * entry.popProgress);
        entry.mesh.scale.setScalar(s);
      }
      const parts = entry.mesh.userData.animatedParts || [];
      for (const p of parts) {
        if (p.kind === "spin") {
          p.mesh.rotation.z += dt * p.speed;
        } else if (p.kind === "bubble") {
          const offset = ((now * 0.65 + p.phase) % 1.2) * 0.7;
          p.mesh.position.y = p.baseY + offset;
        } else if (p.kind === "bob") {
          p.mesh.position.y = p.baseY + Math.sin(now * 3.0 + p.phase) * 0.08;
        } else if (p.kind === "turret_head" && this.sim.hazard.type === "raider") {
          p.mesh.rotation.y += dt * 2.2;
        }
      }
    }

    // 4. Update Spiral Stress Cracks on the Glass Dome
    if (this.domeAssembly?.userData?.crackGroup) {
      const cracks = this.domeAssembly.userData.crackGroup.children;
      const damageFrac = Math.max(
        0,
        Math.min(1, (98 - this.sim.domeIntegrityPct) / 65)
      );
      // Also show cracks during active storm or raider attack matching screenshots
      const activeHazardFrac =
        this.sim.hazard.type === "storm" || this.sim.hazard.type === "raider"
          ? Math.max(damageFrac, 0.85)
          : damageFrac;
      const visibleCount = Math.round(activeHazardFrac * cracks.length);
      for (let i = 0; i < cracks.length; i++) {
        cracks[i].visible = i < visibleCount;
      }
    }

    // 5. Rocket Lander Descent Animation
    if (this.landingAssembly?.userData?.rocket) {
      const { rocket, flame } = this.landingAssembly.userData;
      if (this.rocketLandingTimer > 0) {
        this.rocketLandingTimer = Math.max(0, this.rocketLandingTimer - dt);
        const t = this.rocketLandingTimer / 3.2; // 1 -> 0
        rocket.position.y = t * t * 14.0;
        flame.visible = this.rocketLandingTimer > 0.15;
        flame.scale.setScalar(0.85 + Math.sin(now * 28) * 0.2);
      } else {
        rocket.position.y = 0;
        flame.visible = false;
      }
    }

    // 6. Synchronize Rover Droids & Walking Astronaut Colonists
    while (this.roverMeshes.length < this.sim.rovers.length) {
      const rMesh = createRoverMesh();
      this.colonyRoot.add(rMesh);
      this.roverMeshes.push(rMesh);
    }
    for (let i = 0; i < this.roverMeshes.length; i++) {
      const rMesh = this.roverMeshes[i];
      const rData = this.sim.rovers[i];
      if (!rData) {
        rMesh.visible = false;
        continue;
      }
      rMesh.visible = true;
      rMesh.position.set(rData.x, 0.05, rData.z);
      rMesh.rotation.y = -rData.angle;
    }

    while (this.colonistMeshes.length < this.sim.colonists.length) {
      const idx = this.colonistMeshes.length;
      const cData = this.sim.colonists[idx];
      const cMesh = createColonistMesh(cData ? cData.color : "#e87d2f");
      this.colonyRoot.add(cMesh);
      this.colonistMeshes.push(cMesh);
    }
    for (let i = 0; i < this.colonistMeshes.length; i++) {
      const cMesh = this.colonistMeshes[i];
      const cData = this.sim.colonists[i];
      if (!cData) {
        cMesh.visible = false;
        continue;
      }
      cMesh.visible = true;
      const bob = Math.abs(Math.sin(cData.walkPhase)) * 0.07;
      cMesh.position.set(cData.x, 0.05 + bob, cData.z);
      cMesh.rotation.y = Math.atan2(
        cData.targetX - cData.x,
        cData.targetZ - cData.z
      );
    }

    // 7. Atmosphere, Sky, Dust Storm & Night Raider Lighting
    const phase = this.sim.dayPhase;
    if (phase === "night_raid") {
      this.scene.background.setHex(0x28131d);
      this.scene.fog.color.setHex(0x28131d);
      this.scene.fog.density = 0.018;
      this.terrainMat.color.setHex(0x52313a);
      this.sunLight.intensity = 0.42;
      this.ambientLight.intensity = 0.48;
      this.raiderLight.intensity = 2.4;
    } else if (phase === "storm") {
      this.scene.background.setHex(0x9e572b);
      this.scene.fog.color.setHex(0x9e572b);
      this.scene.fog.density = 0.032;
      this.terrainMat.color.setHex(0xb86835);
      this.sunLight.intensity = 0.85;
      this.ambientLight.intensity = 0.72;
      this.raiderLight.intensity = 0;
    } else {
      this.scene.background.setHex(0xdc9364);
      this.scene.fog.color.setHex(0xdc9364);
      this.scene.fog.density = 0.011;
      this.terrainMat.color.setHex(0xd9824b);
      this.sunLight.intensity = 1.55;
      this.ambientLight.intensity = 0.92;
      this.raiderLight.intensity = 0;
    }

    // Dust storm blowing sand particles
    if (phase === "storm") {
      this.stormParticles.material.opacity = 0.68;
      const posAttr = this.stormParticles.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let px = posAttr.getX(i) + dt * 18.0;
        if (px > 21) px = -21;
        posAttr.setX(i, px);
      }
      posAttr.needsUpdate = true;
    } else {
      this.stormParticles.material.opacity = Math.max(
        0,
        this.stormParticles.material.opacity - dt * 1.5
      );
    }

    // Alien Raider Saucer update
    if (this.sim.hazard.type === "raider" && this.sim.hazard.raider) {
      const r = this.sim.hazard.raider;
      this.saucerMesh.visible = true;
      this.saucerMesh.position.set(r.x, r.y, r.z);
      this.saucerMesh.rotation.y += dt * 2.4;
      this.raiderLight.position.set(r.x, r.y - 1.5, r.z);
    } else {
      this.saucerMesh.visible = false;
    }

    // Update active laser bolts & explosion particles
    for (let i = this.laserBolts.length - 1; i >= 0; i--) {
      const b = this.laserBolts[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.laserBolts.splice(i, 1);
      }
    }

    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.life -= dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 9.8 * dt;
      p.mesh.material.opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.explosionParticles.splice(i, 1);
      }
    }

    // Confetti shower update
    this.confettiGroup.visible =
      Boolean(this.confettiActive) || Boolean(this.sim.chapterCleared);
    if (this.confettiGroup.visible) {
      for (const piece of this.confettiGroup.children) {
        piece.position.y -= piece.userData.fallSpeed * dt;
        piece.rotation.x += piece.userData.spinX * dt;
        piece.rotation.y += piece.userData.spinY * dt;
        if (piece.position.y < 0.2) {
          piece.position.y = 10.5;
        }
      }
    }

    // 8. Smooth Camera Interpolation
    const lerpFactor = Math.min(1, dt * 6.5);
    this.cameraOrbitAngle +=
      (this.targetOrbitAngle - this.cameraOrbitAngle) * lerpFactor;
    this.cameraElevation +=
      (this.targetElevation - this.cameraElevation) * lerpFactor;
    this.cameraDistance +=
      (this.targetDistance - this.cameraDistance) * lerpFactor;
    this.cameraLookAt.lerp(this.targetLookAt, lerpFactor);

    const horizDist = Math.cos(this.cameraElevation) * this.cameraDistance;
    const camX =
      this.cameraLookAt.x + Math.sin(this.cameraOrbitAngle) * horizDist;
    const camZ =
      this.cameraLookAt.z + Math.cos(this.cameraOrbitAngle) * horizDist;
    const camY =
      this.cameraLookAt.y + Math.sin(this.cameraElevation) * this.cameraDistance;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.cameraLookAt);

    this.renderer.render(this.scene, this.camera);
  }
}
