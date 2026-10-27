// ============================================================================
// RED DOME OUTPOST — Procedural Low-Poly 3D Mesh Factory (Three.js)
// ============================================================================

import * as THREE from "../../vendor/three.module.js";
import { BUILDINGS } from "../content/campaignData.js";

// Shared helper for crisp low-poly flat-shaded materials
function flatMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.62,
    metalness: opts.metalness ?? 0.12,
    flatShading: opts.flatShading ?? true,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0.0,
    side: opts.side ?? THREE.FrontSide,
  });
}

// 1. Central Command Hub (Octagonal 2-tier tower + geodesic cupola + antenna + gold airlock door)
export function createHubMesh() {
  const group = new THREE.Group();
  group.name = "CentralCommandHub";

  // Base octagonal plinth
  const baseGeo = new THREE.CylinderGeometry(1.42, 1.55, 1.15, 8);
  const baseMat = flatMat(0xe5ddd6, { roughness: 0.55 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.575;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Gold collar trim between lower and upper tier
  const trimGeo = new THREE.CylinderGeometry(1.36, 1.44, 0.12, 8);
  const goldMat = flatMat(0xd9a13b, { metalness: 0.55, roughness: 0.32 });
  const trimMesh = new THREE.Mesh(trimGeo, goldMat);
  trimMesh.position.y = 1.18;
  group.add(trimMesh);

  // Upper octagonal tier
  const upperGeo = new THREE.CylinderGeometry(1.22, 1.32, 0.9, 8);
  const upperMesh = new THREE.Mesh(upperGeo, baseMat);
  upperMesh.position.y = 1.68;
  upperMesh.castShadow = true;
  group.add(upperMesh);

  // Dark vertical windows around upper tier
  const winGeo = new THREE.BoxGeometry(0.16, 0.42, 0.14);
  const winMat = flatMat(0x2b3947, { roughness: 0.3, metalness: 0.4 });
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8;
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(Math.cos(angle) * 1.24, 1.68, Math.sin(angle) * 1.24);
    win.rotation.y = -angle;
    group.add(win);
  }

  // Faceted silver geodesic roof cupola
  const roofGeo = new THREE.SphereGeometry(
    1.22,
    10,
    6,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.52
  );
  const roofMat = flatMat(0xa5b1bd, { metalness: 0.38, roughness: 0.42 });
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.y = 2.1;
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // Tall antenna mast with two horizontal cross-bars and glowing orange-red top beacon
  const mastGeo = new THREE.CylinderGeometry(0.045, 0.06, 2.2, 6);
  const mastMat = flatMat(0xd5dbe0, { metalness: 0.4 });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.y = 4.15;
  group.add(mast);

  for (const barY of [4.25, 4.72]) {
    const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6);
    const bar = new THREE.Mesh(barGeo, mastMat);
    bar.position.y = barY;
    bar.rotation.z = Math.PI / 2;
    bar.rotation.y = Math.PI / 4;
    group.add(bar);
  }

  const beaconGeo = new THREE.SphereGeometry(0.13, 10, 8);
  const beaconMat = flatMat(0xff6b3d, {
    emissive: 0xff5522,
    emissiveIntensity: 0.85,
    flatShading: false,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = 5.3;
  group.add(beacon);

  // Prominent Gold-Framed Airlock Door facing the front-left plate (-X / +Z diagonal)
  const doorGroup = new THREE.Group();
  const doorAngle = Math.PI * 0.75; // points toward front-left tile in isometric view
  doorGroup.position.set(
    Math.cos(doorAngle) * 1.38,
    0.88,
    Math.sin(doorAngle) * 1.38
  );
  doorGroup.rotation.y = -doorAngle + Math.PI / 2;

  const frameGeo = new THREE.BoxGeometry(0.88, 1.76, 0.22);
  const frameMesh = new THREE.Mesh(frameGeo, goldMat);
  frameMesh.castShadow = true;
  doorGroup.add(frameMesh);

  const innerDoorGeo = new THREE.BoxGeometry(0.68, 1.58, 0.25);
  const innerDoorMat = flatMat(0x242a30, { roughness: 0.4 });
  const innerDoor = new THREE.Mesh(innerDoorGeo, innerDoorMat);
  doorGroup.add(innerDoor);

  group.add(doorGroup);

  group.userData = { nodeId: "hub", zone: "hub", beacon };
  return group;
}

// 2. Geodesic Glass Dome + Golden Collar + Dynamic Spiral Stress Cracks
export function createDomeAssembly(radius = 7.4, height = 5.4, tube = 0.34) {
  const group = new THREE.Group();
  group.name = "ColonyGlassDome";

  // Warm metallic gold torus collar around dome perimeter
  const collarGeo = new THREE.TorusGeometry(radius, tube, 16, 64);
  collarGeo.rotateX(Math.PI / 2);
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xd89636,
    metalness: 0.72,
    roughness: 0.24,
  });
  const collarMesh = new THREE.Mesh(collarGeo, collarMat);
  collarMesh.position.y = 0.16;
  collarMesh.receiveShadow = true;
  collarMesh.castShadow = true;
  group.add(collarMesh);

  // Interior smooth circular sand floor disc
  const floorGeo = new THREE.CircleGeometry(radius - 0.1, 48);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xc9966b,
    roughness: 0.88,
    metalness: 0.04,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = 0.02;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Translucent glass dome hemisphere
  const domeGeo = new THREE.SphereGeometry(
    radius,
    32,
    18,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.5
  );
  const scaleY = height / radius;
  domeGeo.scale(1, scaleY, 1);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4ece6,
    transparent: true,
    opacity: 0.24,
    roughness: 0.12,
    metalness: 0.05,
    transmission: 0.15,
    reflectivity: 0.7,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glassMesh = new THREE.Mesh(domeGeo, glassMat);
  glassMesh.position.y = 0.15;
  glassMesh.raycast = () => {}; // Let pointer clicks pass straight through the glass dome to interior plates!
  group.add(glassMesh);

  // Subtle hexagonal geodesic panel wireframe overlay
  const hexWireGeo = new THREE.IcosahedronGeometry(radius * 1.002, 2);
  hexWireGeo.scale(1, scaleY, 1);
  // Clip vertices below y=0
  const posAttr = hexWireGeo.attributes.position;
  const edgePoints = [];
  const edges = new THREE.EdgesGeometry(hexWireGeo, 8);
  const ePos = edges.attributes.position;
  for (let i = 0; i < ePos.count; i += 2) {
    const y1 = ePos.getY(i);
    const y2 = ePos.getY(i + 1);
    if (y1 >= -0.05 && y2 >= -0.05) {
      edgePoints.push(
        new THREE.Vector3(ePos.getX(i), Math.max(0, y1), ePos.getZ(i)),
        new THREE.Vector3(ePos.getX(i + 1), Math.max(0, y2), ePos.getZ(i + 1))
      );
    }
  }
  const wireLineGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
  const wireLineMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const wireLines = new THREE.LineSegments(wireLineGeo, wireLineMat);
  wireLines.position.y = 0.15;
  wireLines.raycast = () => {};
  group.add(wireLines);

  // Dynamic Pinwheel / Spiral Stress Cracks (shown when domeIntegrityPct < 98%)
  // Matches the 6-armed curved white spiral cracks in landscape_1.png & landscape_4.png
  const crackGroup = new THREE.Group();
  crackGroup.position.y = 0.16;
  const crackSeeds = [
    { theta: 0.4, phi: 0.95 },
    { theta: 1.3, phi: 1.15 },
    { theta: 2.2, phi: 0.85 },
    { theta: 3.1, phi: 1.1 },
    { theta: 4.0, phi: 0.9 },
    { theta: 4.9, phi: 1.18 },
    { theta: 5.7, phi: 0.82 },
    { theta: 0.9, phi: 0.55 },
    { theta: 2.6, phi: 0.58 },
    { theta: 4.4, phi: 0.52 },
    { theta: 1.8, phi: 1.32 },
    { theta: 3.6, phi: 1.3 },
    { theta: 5.2, phi: 1.28 },
    { theta: 0.2, phi: 0.32 },
  ];

  const crackMat = new THREE.LineBasicMaterial({
    color: 0xfff6e8,
    transparent: true,
    opacity: 0.72,
  });

  for (const seed of crackSeeds) {
    const pinwheelPts = [];
    const arms = 6;
    const armLen = radius * 0.26;
    // Surface center normal
    const cx = radius * Math.sin(seed.phi) * Math.cos(seed.theta);
    const cy = radius * scaleY * Math.cos(seed.phi);
    const cz = radius * Math.sin(seed.phi) * Math.sin(seed.theta);
    const center = new THREE.Vector3(cx, cy, cz);
    const normal = center.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const tangent1 = new THREE.Vector3().crossVectors(normal, up).normalize();
    if (tangent1.lengthSq() < 0.01) tangent1.set(1, 0, 0);
    const tangent2 = new THREE.Vector3()
      .crossVectors(normal, tangent1)
      .normalize();

    for (let a = 0; a < arms; a++) {
      const baseAngle = (a * Math.PI * 2) / arms;
      const segs = 7;
      let prev = center.clone();
      for (let s = 1; s <= segs; s++) {
        const frac = s / segs;
        const spiralAngle = baseAngle + frac * 0.75; // curved pinwheel sweep
        const dist = frac * armLen;
        const pt = center
          .clone()
          .addScaledVector(tangent1, Math.cos(spiralAngle) * dist)
          .addScaledVector(tangent2, Math.sin(spiralAngle) * dist);
        // Project back onto ellipsoid dome surface
        pt.y /= scaleY;
        pt.normalize().multiplyScalar(radius * 1.006);
        pt.y *= scaleY;
        if (pt.y > 0.1) {
          pinwheelPts.push(prev.clone(), pt.clone());
        }
        prev = pt;
      }
    }
    const pwGeo = new THREE.BufferGeometry().setFromPoints(pinwheelPts);
    const pwLine = new THREE.LineSegments(pwGeo, crackMat);
    pwLine.visible = false;
    pwLine.raycast = () => {};
    crackGroup.add(pwLine);
  }
  group.add(crackGroup);

  group.userData = {
    collarMesh,
    glassMesh,
    wireLines,
    crackGroup,
  };
  return group;
}

