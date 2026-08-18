import * as THREE from "three";
import { leatherFor, makeSpineTexture, mulberry32 } from "./textures.js";
import { STACKS } from "./stacks-constants.js";

export const BOOK_DEPTH = 0.235;
const PICK_MIN_THICKNESS = 0.11;
const PICK_THICKNESS_PAD = 0.05;
const PICK_HEIGHT_PAD = 0.04;
const PICK_DEPTH = 0.34;

// Module-level singletons shared across every createLibrary() call — a book's
// actual size comes from mesh.scale, not the geometry, so one unit box/plane
// serves every book everywhere. destroy() must never dispose these (PLAN.md
// §4.3): doing so would corrupt every OTHER open/future viewer instance since
// they share the same GPU buffer. Marked so the generic disposal pass in
// index.js can recognize and skip them.
const unitBox = new THREE.BoxGeometry(1, 1, 1);
unitBox.userData.shared = true;
const unitPlane = new THREE.PlaneGeometry(1, 1);
unitPlane.userData.shared = true;
const pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
pickMaterial.userData.shared = true;

function coverMaterialFor(cache, colors) {
  const key = colors.h + "/" + colors.s + "/" + colors.l;
  if (!cache.has(key)) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.0 });
    mat.color.setHSL(colors.h / 360, colors.s / 100, colors.l / 100);
    cache.set(key, mat);
  }
  return cache.get(key);
}

// format-driven dims (manifest-schema.md §4): hardcover taller/thicker,
// paperback thinner, digital/audio a deliberately odd slim case. Falls back
// to the spine_seed-jittered dims when format is absent (5.6% of the real
// export).
function realBookDims(book) {
  const seedTh = 0.046 + book.spine_seed * 0.028;
  const seedHt = 0.30 + book.spine_seed * 0.16;
  switch (book.format) {
    case "hardcover":
      return { th: seedTh * 1.35 + 0.01, ht: seedHt * 1.08 + 0.01 };
    case "paperback":
      return { th: seedTh * 0.75, ht: seedHt * 0.94 };
    case "digital":
    case "audio":
      return { th: 0.025 + book.spine_seed * 0.01, ht: seedHt * 0.82 };
    default:
      return { th: seedTh, ht: seedHt };
  }
}

function rowCounts(n, rows) {
  const base = Math.floor(n / rows);
  const extra = n % rows;
  const counts = [];
  for (let r = 0; r < rows; r++) {
    counts.push(base + (r < extra ? 1 : 0));
  }
  return counts;
}

function makeRealBook(theme, coverCache, book, dims) {
  const colors = leatherFor(theme, book);
  const group = new THREE.Group();

  const body = new THREE.Mesh(unitBox, coverMaterialFor(coverCache, colors));
  body.scale.set(dims.th, dims.ht, BOOK_DEPTH);
  body.position.z = -BOOK_DEPTH / 2;
  group.add(body);

  const spineMaps = makeSpineTexture(book, colors);
  const spine = new THREE.Mesh(unitPlane, new THREE.MeshStandardMaterial({
    map: spineMaps.map,
    emissive: 0xffffff,
    emissiveMap: spineMaps.emissiveMap,
    emissiveIntensity: 0.3,
    roughness: 0.55, metalness: 0.0,
  }));
  spine.scale.set(dims.th * 0.985, dims.ht * 0.985, 1);
  spine.position.z = 0.002;
  group.add(spine);

  const pickTh = Math.max(PICK_MIN_THICKNESS, dims.th + PICK_THICKNESS_PAD);
  const pick = new THREE.Mesh(unitBox, pickMaterial);
  pick.scale.set(pickTh, dims.ht + PICK_HEIGHT_PAD, PICK_DEPTH);
  pick.position.z = PICK_DEPTH / 2 - BOOK_DEPTH;
  group.add(pick);

  return { group: group, pick: pick, colors: colors };
}

function fillRow(innerW, reals, rng, onReal, onFiller) {
  const xEnd = innerW / 2 - 0.05;
  let cursor = -innerW / 2 + 0.05;
  let realIdx = 0;
  let leanNext = 0;

  while (cursor < xEnd - 0.08) {
    const remainingSlots = Math.max(1, (xEnd - cursor) / 0.08);
    const remainingReals = reals.length - realIdx;
    const takeReal = remainingReals > 0 && rng() < remainingReals / remainingSlots;

    if (takeReal) {
      const book = reals[realIdx++];
      const dims = realBookDims(book);
      if (cursor + dims.th > xEnd) break;
      onReal(book, dims, cursor + dims.th / 2);
      cursor += dims.th + 0.004;
      leanNext = 0;
    } else {
      const th = 0.04 + rng() * 0.03;
      const ht = 0.27 + rng() * 0.18;
      if (cursor + th > xEnd) break;
      onFiller(th, ht, cursor + th / 2, leanNext);
      cursor += th + 0.004 + Math.abs(leanNext) * ht * 0.9;
      leanNext = 0;
    }

    if (rng() < 0.035) {
      const gap = 0.025 + rng() * 0.075;
      cursor += gap;
      if (rng() < 0.55) {
        leanNext = -(0.06 + rng() * 0.09);
      }
    }
  }
  return reals.slice(realIdx);
}

