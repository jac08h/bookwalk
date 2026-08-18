import * as THREE from "three";
import {
  makeWoodTexture, makeFloorTexture, makePlaqueTexture, makeGlowTexture, mulberry32,
} from "./textures.js";
import { buildRoom } from "./room.js";
import { buildEntry } from "./entry.js";
import { STACKS } from "./stacks-constants.js";

export { STACKS };

function woodMaterial(tex, tint = 0xffffff, roughness = 0.78) {
  return new THREE.MeshStandardMaterial({ map: tex, color: tint, roughness: roughness, metalness: 0.0 });
}

function buildCase(width, woodTex, occluders) {
  const group = new THREE.Group();
  const mat = woodMaterial(woodTex);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x120a05, roughness: 0.95, metalness: 0.0 });
  const d = STACKS.caseDepth;

  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, STACKS.caseTop + 0.2), darkMat);
  back.position.set(0, (STACKS.caseTop + 0.2) / 2, -d / 2 + 0.01);
  back.userData.occluder = true;
  occluders.push(back);
  group.add(back);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(width, 0.24, d + 0.06), mat);
  plinth.position.set(0, 0.12, 0.02);
  plinth.userData.occluder = true;
  occluders.push(plinth);
  group.add(plinth);

  [-1, 1].forEach(function (s) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.09, STACKS.caseTop + 0.06, d), mat);
    side.position.set(s * (width / 2 - 0.045), (STACKS.caseTop + 0.06) / 2, 0);
    side.userData.occluder = true;
    occluders.push(side);
    group.add(side);
  });

  STACKS.rowBottoms.forEach(function (y) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, 0.05, d - 0.02), mat);
    plank.position.set(0, y - 0.026, 0);
    plank.userData.occluder = true;
    occluders.push(plank);
    group.add(plank);
  });

  const frieze = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, 0.56, d - 0.04), mat);
  frieze.position.set(0, STACKS.caseTop - 0.32, 0);
  frieze.userData.occluder = true;
  occluders.push(frieze);
  group.add(frieze);

  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, 0.16, d + 0.1), mat);
  top.position.set(0, STACKS.caseTop + 0.04, 0.02);
  top.userData.occluder = true;
  occluders.push(top);
  group.add(top);

  return group;
}

function buildUnit(scene, woodTex, xCenter, occluders) {
  const faceOffset = STACKS.unitThickness / 2 - STACKS.caseDepth / 2;
  const faces = {};

  [1, -1].forEach(function (sign) {
    const group = buildCase(STACKS.unitLength, woodTex, occluders);
    group.rotation.y = sign * Math.PI / 2;
    group.position.set(xCenter + sign * faceOffset, 0, -STACKS.unitLength / 2);
    scene.add(group);
    faces[sign] = group;
  });

  const capMat = woodMaterial(woodTex);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(STACKS.unitThickness + 0.04, STACKS.caseTop + 0.2, 0.14), capMat);
  cap.position.set(xCenter, (STACKS.caseTop + 0.2) / 2, 0.02);
  cap.userData.occluder = true;
  occluders.push(cap);
  scene.add(cap);
  const capTrim = new THREE.Mesh(
    new THREE.BoxGeometry(STACKS.unitThickness + 0.16, 0.16, 0.24), capMat);
  capTrim.position.set(xCenter, STACKS.caseTop + 0.04, 0.0);
  scene.add(capTrim);

  return faces;
}