// 3. Rocket Landing Pad + Ramp + Descending Multi-Fin Rocket Lander
export function createLandingPadAndRocket(angle = -2.18, dist = 12.2) {
  const group = new THREE.Group();
  const px = Math.cos(angle) * dist;
  const pz = Math.sin(angle) * dist;
  group.position.set(px, 0.02, pz);
  group.rotation.y = -angle + Math.PI / 2;

  // Outer dark pad ring
  const padGeo = new THREE.CylinderGeometry(2.35, 2.5, 0.14, 32);
  const darkMat = flatMat(0x2d2622, { roughness: 0.8 });
  const padMesh = new THREE.Mesh(padGeo, darkMat);
  padMesh.position.y = 0.07;
  padMesh.receiveShadow = true;
  group.add(padMesh);

  // Golden landing ring
  const ringGeo = new THREE.RingGeometry(1.75, 2.02, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const goldMat = flatMat(0xe5a23c, {
    metalness: 0.45,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeo, goldMat);
  ringMesh.position.y = 0.15;
  group.add(ringMesh);

  // Connecting walkway ramp toward the dome
  const rampGeo = new THREE.BoxGeometry(1.45, 0.08, 2.4);
  const rampMat = flatMat(0x634836, { roughness: 0.85 });
  const ramp = new THREE.Mesh(rampGeo, rampMat);
  ramp.position.set(0, 0.04, 2.9);
  ramp.receiveShadow = true;
  group.add(ramp);

  const dashGeo = new THREE.BoxGeometry(0.16, 0.09, 0.65);
  const dash = new THREE.Mesh(dashGeo, goldMat);
  dash.position.set(0, 0.05, 2.9);
  group.add(dash);

  // Rocket Lander mesh (matches landscape_6.png & portrait_6.png)
  const rocket = new THREE.Group();
  rocket.name = "RocketLander";

  // Main cylindrical fuselage
  const bodyGeo = new THREE.CylinderGeometry(0.88, 0.92, 3.6, 12);
  const bodyMat = flatMat(0xded6d3, { roughness: 0.45, metalness: 0.18 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 2.25;
  body.castShadow = true;
  rocket.add(body);

  // Black upper instrumentation band
  const bandGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.42, 12);
  const blackMat = flatMat(0x1b1f24, { roughness: 0.4 });
  const band = new THREE.Mesh(bandGeo, blackMat);
  band.position.y = 3.55;
  rocket.add(band);

  // Faceted silver conical nosecone
  const coneGeo = new THREE.ConeGeometry(0.89, 1.55, 10);
  const coneMat = flatMat(0xdce3ea, { metalness: 0.35, roughness: 0.3 });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = 4.82;
  cone.castShadow = true;
  rocket.add(cone);

  // 4 Upper & 4 Lower Fin Boxes + 4 Landing Legs with circular footpads
  const finMat = flatMat(0x888382, { metalness: 0.25, roughness: 0.55 });
  const strutMat = flatMat(0x9ca6b0, { metalness: 0.45, roughness: 0.35 });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const cos = Math.cos(a);
    const sin = Math.sin(a);

    // Upper flap
    const uFin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.14), finMat);
    uFin.position.set(cos * 0.92, 3.68, sin * 0.92);
    uFin.rotation.y = -a + Math.PI / 2;
    uFin.castShadow = true;
    rocket.add(uFin);

    // Lower pod
    const lFin = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.55, 0.18), finMat);
    lFin.position.set(cos * 0.94, 1.35, sin * 0.94);
    lFin.rotation.y = -a + Math.PI / 2;
    lFin.castShadow = true;
    rocket.add(lFin);

    // Angled landing strut
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.55, 6),
      strutMat
    );
    strut.position.set(cos * 1.25, 0.72, sin * 1.25);
    strut.rotation.z = cos * 0.35;
    strut.rotation.x = -sin * 0.35;
    rocket.add(strut);

    // Dark footpad
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.08, 8),
      blackMat
    );
    foot.position.set(cos * 1.48, 0.18, sin * 1.48);
    rocket.add(foot);
  }

  // Engine nozzle & glowing thrust plume
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.52, 0.35, 10),
    goldMat
  );
  nozzle.position.y = 0.32;
  rocket.add(nozzle);

  const flameGeo = new THREE.ConeGeometry(0.65, 2.2, 10);
  flameGeo.rotateX(Math.PI);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff9f2e,
    transparent: true,
    opacity: 0.85,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = -0.8;
  flame.visible = false;
  rocket.add(flame);

  group.add(rocket);
  group.userData = { rocket, flame };
  return group;
}

