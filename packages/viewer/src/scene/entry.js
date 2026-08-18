import * as THREE from "three";
import { makeWoodTexture } from "./textures.js";

export const DOOR = { width: 1.8, height: 3.0, openAngle: 1.85 };
const VESTIBULE = { width: 3.0, depth: 2.4, ceiling: 3.4 };

function woodMaterial(tex, tint, roughness) {
  return new THREE.MeshStandardMaterial({
    map: tex, color: tint === undefined ? 0xffffff : tint,
    roughness: roughness === undefined ? 0.78 : roughness, metalness: 0.0,
  });
}

function buildFieldedPanel(woodTex, fieldW, fieldH, arched, giltMat) {
  const g = new THREE.Group();
  const bevelMat = woodMaterial(woodTex, 0x8c6f4d, 0.82);
  const fieldMat = woodMaterial(woodTex, 0xa8895f, 0.72);

  const surround = new THREE.Mesh(new THREE.BoxGeometry(fieldW, fieldH, 0.018), bevelMat);
  g.add(surround);
  const field = new THREE.Mesh(new THREE.BoxGeometry(fieldW - 0.11, fieldH - 0.11, 0.03), fieldMat);
  field.position.z = 0.012;
  g.add(field);

  const bt = 0.012;
  [[0, (fieldH - 0.11) / 2, fieldW - 0.11, bt],
    [0, -(fieldH - 0.11) / 2, fieldW - 0.11, bt],
    [-(fieldW - 0.11) / 2, 0, bt, fieldH - 0.11],
    [(fieldW - 0.11) / 2, 0, bt, fieldH - 0.11]].forEach(function (b) {
    const bead = new THREE.Mesh(new THREE.BoxGeometry(b[2], b[3], 0.028), giltMat);
    bead.position.set(b[0], b[1], 0.014);
    g.add(bead);
  });

  if (arched) {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry((fieldW - 0.11) / 2, 0.02, 8, 24, Math.PI), giltMat);
    arc.position.set(0, (fieldH - 0.11) / 2, 0.016);
    g.add(arc);
  }
  return g;
}

function buildPanel(woodTex, hingeSign, brassMat, giltMat) {
  const group = new THREE.Group();
  const frameMat = woodMaterial(woodTex, 0xb2946c, 0.66);
  const w = DOOR.width / 2;
  const h = DOOR.height;
  const thick = 0.09;
  const dir = -hingeSign;
  const cx = dir * w / 2;

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, thick * 0.7), woodMaterial(woodTex, 0x7c6144, 0.82));
  slab.position.set(cx, h / 2, 0);
  group.add(slab);

  const stileW = 0.16;
  const railH = 0.16;
  const zf = thick / 2;
  function addBar(bx, by, bw, bh) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, thick), frameMat);
    bar.position.set(bx, by, 0);
    group.add(bar);
  }
  addBar(cx - w / 2 + stileW / 2, h / 2, stileW, h);
  addBar(cx + w / 2 - stileW / 2, h / 2, stileW, h);
  addBar(cx, h - railH / 2, w, railH);
  addBar(cx, railH / 2, w, railH);
  const midY = h * 0.42;
  addBar(cx, midY, w, railH);
  addBar(cx, h * 0.68, w, railH);

  const innerW = w - 2 * stileW;
  function opening(loRailY, hiRailY) {
    const lo = loRailY + railH / 2;
    const hi = hiRailY - railH / 2;
    return { y: (lo + hi) / 2, ph: hi - lo };
  }
  const upper = opening(h * 0.68, h - railH / 2);
  const middle = opening(midY, h * 0.68);
  const lower = opening(railH / 2, midY);
  [{ o: upper, arched: true }, { o: middle, arched: false },
    { o: lower, arched: false }].forEach(function (p) {
    if (p.o.ph <= 0.05) return;
    const panel = buildFieldedPanel(woodTex, innerW - 0.02, p.o.ph - 0.02, p.arched, giltMat);
    panel.position.set(cx, p.o.y, zf - 0.02);
    group.add(panel);
  });

  const handleX = dir * (w - 0.14);
  [zf + 0.01, -zf - 0.01].forEach(function (zoff) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.02), brassMat);
    plate.position.set(handleX, h * 0.46, zoff);
    group.add(plate);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 10, 22), brassMat);
    ring.position.set(handleX, h * 0.42, zoff + (zoff > 0 ? 0.02 : -0.02));
    group.add(ring);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), giltMat);
    boss.position.set(handleX, h * 0.52, zoff + (zoff > 0 ? 0.01 : -0.01));
    group.add(boss);
  });

  return group;
}