// Places one group's books into a run of consecutive bays (spill: a group
// too large for one face continues onto the next, per viewer-port.md §5).
// Returns leftover books that did not fit any bay in the run (should be
// empty when enough bays were allocated).
function placeBay(rng, records, raycastTargets, fillers, theme, coverCache, bay, reals) {
  const innerW = bay.width - 0.3;
  const counts = rowCounts(reals.length, STACKS.rowBottoms.length);
  const bookFrontZ = STACKS.caseDepth / 2 - 0.03;
  let offset = 0;
  let overflow = [];

  STACKS.rowBottoms.forEach(function (rowY, r) {
    let rowReals = reals.slice(offset, offset + counts[r]);
    offset += counts[r];
    rowReals = overflow.concat(rowReals);
    let rowRecord = null;
    overflow = fillRow(innerW, rowReals, rng,
      function onReal(book, dims, x) {
        const built = makeRealBook(theme, coverCache, book, dims);
        const group = built.group;
        group.position.set(x, rowY + dims.ht / 2, bookFrontZ);
        bay.group.add(group);
        const record = {
          book: book, bay: bay, group: group, dims: dims,
          colors: built.colors, prevOnShelf: rowRecord, nextOnShelf: null,
        };
        if (rowRecord) rowRecord.nextOnShelf = record;
        rowRecord = record;
        group.traverse(function (child) {
          child.userData.record = record;
        });
        records.push(record);
        raycastTargets.push(built.pick);
      },
      function onFiller(th, ht, x, lean) {
        fillers.push({
          bay: bay, th: th, ht: ht, x: x,
          y: rowY + ht / 2 + Math.abs(lean) * th * 0.4,
          z: bookFrontZ - 0.01 - rng() * 0.02, lean: lean,
        });
      });
  });
  return overflow;
}

// Places groups' books into bays, one group per bay, continuing a group onto
// the next bay when it overflows (spill). `bays` are assigned in order.
export function buildBooks(theme, scene, bays, decorBays, groups) {
  const records = [];
  const raycastTargets = [];
  const fillers = [];
  const rng = mulberry32(2017);
  const coverCache = new Map();

  // `bays` was already allocated to groups, in order, by buildStacks (which
  // also built the plaques from that same allocation) — walk it in lockstep
  // rather than re-deriving group -> bay assignment here.
  let bayIdx = 0;
  groups.forEach(function (group) {
    let remaining = group.books;
    while (bayIdx < bays.length) {
      const bay = bays[bayIdx++];
      const leftover = placeBay(rng, records, raycastTargets, fillers, theme, coverCache, bay, remaining);
      if (leftover.length === 0 || leftover.length === remaining.length) {
        remaining = leftover;
        break;
      }
      remaining = leftover;
    }
    if (remaining.length > 0) {
      console.warn("Library: " + remaining.length + " books of group " + group.key + " did not fit any shelf face");
    }
  });

  decorBays.concat(bays.slice(bayIdx)).forEach(function (bay) {
    placeBay(rng, records, raycastTargets, fillers, theme, coverCache, bay, []);
  });

  const fillerMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });
  const instanced = new THREE.InstancedMesh(unitBox, fillerMat, fillers.length);
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const leanQuat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  const zAxis = new THREE.Vector3(0, 0, 1);

  fillers.forEach(function (f, i) {
    f.bay.group.updateMatrixWorld(true);
    pos.set(f.x, f.y, f.z - 0.11);
    f.bay.group.localToWorld(pos);
    quat.copy(f.bay.group.quaternion);
    if (f.lean !== 0) {
      leanQuat.setFromAxisAngle(zAxis, f.lean);
      quat.multiply(leanQuat);
    }
    scale.set(f.th, f.ht, 0.21 + rng() * 0.025);
    matrix.compose(pos, quat, scale);
    instanced.setMatrixAt(i, matrix);

    color.setHSL((20 + rng() * 20) / 360, 0.05 + rng() * 0.05, 0.012 + rng() * 0.022);
    instanced.setColorAt(i, color);
  });
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  scene.add(instanced);

  return { records: records, raycastTargets: raycastTargets, fillerMesh: instanced };
}