// 4. Interior Square Plate
export function createInteriorPlateMesh(plateData) {
  const group = new THREE.Group();
  group.position.set(plateData.x, 0.03, plateData.z);
  group.rotation.y = Math.PI / 4; // 45-degree diamond alignment

  // Outer cream/gold border frame
  const borderGeo = new THREE.BoxGeometry(2.08, 0.07, 2.08);
  const borderMat = flatMat(0xdfd0a6, { roughness: 0.65 });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.position.y = 0.035;
  borderMesh.receiveShadow = true;
  group.add(borderMesh);

  // Inner warm tan build plate
  const innerGeo = new THREE.BoxGeometry(1.88, 0.085, 1.88);
  const innerMat = flatMat(0xc49a72, { roughness: 0.78 });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.position.y = 0.042;
  innerMesh.receiveShadow = true;
  group.add(innerMesh);

  group.userData = {
    nodeId: plateData.id,
    zone: "interior",
    borderMesh,
    innerMesh,
    borderMat,
    innerMat,
  };
  return group;
}

// 5. Exterior Hexagonal Sand Pad (+ Rich Ore Seam crystals if richOre)
export function createExteriorPadMesh(padData) {
  const group = new THREE.Group();
  group.position.set(padData.x, 0.03, padData.z);

  const borderGeo = new THREE.CylinderGeometry(1.18, 1.24, 0.09, 6);
  const borderMat = flatMat(0xe0cb96, { roughness: 0.65 });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.position.y = 0.045;
  borderMesh.receiveShadow = true;
  group.add(borderMesh);

  const innerGeo = new THREE.CylinderGeometry(1.02, 1.06, 0.11, 6);
  const innerMat = flatMat(0xb68b62, { roughness: 0.78 });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.position.y = 0.055;
  innerMesh.receiveShadow = true;
  group.add(innerMesh);

  // If this pad is on a Rich Ore Seam, add glowing orange low-poly crystals around its rim!
  if (padData.richOre) {
    const crystalGroup = new THREE.Group();
    const crystalMat = flatMat(0xff8c24, {
      emissive: 0xd9530f,
      emissiveIntensity: 0.42,
      roughness: 0.3,
    });
    for (let i = 0; i < 6; i++) {
      const a = padData.angle - 0.55 + i * 0.24;
      const dist = 1.32 + (i % 2) * 0.22;
      const h = 0.42 + (i % 3) * 0.18;
      const cGeo = new THREE.ConeGeometry(0.18, h, 4);
      const cMesh = new THREE.Mesh(cGeo, crystalMat);
      cMesh.position.set(Math.cos(a) * dist, h * 0.45, Math.sin(a) * dist);
      cMesh.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.22;
      cMesh.rotation.y = i * 0.7;
      cMesh.castShadow = true;
      crystalGroup.add(cMesh);
    }
    group.add(crystalGroup);
  }

  group.userData = {
    nodeId: padData.id,
    zone: "exterior",
    richOre: padData.richOre,
    borderMesh,
    innerMesh,
    borderMat,
    innerMat,
  };
  return group;
}