function buildAisleSign(scene, label, aisleX, side) {
  const x = aisleX + side * 0.5;
  const geo = new THREE.PlaneGeometry(0.88, 0.32);
  function faceMaterial(texSide) {
    return new THREE.MeshStandardMaterial({
      map: makePlaqueTexture(label, texSide), roughness: 0.85, metalness: 0.0,
      emissive: 0x3a2a14, emissiveIntensity: 1.0, side: THREE.FrontSide,
    });
  }

  const sign = new THREE.Group();
  const front = new THREE.Mesh(geo, faceMaterial(side));
  sign.add(front);
  const back = new THREE.Mesh(geo, faceMaterial(-side));
  back.rotation.y = Math.PI;
  back.position.z = -0.004;
  sign.add(back);
  sign.position.set(x, 2.86, 0.3);
  sign.userData.label = label;
  front.userData.label = label;
  back.userData.label = label;
  scene.add(sign);

  const cordMat = new THREE.MeshStandardMaterial({ color: 0x0a0705, roughness: 0.9 });
  const cordLen = STACKS.ceiling - 3.05;
  const cordGeo = new THREE.CylinderGeometry(0.008, 0.008, cordLen, 5);
  [-0.35, 0.35].forEach(function (dx) {
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.position.set(x + dx, 3.05 + cordLen / 2, 0.3);
    scene.add(cord);
  });
  return sign;
}

function buildEntryFurniture(theme, scene, woodTex, x, z) {
  const mat = woodMaterial(woodTex, 0xc8b498, 0.6);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.95), mat);
  top.position.set(x, 0.76, z);
  scene.add(top);
  [[-0.76, -0.38], [0.76, -0.38], [-0.76, 0.38], [0.76, 0.38]].forEach(function (o) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.73, 0.08), mat);
    leg.position.set(x + o[0], 0.365, z + o[1]);
    scene.add(leg);
  });

  const brass = new THREE.MeshStandardMaterial({ color: theme.metal.brass, roughness: 0.35, metalness: 0.85 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.34, 10), brass);
  stem.position.set(x + 0.45, 0.795 + 0.17, z - 0.12);
  scene.add(stem);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.16, 0.13, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2a4a2e, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
  shade.position.set(x + 0.45, 0.795 + 0.36, z - 0.12);
  scene.add(shade);
  const lamp = new THREE.PointLight(theme.light.lampColor, 4, 5, 2);
  lamp.position.set(x + 0.45, 0.795 + 0.3, z - 0.12);
  scene.add(lamp);

  return { lamp: lamp };
}

function buildPendants(theme, scene, positions) {
  const lamps = [];
  const brass = new THREE.MeshStandardMaterial({ color: theme.metal.brass, roughness: 0.35, metalness: 0.85 });
  const cordMat = new THREE.MeshStandardMaterial({ color: 0x0a0705, roughness: 0.9 });
  const bulbMat = new THREE.MeshBasicMaterial({ fog: false });
  bulbMat.color.setRGB(3.2, 2.1, 1.15);
  const glowTex = makeGlowTexture(128);
  const bulbY = 3.12;
  const cordGeo = new THREE.CylinderGeometry(0.012, 0.012, STACKS.ceiling - bulbY - 0.2, 6);
  const shadeGeo = new THREE.CylinderGeometry(0.03, 0.19, 0.16, 20, 1, true);
  const bulbGeo = new THREE.SphereGeometry(0.05, 14, 10);

  positions.forEach(function (p) {
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.position.set(p.x, (STACKS.ceiling + bulbY) / 2 + 0.08, p.z);
    scene.add(cord);

    const shade = new THREE.Mesh(shadeGeo, brass);
    shade.position.set(p.x, bulbY + 0.16, p.z);
    scene.add(shade);

    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(p.x, bulbY, p.z);
    scene.add(bulb);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffcf96, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    halo.scale.setScalar(0.8);
    halo.position.set(p.x, bulbY, p.z);
    scene.add(halo);

    if (p.lit === false) return;
    const light = new THREE.PointLight(theme.light.pendantColor, 17, 12, 2);
    light.position.set(p.x, bulbY - 0.05, p.z);
    scene.add(light);
    lamps.push(light);
  });
  return lamps;
}