export function buildEntry(theme, scene, woodTex, doorX, zWall, colliders) {
  const tex = woodTex || makeWoodTexture(theme);
  const halfW = DOOR.width / 2;
  const doorwayHeight = DOOR.height;

  const brassMat = new THREE.MeshStandardMaterial({
    color: theme.metal.brass, roughness: 0.28, metalness: 0.9,
  });
  const giltMat = new THREE.MeshStandardMaterial({
    color: theme.metal.gilt, roughness: 0.35, metalness: 0.85,
    emissive: theme.metal.giltEmissive, emissiveIntensity: 0.35,
  });

  const jambMat = woodMaterial(tex, 0xa9895f, 0.7);

  const zBack = zWall + VESTIBULE.depth;
  const vxMin = doorX - VESTIBULE.width / 2;
  const vxMax = doorX + VESTIBULE.width / 2;

  const vestFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(VESTIBULE.width, VESTIBULE.depth),
    new THREE.MeshStandardMaterial({ color: 0x140d07, roughness: 0.9 }));
  vestFloor.rotation.x = -Math.PI / 2;
  vestFloor.position.set(doorX, 0.006, zWall + VESTIBULE.depth / 2);
  scene.add(vestFloor);

  const vestCeil = new THREE.Mesh(
    new THREE.PlaneGeometry(VESTIBULE.width, VESTIBULE.depth),
    new THREE.MeshStandardMaterial({ color: 0x0e0906, roughness: 0.95 }));
  vestCeil.rotation.x = Math.PI / 2;
  vestCeil.position.set(doorX, VESTIBULE.ceiling, zWall + VESTIBULE.depth / 2);
  scene.add(vestCeil);

  const vestWallMat = new THREE.MeshStandardMaterial({ color: 0x160f08, roughness: 0.9 });

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(VESTIBULE.width, VESTIBULE.ceiling), vestWallMat);
  backWall.position.set(doorX, VESTIBULE.ceiling / 2, zBack);
  backWall.rotation.y = Math.PI;
  scene.add(backWall);

  [vxMin, vxMax].forEach(function (x) {
    const side = new THREE.Mesh(
      new THREE.PlaneGeometry(VESTIBULE.depth, VESTIBULE.ceiling), vestWallMat);
    side.position.set(x, VESTIBULE.ceiling / 2, zWall + VESTIBULE.depth / 2);
    side.rotation.y = x === vxMin ? Math.PI / 2 : -Math.PI / 2;
    scene.add(side);
  });

  const wingW = (VESTIBULE.width - DOOR.width) / 2;
  [-1, 1].forEach(function (s) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(wingW, VESTIBULE.ceiling), vestWallMat);
    wing.position.set(doorX + s * (halfW + wingW / 2), VESTIBULE.ceiling / 2, zWall + 0.001);
    scene.add(wing);
  });
  const vestLintel = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR.width, VESTIBULE.ceiling - doorwayHeight), vestWallMat);
  vestLintel.position.set(doorX, (VESTIBULE.ceiling + doorwayHeight) / 2, zWall + 0.001);
  scene.add(vestLintel);

  const jambDepth = 0.26;
  const jambW = 0.18;
  [-1, 1].forEach(function (s) {
    const jx = doorX + s * (halfW + jambW / 2);
    const jamb = new THREE.Mesh(
      new THREE.BoxGeometry(jambW, doorwayHeight + 0.12, jambDepth), jambMat);
    jamb.position.set(jx, (doorwayHeight + 0.12) / 2, zWall);
    scene.add(jamb);
    for (let f = -1; f <= 1; f++) {
      const flute = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, doorwayHeight - 0.5, 6), giltMat);
      flute.position.set(jx + f * 0.05, doorwayHeight / 2, zWall - jambDepth / 2 - 0.006);
      scene.add(flute);
    }
    [0.14, doorwayHeight - 0.02].forEach(function (by) {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(jambW + 0.06, 0.16, jambDepth + 0.05), jambMat);
      block.position.set(jx, by, zWall);
      scene.add(block);
    });
  });

  const entab = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR.width + 2 * jambW + 0.16, 0.22, jambDepth + 0.04), jambMat);
  entab.position.set(doorX, doorwayHeight + 0.17, zWall);
  scene.add(entab);
  const dentilCount = 11;
  const dentilSpan = DOOR.width + 2 * jambW;
  for (let d = 0; d < dentilCount; d++) {
    const dentil = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05), giltMat);
    dentil.position.set(
      doorX - dentilSpan / 2 + (d + 0.5) * dentilSpan / dentilCount,
      doorwayHeight + 0.31, zWall - jambDepth / 2);
    scene.add(dentil);
  }
  const pedW = DOOR.width + 2 * jambW + 0.16;
  [-1, 1].forEach(function (s) {
    const rake = new THREE.Mesh(
      new THREE.BoxGeometry(pedW / 2 / Math.cos(0.5), 0.1, jambDepth), jambMat);
    rake.position.set(doorX + s * pedW / 4, doorwayHeight + 0.4 + (pedW / 4) * Math.tan(0.5) / 2, zWall);
    rake.rotation.z = -s * 0.5;
    scene.add(rake);
  });
  const rosette = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 10, 20), giltMat);
  rosette.position.set(doorX, doorwayHeight + 0.5, zWall - jambDepth / 2);
  scene.add(rosette);

  const doorGroups = [];
  [-1, 1].forEach(function (hingeSign) {
    const pivot = new THREE.Group();
    pivot.position.set(doorX + hingeSign * halfW, 0, zWall);
    const panel = buildPanel(tex, hingeSign, brassMat, giltMat);
    pivot.add(panel);
    scene.add(pivot);
    doorGroups.push({ pivot: pivot, hingeSign: hingeSign });
  });

  const vestLight = new THREE.PointLight(theme.light.pendantColor, 26, 7.5, 2);
  vestLight.position.set(doorX, 2.55, zWall + VESTIBULE.depth * 0.5);
  scene.add(vestLight);

  const wallThick = 0.4;
  colliders.push(
    { minX: vxMin - wallThick, maxX: vxMin, minZ: zWall - 0.1, maxZ: zBack + wallThick },
    { minX: vxMax, maxX: vxMax + wallThick, minZ: zWall - 0.1, maxZ: zBack + wallThick },
    { minX: vxMin - wallThick, maxX: vxMax + wallThick, minZ: zBack, maxZ: zBack + wallThick });

  const closedCollider = {
    minX: doorX - halfW, maxX: doorX + halfW, minZ: zWall - 0.08, maxZ: zWall + 0.08,
  };
  colliders.push(closedCollider);

  let swapped = false;
  function swapToOpen() {
    const i = colliders.indexOf(closedCollider);
    if (i !== -1) colliders.splice(i, 1);
    [-1, 1].forEach(function (hingeSign) {
      const hingeX = doorX + hingeSign * halfW;
      const restAngle = -hingeSign * DOOR.openAngle;
      const r = -hingeSign * (DOOR.width / 2);
      const tipX = hingeX + r * Math.cos(restAngle);
      const tipZ = zWall - r * Math.sin(restAngle);
      const pad = 0.09;
      colliders.push({
        minX: Math.min(hingeX, tipX) - pad, maxX: Math.max(hingeX, tipX) + pad,
        minZ: Math.min(zWall, tipZ) - pad, maxZ: Math.max(zWall, tipZ) + pad,
      });
    });
  }

  function setOpen(k) {
    const kc = Math.max(0, Math.min(1, k));
    const angle = kc * DOOR.openAngle;
    doorGroups.forEach(function (d) {
      d.pivot.rotation.y = -d.hingeSign * angle;
    });
    if (kc >= 1 && !swapped) {
      swapped = true;
      swapToOpen();
    }
  }

  setOpen(0);

  const spawn = { x: doorX, z: zWall + VESTIBULE.depth - 0.55, yaw: 0 };
  const insideSpawn = { x: doorX, z: zWall - 1.9, yaw: 0 };

  return {
    doorway: { x: doorX, width: DOOR.width, height: DOOR.height },
    setOpen: setOpen,
    spawn: spawn,
    insideSpawn: insideSpawn,
  };
}