// 6. All 8 Interior & Exterior Building Meshes
export function createBuildingMesh(type, level = 1) {
  const group = new THREE.Group();
  group.name = `Building_${type}_MK${level}`;
  const spec = BUILDINGS[type];
  const animatedParts = [];

  if (spec && spec.zone === "interior") {
    // Colored square base plate sitting on the interior tile
    const rimGeo = new THREE.BoxGeometry(2.04, 0.14, 2.04);
    const rimMat = flatMat(0x374b54, { roughness: 0.6 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = 0.07;
    rim.rotation.y = Math.PI / 4;
    rim.castShadow = true;
    rim.receiveShadow = true;
    group.add(rim);

    const topGeo = new THREE.BoxGeometry(1.86, 0.16, 1.86);
    const topMat = flatMat(spec.plateColor, { roughness: 0.5 });
    const topPlate = new THREE.Mesh(topGeo, topMat);
    topPlate.position.y = 0.08;
    topPlate.rotation.y = Math.PI / 4;
    topPlate.receiveShadow = true;
    group.add(topPlate);
  }

  if (type === "oxygen") {
    // White ribbed cylinder with teal rings + rising cyan oxygen bubbles (landscape_2.png)
    const baseRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.72, 0.22, 10),
      flatMat(0x3f847b)
    );
    baseRing.position.y = 0.25;
    group.add(baseRing);

    const towerBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.58, 1.25, 12),
      flatMat(0xe5e0db)
    );
    towerBody.position.y = 0.92;
    towerBody.castShadow = true;
    group.add(towerBody);

    const domeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      flatMat(0xe5e0db)
    );
    domeCap.position.y = 1.52;
    group.add(domeCap);

    // Teal horizontal bands + top nozzle
    for (const ry of [0.62, 1.04]) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.045, 8, 16),
        flatMat(0x377d73)
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = ry;
      group.add(band);
    }

    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.26, 0.18, 10),
      flatMat(0x377d73)
    );
    nozzle.position.y = 1.98;
    group.add(nozzle);

    // Rising bubbles
    for (let b = 0; b < 3; b++) {
      const bub = new THREE.Mesh(
        new THREE.SphereGeometry(0.09 + b * 0.02, 8, 8),
        flatMat(0x88e8e0, { transparent: true, opacity: 0.78 })
      );
      bub.position.set(0.05 * (b - 1), 2.25 + b * 0.32, 0);
      group.add(bub);
      animatedParts.push({ mesh: bub, kind: "bubble", baseY: 2.15, phase: b * 2.1 });
    }
  } else if (type === "water") {
    // Sky-blue/white circular condenser vat + side loop pipe + conical cap + spinning orbital ring (landscape_2.png)
    const vatBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.74, 0.24, 12),
      flatMat(0x467da8)
    );
    vatBase.position.y = 0.26;
    group.add(vatBase);

    const vatBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.64, 0.56, 12),
      flatMat(0xdfe5ec)
    );
    vatBody.position.y = 0.64;
    vatBody.castShadow = true;
    group.add(vatBody);

    const vatRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.64, 0.06, 8, 18),
      flatMat(0x467da8)
    );
    vatRim.rotation.x = Math.PI / 2;
    vatRim.position.y = 0.92;
    group.add(vatRim);

    // Off-center tower with blue conical cap
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.65, 8),
      flatMat(0xe5e9ef)
    );
    spire.position.set(0.14, 1.2, -0.08);
    spire.castShadow = true;
    group.add(spire);

    const coneCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.28, 8),
      flatMat(0x4378a3)
    );
    coneCap.position.set(0.14, 1.65, -0.08);
    group.add(coneCap);

    // Translucent orbital water ring
    const orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.84, 0.032, 8, 28),
      flatMat(0x88c9f9, { transparent: true, opacity: 0.72 })
    );
    orbitRing.rotation.x = Math.PI * 0.44;
    orbitRing.rotation.y = 0.3;
    orbitRing.position.y = 1.15;
    group.add(orbitRing);
    animatedParts.push({ mesh: orbitRing, kind: "spin", speed: 1.4 });
  } else if (type === "food") {
    // Brown circular planter tub + green low-poly crops + red Martian tomatoes (landscape_2.png)
    const tub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.66, 0.62, 14),
      flatMat(0x6d4736, { roughness: 0.8 })
    );
    tub.position.y = 0.44;
    tub.castShadow = true;
    group.add(tub);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.08, 12),
      flatMat(0x3d271d, { roughness: 0.95 })
    );
    soil.position.y = 0.74;
    group.add(soil);

    // Cluster of spiky green crop stalks & red tomatoes
    const leafMat = flatMat(0x5bb85d, { roughness: 0.6 });
    const tomatoMat = flatMat(0xff5733, {
      emissive: 0xcc2200,
      emissiveIntensity: 0.25,
    });
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9;
      const r = i === 0 ? 0 : 0.34;
      const stalkH = 0.55 + (i % 3) * 0.16;
      const stalk = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, stalkH, 5),
        leafMat
      );
      stalk.position.set(Math.cos(a) * r, 0.76 + stalkH * 0.45, Math.sin(a) * r);
      stalk.castShadow = true;
      group.add(stalk);

      if (i % 2 === 0) {
        const tom = new THREE.Mesh(
          new THREE.SphereGeometry(0.065, 6, 6),
          tomatoMat
        );
        tom.position.set(
          Math.cos(a) * (r + 0.06),
          0.95 + (i % 2) * 0.12,
          Math.sin(a) * (r + 0.06)
        );
        group.add(tom);
      }
    }
  } else if (type === "habitat") {
    // Geodesic white dome pod + blue stripe + airlock tunnel + orbital status ring (landscape_1.png, landscape_4.png)
    const podBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.8, 0.32, 14),
      flatMat(0xdbe0e8)
    );
    podBase.position.y = 0.3;
    podBase.castShadow = true;
    group.add(podBase);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.77, 0.78, 0.08, 14),
      flatMat(0x5b82b8)
    );
    stripe.position.y = 0.36;
    group.add(stripe);

    const podDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.76, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
      flatMat(0xe5e9f0)
    );
    podDome.position.y = 0.45;
    podDome.castShadow = true;
    group.add(podDome);

    // Side cylindrical airlock hatch
    const hatch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.38, 10),
      flatMat(0x5c7599)
    );
    hatch.rotation.z = Math.PI / 2;
    hatch.rotation.y = -Math.PI / 4;
    hatch.position.set(-0.55, 0.38, 0.55);
    group.add(hatch);

    // Glowing habitat ring
    const habRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.88, 0.028, 8, 28),
      flatMat(0x9ee37d, { transparent: true, opacity: 0.7 })
    );
    habRing.rotation.x = Math.PI * 0.42;
    habRing.rotation.y = -0.35;
    habRing.position.y = 0.82;
    group.add(habRing);
    animatedParts.push({ mesh: habRing, kind: "spin", speed: -1.1 });
  } else if (type === "solar") {
    // Exterior Solar Array: silver box base + angled dark-navy solar panel + status orb (landscape_3.png)
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.38, 0.62),
      flatMat(0xc2c8d0)
    );
    box.position.y = 0.28;
    box.castShadow = true;
    group.add(box);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.45, 8),
      flatMat(0x7d858f)
    );
    mast.position.y = 0.58;
    group.add(mast);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.07, 0.85),
      flatMat(0x212936, { metalness: 0.55, roughness: 0.25 })
    );
    panel.position.y = 0.82;
    panel.rotation.x = 0.48;
    panel.castShadow = true;
    group.add(panel);
    animatedParts.push({ mesh: panel, kind: "solar_track" });
  } else if (type === "ore_rig") {
    // Tall yellow tripod drilling rig + central rotating auger + top motor housing (landscape_1.png, landscape_3.png)
    const padBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.84, 0.2, 8),
      flatMat(0x4b4037)
    );
    padBase.position.y = 0.18;
    group.add(padBase);

    const legMat = flatMat(0xdba028, { metalness: 0.25, roughness: 0.45 });
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.075, 2.35, 6),
        legMat
      );
      leg.position.set(Math.cos(a) * 0.36, 1.28, Math.sin(a) * 0.36);
      leg.rotation.z = Math.cos(a) * 0.22;
      leg.rotation.x = -Math.sin(a) * 0.22;
      leg.castShadow = true;
      group.add(leg);
    }

    // Central drill auger with spiral fins
    const augerGroup = new THREE.Group();
    augerGroup.position.y = 1.15;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.05, 1.85, 8),
      flatMat(0xb8c2cc, { metalness: 0.5 })
    );
    augerGroup.add(shaft);
    for (let s = 0; s < 5; s++) {
      const blade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.18, 0.08, 6),
        flatMat(0x8c96a0)
      );
      blade.position.y = -0.65 + s * 0.32;
      blade.rotation.y = s * 0.6;
      augerGroup.add(blade);
    }
    group.add(augerGroup);
    animatedParts.push({ mesh: augerGroup, kind: "spin", speed: 4.5 });

    // Top motor block
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.42, 0.62),
      flatMat(0x6d757d)
    );
    head.position.y = 2.42;
    head.castShadow = true;
    group.add(head);
  } else if (type === "droid_bay") {
    // Arched grey rover hangar with dark roll-up garage door (landscape_3.png, landscape_5.png)
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.68, 1.18),
      flatMat(0xb4bcc4)
    );
    walls.position.y = 0.42;
    walls.castShadow = true;
    group.add(walls);

    const archRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.59,
        0.59,
        1.38,
        10,
        1,
        false,
        0,
        Math.PI
      ),
      flatMat(0xc5cdd6)
    );
    archRoof.rotation.z = Math.PI / 2;
    archRoof.rotation.y = Math.PI / 2;
    archRoof.position.y = 0.76;
    archRoof.castShadow = true;
    group.add(archRoof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.52, 0.08),
      flatMat(0x202428)
    );
    door.position.set(0, 0.36, 0.58);
    group.add(door);
  } else if (type === "defense_tower") {
    // Octagonal grey turret bunker + twin dark cannon barrels (landscape_3.png, landscape_5.png)
    const bunker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.82, 0.48, 8),
      flatMat(0x98a1ab)
    );
    bunker.position.y = 0.32;
    bunker.castShadow = true;
    group.add(bunker);

    const turretHead = new THREE.Group();
    turretHead.position.y = 0.66;

    const mount = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.28, 8),
      flatMat(0xc2cad2)
    );
    turretHead.add(mount);

    const barrelMat = flatMat(0x23272c, { metalness: 0.5 });
    for (const bx of [-0.15, 0.15]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.09, 0.68, 8),
        barrelMat
      );
      barrel.position.set(bx, 0.22, 0.22);
      barrel.rotation.x = Math.PI / 4;
      turretHead.add(barrel);
    }
    group.add(turretHead);
    animatedParts.push({ mesh: turretHead, kind: "turret_head" });
  }

  // Upgrade level pips (MK2 / MK3 golden chevrons + floating status orb)
  const orbY = type === "ore_rig" ? 2.88 : type === "oxygen" ? 2.25 : 1.55;
  const statusOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    flatMat(0xffd25a, {
      emissive: 0xffaa22,
      emissiveIntensity: 0.85,
      flatShading: false,
    })
  );
  statusOrb.position.y = orbY;
  group.add(statusOrb);
  animatedParts.push({ mesh: statusOrb, kind: "bob", baseY: orbY, phase: 0.5 });

  // Scale slightly with level (MK1=1.0, MK2=1.08, MK3=1.16) and add golden level ring for MK2/MK3
  const scale = 1 + (level - 1) * 0.08;
  group.scale.setScalar(scale);

  if (level >= 2) {
    const lvlRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.04, 8, 24),
      flatMat(0xf5b942, { metalness: 0.6, roughness: 0.25 })
    );
    lvlRing.rotation.x = Math.PI / 2;
    lvlRing.position.y = 0.18;
    group.add(lvlRing);
  }

  group.userData = { type, level, animatedParts, statusOrb };
  return group;
}