function buildLadder(theme, scene, woodTex, x, stops, reducedMotion) {
  const group = new THREE.Group();
  const ladder = new THREE.Group();
  const mat = woodMaterial(woodTex, 0xc0a888, 0.7);
  const brass = new THREE.MeshStandardMaterial({ color: theme.metal.brass, roughness: 0.32, metalness: 0.88 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x241911, roughness: 0.55, metalness: 0.3 });
  const lean = -0.14;
  ladder.rotation.x = lean;
  [-1, 1].forEach(function (s) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 3.35, 0.055), mat);
    rail.position.set(s * 0.24, 1.675, 0);
    ladder.add(rail);
  });
  const rungGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8);
  for (let y = 0.3; y < 3.18; y += 0.34) {
    const rung = new THREE.Mesh(rungGeo, mat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, y, 0.015);
    ladder.add(rung);
  }
  group.add(ladder);

  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.045, 10);
  [-1, 1].forEach(function (s) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 0.24, 3.2, -0.04);
    ladder.add(wheel);
    wheels.push(wheel);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.052, 8), brass);
    cap.rotation.z = Math.PI / 2;
    cap.position.copy(wheel.position);
    ladder.add(cap);
  });
  [-1, 1].forEach(function (s) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 8), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 0.2, 0.1, 0.08);
    ladder.add(wheel);
    wheels.push(wheel);
  });

  const pick = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 3.45, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.set(0, 1.68, 0);
  group.add(pick);
  group.position.set(x, 0, stops[0].z);
  group.rotation.y = Math.PI / 2;
  scene.add(group);

  const collider = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  const record = { isLadder: true, group: group };
  pick.userData.record = record;
  const state = { currentStop: 0, targetStop: 0, moving: false, elapsed: 0, fromZ: stops[0].z };
  const duration = 0.92;

  function updateCollider() {
    collider.minX = group.position.x - 0.27;
    collider.maxX = group.position.x + 0.34;
    collider.minZ = group.position.z - 0.34;
    collider.maxZ = group.position.z + 0.34;
  }

  function setStop(index) {
    state.currentStop = index;
    state.targetStop = index;
    state.moving = false;
    record.moving = false;
    state.elapsed = 0;
    group.position.z = stops[index].z;
    updateCollider();
  }

  updateCollider();
  return {
    group: group, pick: pick, record: record, collider: collider, stops: stops,
    moveNext: function () {
      if (state.moving) return false;
      state.fromZ = group.position.z;
      state.targetStop = (state.currentStop + 1) % stops.length;
      if (reducedMotion) {
        setStop(state.targetStop);
        return true;
      }
      state.elapsed = 0;
      state.moving = true;
      record.moving = true;
      return true;
    },
    update: function (dt) {
      if (!state.moving) return;
      state.elapsed += dt;
      const raw = Math.min(1, state.elapsed / duration);
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      const destination = stops[state.targetStop].z;
      const previousZ = group.position.z;
      group.position.z = state.fromZ + (destination - state.fromZ) * eased;
      const distance = group.position.z - previousZ;
      wheels.forEach(function (wheel) {
        wheel.rotation.y += distance / 0.06;
      });
      updateCollider();
      if (raw >= 1) setStop(state.targetStop);
    },
    state: function () {
      return {
        currentStop: state.currentStop, targetStop: state.targetStop,
        moving: state.moving, x: group.position.x, z: group.position.z,
      };
    },
  };
}

function buildLadderRail(theme, scene, x) {
  const brass = new THREE.MeshStandardMaterial({ color: theme.metal.brass, roughness: 0.3, metalness: 0.9 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 4.25, 10), brass);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(x - 0.24, 3.18, -2.3);
  scene.add(rail);
  [-4.25 / 2, 0, 4.25 / 2].forEach(function (offset) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.06), brass);
    bracket.position.set(x - 0.17, 3.18, -2.3 + offset);
    scene.add(bracket);
  });
}