// 7. Stylized Astronaut Colonist (Astro in orange, crew in blue/teal)
export function createColonistMesh(colorHex = "#e87d2f") {
  const group = new THREE.Group();

  // Legs
  const legMat = flatMat(colorHex, { roughness: 0.5 });
  const leftLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.32, 6),
    legMat
  );
  leftLeg.position.set(-0.08, 0.16, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.32, 6),
    legMat
  );
  rightLeg.position.set(0.08, 0.16, 0);
  group.add(rightLeg);

  // Torso + backpack
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.17, 0.42, 8),
    legMat
  );
  torso.position.y = 0.48;
  torso.castShadow = true;
  group.add(torso);

  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.28, 0.14),
    flatMat(0xdce2e8)
  );
  pack.position.set(0, 0.5, -0.14);
  group.add(pack);

  // Helmet + gold visor
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    flatMat(colorHex, { roughness: 0.35 })
  );
  head.position.y = 0.84;
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    flatMat(0xffc966, { metalness: 0.65, roughness: 0.2 })
  );
  visor.position.set(0, 0.84, 0.07);
  group.add(visor);

  return group;
}

// 8. 6-Wheeled Repair & Defense Rover Droid (landscape_4.png)
export function createRoverMesh() {
  const group = new THREE.Group();

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.18, 0.32),
    flatMat(0xe6ebf0)
  );
  chassis.position.y = 0.18;
  chassis.castShadow = true;
  group.add(chassis);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.1, 0.28),
    flatMat(0xe87d2f)
  );
  stripe.position.set(0.19, 0.19, 0);
  group.add(stripe);

  const wheelMat = flatMat(0x202428);
  for (const wx of [-0.16, 0, 0.16]) {
    for (const wz of [-0.18, 0.18]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.06, 8),
        wheelMat
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.08, wz);
      group.add(wheel);
    }
  }

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6),
    flatMat(0x98a2ac)
  );
  mast.position.set(-0.08, 0.34, 0);
  group.add(mast);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 8, 8),
    flatMat(0x7be8e0, {
      emissive: 0x48d1cc,
      emissiveIntensity: 0.9,
      flatShading: false,
    })
  );
  beacon.position.set(-0.08, 0.46, 0);
  group.add(beacon);

  group.userData = { beacon };
  return group;
}