function buildDust(scene, bounds, cones, coarse) {
  const count = coarse ? 110 : 340;
  const rng = mulberry32(51);
  const positions = new Float32Array(count * 3);
  const velocities = [];
  const coneShare = cones && cones.length ? 0.66 : 0;
  for (let i = 0; i < count; i++) {
    if (rng() < coneShare) {
      const cone = cones[Math.floor(rng() * cones.length)];
      const rad = 0.55;
      positions[i * 3] = cone.x + (rng() - 0.5) * rad;
      positions[i * 3 + 1] = 0.4 + rng() * (cone.y - 0.4);
      positions[i * 3 + 2] = cone.z + (rng() - 0.5) * rad;
    } else {
      positions[i * 3] = bounds.xMin + rng() * (bounds.xMax - bounds.xMin);
      positions[i * 3 + 1] = 0.2 + rng() * 3.8;
      positions[i * 3 + 2] = bounds.zMin + rng() * (bounds.zMax - bounds.zMin);
    }
    velocities.push({
      x: (rng() - 0.5) * 0.035, y: 0.008 + rng() * 0.03, z: (rng() - 0.5) * 0.02, phase: rng() * Math.PI * 2,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    map: makeGlowTexture(64), color: 0xffdcb0, size: 0.028,
    transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending,
    depthWrite: false, sizeAttenuation: true,
  }));
  points.renderOrder = 6;
  scene.add(points);

  return function updateDust(dt, t) {
    const pos = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const v = velocities[i];
      pos[i * 3] += (v.x + Math.sin(t * 0.4 + v.phase) * 0.01) * dt;
      pos[i * 3 + 1] += v.y * dt;
      pos[i * 3 + 2] += v.z * dt;
      if (pos[i * 3 + 1] > 4.1) {
        pos[i * 3 + 1] = 0.15;
      }
    }
    geo.attributes.position.needsUpdate = true;
  };
}

// Each shelf FACE holds one group (year, to-read, or undated); a group
// larger than one face's capacity spills onto consecutive faces
// (viewer-port.md §5). Groups here are the [{key,label,books}] from
// adapter.js's buildGroups, already ordered newest-first with to-read/
// undated appended. Currently-reading books go to the reading table, not a
// shelf face, and are passed separately.
export function buildStacks(theme, scene, groups, opts) {
  const reducedMotion = !!(opts && opts.reducedMotion);
  const coarseDust = !!(opts && opts.coarseDust);
  const woodTex = makeWoodTexture(theme);
  const floorTex = makeFloorTexture(theme);

  scene.fog = new THREE.FogExp2(theme.light.fogColor, theme.light.fogDensity);
  scene.background = new THREE.Color(theme.light.fogColor);
  scene.add(new THREE.HemisphereLight(theme.light.ambientSky, theme.light.ambientGround, theme.light.ambientIntensity));
  const floorFill = new THREE.DirectionalLight(theme.light.fillColor, theme.light.fillIntensity);
  floorFill.position.set(0, 6, 2);
  scene.add(floorFill);

  // Face count: one per group, plus one extra face for any group whose book
  // count exceeds a single face's rough capacity (~40 books across 3 rows),
  // so spill has somewhere to land without shrinking capacity elsewhere.
  const facesNeeded = groups.reduce(function (sum, g) {
    return sum + Math.max(1, Math.ceil(g.books.length / 40));
  }, 0);
  const aisleCount = Math.max(1, Math.ceil(facesNeeded / 2));
  const unitCount = aisleCount + 1;
  const lastUnitX = (unitCount - 1) * STACKS.pitch;
  const bounds = {
    xMin: -(STACKS.unitThickness / 2 + STACKS.aisleWidth),
    xMax: lastUnitX + STACKS.unitThickness / 2 + STACKS.aisleWidth,
    zMin: -STACKS.unitLength - 1.4,
    zMax: STACKS.walkwayDepth + STACKS.entryDepth,
  };
  const xMid = (bounds.xMin + bounds.xMax) / 2;

  const unitFaces = [];
  const colliders = [];
  const occluders = [];
  for (let i = 0; i < unitCount; i++) {
    const ux = i * STACKS.pitch;
    unitFaces.push(buildUnit(scene, woodTex, ux, occluders));
    colliders.push({
      minX: ux - STACKS.unitThickness / 2, maxX: ux + STACKS.unitThickness / 2,
      minZ: -STACKS.unitLength - 0.05, maxZ: 0.12,
    });
  }

  // Enumerate all shelf faces in aisle order (left face, right face per
  // aisle), then assign groups (with spill) across them in sequence.
  const allFaces = [];
  const aisles = [];
  for (let i = 0; i < aisleCount; i++) {
    const aisleX = i * STACKS.pitch + STACKS.pitch / 2;
    const leftGroup = unitFaces[i][1];
    const rightGroup = unitFaces[i + 1][-1];
    allFaces.push({ group: leftGroup, aisleX: aisleX, side: -1 });
    allFaces.push({ group: rightGroup, aisleX: aisleX, side: 1 });
    aisles.push({ years: [], x: aisleX, mouthZ: 1.2 });
  }

  const bays = [];
  let faceIdx = 0;
  groups.forEach(function (g) {
    const facesForGroup = Math.max(1, Math.ceil(g.books.length / 40));
    for (let p = 0; p < facesForGroup && faceIdx < allFaces.length; p++) {
      const face = allFaces[faceIdx++];
      const partSuffix = facesForGroup > 1 ? " (" + (p + 1) + "/" + facesForGroup + ")" : "";
      bays.push({
        year: g.kind === "year" ? Number(g.key) : null,
        group: face.group, width: STACKS.unitLength, aisleX: face.aisleX,
        groupKey: g.key, groupLabel: (g.label || String(g.key)) + partSuffix, groupKind: g.kind,
      });
    }
  });

  const decorBays = [];
  for (; faceIdx < allFaces.length; faceIdx++) {
    decorBays.push({ year: null, group: allFaces[faceIdx].group, width: STACKS.unitLength });
  }

  // Plaques: one per bay that actually got a group assigned, on the correct
  // side of its aisle.
  const plaques = [];
  bays.forEach(function (bay) {
    const face = allFaces.find(function (f) {
      return f.group === bay.group;
    });
    if (!face) return;
    const label = bay.groupLabel;
    plaques.push(buildAisleSign(scene, label, face.aisleX, face.side));
    const aisle = aisles.find(function (a) {
      return a.x === face.aisleX;
    });
    if (aisle) aisle.years.push(bay.groupKind === "year" ? bay.year : bay.groupKey);
  });

  const doorX = aisles[Math.min(1, aisles.length - 1)].x;
  const entry = buildEntry(theme, scene, woodTex, doorX, bounds.zMax, colliders);
  const room = buildRoom(theme, scene, floorTex, woodTex, bounds, entry.doorway);
  room.colliders.forEach(function (c) {
    colliders.push(c);
  });

  const tableZ = STACKS.walkwayDepth + 2.6;
  const furniture = buildEntryFurniture(theme, scene, woodTex, xMid, tableZ);
  const tableLamp = furniture.lamp;
  colliders.push({
    minX: xMid - 0.95, maxX: xMid + 0.95, minZ: tableZ - 0.58, maxZ: tableZ + 0.58,
  });

  const ladderX = 0.58;
  const ladder = buildLadder(theme, scene, woodTex, ladderX, [
    { z: -0.82 }, { z: -2.3 }, { z: -3.78 },
  ], reducedMotion);
  buildLadderRail(theme, scene, ladderX);
  colliders.push(ladder.collider);

  const pendantPositions = aisles.map(function (a, i) {
    return { x: a.x, z: -STACKS.unitLength / 2, lit: i % 2 === 0 };
  });
  const span = bounds.xMax - bounds.xMin;
  [0.28, 0.72].forEach(function (f) {
    pendantPositions.push({ x: bounds.xMin + span * f, z: STACKS.walkwayDepth / 2 + 0.4, lit: true });
  });
  const lamps = buildPendants(theme, scene, pendantPositions);
  lamps.push(tableLamp);

  const dustCones = pendantPositions.map(function (p) {
    return { x: p.x, y: 3.12, z: p.z };
  });
  const updateDust = buildDust(scene, bounds, dustCones, coarseDust);

  return {
    bays: bays, decorBays: decorBays, plaques: plaques, lamps: lamps,
    updateDust: updateDust, colliders: colliders, aisles: aisles,
    spawn: entry.spawn, bounds: bounds, entry: entry,
    occluders: occluders, ladder: ladder, updateClock: room.updateClock,
  };
}