// 9. Alien Raider Saucer (UFO) + Translucent Green Tractor/Laser Beam Cone (landscape_1.png)
export function createAlienSaucerMesh() {
  const group = new THREE.Group();
  group.name = "AlienRaiderSaucer";

  // Dark faceted main saucer disc
  const discGeo = new THREE.CylinderGeometry(1.15, 1.65, 0.42, 16);
  const discMat = flatMat(0x162234, { metalness: 0.55, roughness: 0.3 });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.castShadow = true;
  group.add(disc);

  // Glowing mint-green outer rim torus
  const rimGeo = new THREE.TorusGeometry(1.62, 0.14, 10, 28);
  rimGeo.rotateX(Math.PI / 2);
  const glowMat = flatMat(0xa5f8d4, {
    emissive: 0x5df2b5,
    emissiveIntensity: 0.95,
    flatShading: false,
  });
  const rim = new THREE.Mesh(rimGeo, glowMat);
  rim.position.y = -0.12;
  group.add(rim);

  // Glowing mint-green upper cockpit dome
  const domeGeo = new THREE.SphereGeometry(
    0.85,
    14,
    10,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.52
  );
  const dome = new THREE.Mesh(domeGeo, glowMat);
  dome.position.y = 0.15;
  group.add(dome);

  // Translucent green tractor/laser beam cone extending down to the ground
  const beamGeo = new THREE.ConeGeometry(1.15, 6.8, 20, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x8ef7c8,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = -3.45;
  group.add(beam);

  // Inner brighter core beam
  const coreGeo = new THREE.CylinderGeometry(0.18, 0.48, 6.8, 12, 1, true);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xc8ffe6,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const coreBeam = new THREE.Mesh(coreGeo, coreMat);
  coreBeam.position.y = -3.45;
  group.add(coreBeam);

  group.userData = { disc, rim, dome, beam, coreBeam };
  return group;
}
