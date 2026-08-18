import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { buildStacks, STACKS } from "./scene/stacks.js";
import { buildBooks, BOOK_DEPTH } from "./scene/books.js";
import { createOverlay } from "./ui/overlay.js";
import { createPlayer } from "./scene/player.js";
import { createGrab } from "./scene/grab.js";
import { createTouchController } from "./ui/touch.js";
import { buildTemplate, resolveElements } from "./ui/template.js";
import { themeFromPresetId } from "./theme/tokens.js";
import { buildGroups } from "./adapter.js";

const REACH = 2.0;
const ENTER_TIMING = { beat: 0.3, doors: 0.9, walk: 1.2 };

let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const cssUrl = new URL("./viewer.css", import.meta.url);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssUrl.href;
  document.head.appendChild(link);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function relativeLuminance(h, s, l) {
  const color = new THREE.Color().setHSL(h / 360, s / 100, l / 100);
  const channel = function (c) {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

export function createLibrary(root, manifest, opts = {}) {
  injectCss();

  const theme = themeFromPresetId(manifest.theme && manifest.theme.presetId);
  const reducedMotion = opts.reducedMotion !== undefined
    ? opts.reducedMotion
    : (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const touchModeOpt = opts.touchMode || "auto";
  const touchMode = touchModeOpt === "force" ? true : touchModeOpt === "off" ? false : (
    (typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("touch") === "1" ||
        !window.matchMedia("(any-pointer: fine)").matches ||
        !("requestPointerLock" in HTMLElement.prototype)))
  );

  const fragment = buildTemplate(manifest.displayName);
  root.appendChild(fragment);
  const bwRoot = root.querySelector(".bw-root");
  const els = resolveElements(bwRoot);
  const {
    canvas, introEl, pauseEl, fadeEl, bootEl, controlsHintEl, reticleEl, aimLabelEl,
    escHintEl, pauseBtn, joystickEl, fallbackEl, fallbackReasonEl,
  } = els;

  if (touchMode) {
    bwRoot.classList.add("bw-touch-mode");
  }

  function showFallback(reason) {
    fallbackReasonEl.textContent = reason;
    fallbackEl.hidden = false;
    introEl.classList.add("bw-gone");
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
  } catch (err) {
    showFallback("This view needs WebGL, which your browser could not provide.");
    if (opts.onError) opts.onError(err);
    return {
      destroy: function () {
        root.removeChild(fragment.firstChild || bwRoot);
      },
      setTheme: function () {},
      state: function () {
        return { ready: false, entered: false, locked: false, touchMode: touchMode };
      },
    };
  }

  function widthHeight() {
    const rect = root.getBoundingClientRect();
    return { w: Math.max(1, rect.width), h: Math.max(1, rect.height) };
  }

  let { w: viewW, h: viewH } = widthHeight();
  renderer.setPixelRatio(Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio : 1, touchMode ? 1.15 : 1.5));
  renderer.setSize(viewW, viewH);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = theme.light.exposure;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, viewW / viewH, 0.05, 80);

  const composer = touchMode ? null : new EffectComposer(renderer);
  if (composer) {
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(viewW, viewH), theme.light.bloomStrength, 0.5, 0.82);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }

  const overlay = createOverlay(theme, els);
  let stacks = null;
  let player = null;
  let grab = null;
  let records = [];
  let raycastTargets = [];
  let occluders = [];
  let started = false;
  let entered = false;
  let touchController = null;
  let frameEma = 0;
  let destroyed = false;

  let enterSeq = null;
  let doorsOpen = 0;

  function startEnterSequence() {
    const spawn = stacks.entry.spawn;
    const target = stacks.entry.insideSpawn;
    player.teleport(spawn.x, spawn.z, spawn.yaw, 0);
    player.setEnabled(false);
    enterSeq = {
      phase: "beat", t: 0, fromX: spawn.x, fromZ: spawn.z, toX: target.x, toZ: target.z, yaw: target.yaw,
    };
  }

  function finishEnterInstant() {
    const target = stacks.entry.insideSpawn;
    stacks.entry.setOpen(1);
    doorsOpen = 1;
    player.teleport(target.x, target.z, target.yaw, 0);
    player.setEnabled(true);
    enterSeq = null;
  }

  function updateEnterSequence(dt) {
    if (!enterSeq) return;
    enterSeq.t += dt;
    if (enterSeq.phase === "beat") {
      if (enterSeq.t >= ENTER_TIMING.beat) {
        enterSeq.t = 0;
        enterSeq.phase = "doors";
      }
      return;
    }
    if (enterSeq.phase === "doors") {
      const k = Math.min(1, enterSeq.t / ENTER_TIMING.doors);
      doorsOpen = easeInOut(k);
      stacks.entry.setOpen(doorsOpen);
      if (k >= 1) {
        doorsOpen = 1;
        stacks.entry.setOpen(1);
        enterSeq.t = 0;
        enterSeq.phase = "walk";
      }
      return;
    }
    if (enterSeq.phase === "walk") {
      const raw = Math.min(1, enterSeq.t / ENTER_TIMING.walk);
      const p = easeInOut(raw);
      const x = enterSeq.fromX + (enterSeq.toX - enterSeq.fromX) * p;
      const z = enterSeq.fromZ + (enterSeq.toZ - enterSeq.fromZ) * p;
      player.teleport(x, z, enterSeq.yaw, 0);
      player.state.speedFactor = Math.sin(raw * Math.PI);
      player.state.bobPhase += dt * 5 * player.state.speedFactor;
      if (raw >= 1) {
        player.state.speedFactor = 0;
        player.setEnabled(true);
        enterSeq = null;
      }
    }
  }

  function siblingsForBook(book) {
    return records
      .filter(function (r) {
        return r.book.year === book.year && book.year !== null;
      })
      .map(function (r) {
        return r.book;
      });
  }

  function start() {
    const { groups } = buildGroups(manifest);
    stacks = buildStacks(theme, scene, groups, { reducedMotion: reducedMotion, coarseDust: touchMode });
    const built = buildBooks(theme, scene, stacks.bays, stacks.decorBays, groups);
    records = built.records;
    raycastTargets = built.raycastTargets;
    occluders = stacks.occluders || [];
    if (stacks.ladder) raycastTargets.push(stacks.ladder.pick);

    player = createPlayer(scene, camera, canvas, stacks.colliders, reducedMotion);
    player.teleport(stacks.spawn.x, stacks.spawn.z, stacks.spawn.yaw, 0);
    player.onLockChange(onLockChange);
    grab = createGrab(scene, camera, player, overlay, onBookReturned, siblingsForBook);
    if (touchMode) {
      const introText = introEl.querySelector(".bw-intro-pill-text");
      if (introText) introText.textContent = "tap to enter";
      if (controlsHintEl) {
        controlsHintEl.textContent = "drag to look · left thumb to walk · tap an object to interact";
      }
    }
    if (joystickEl) {
      touchController = createTouchController(canvas, player, joystickEl, function () {
        if (started && entered && !overlay.isOpen() && !enterSeq && aimed) {
          interactWith(aimed);
        }
      });
    }

    started = true;
    if (opts.onReady) opts.onReady();
  }

  let hintTimer = null;
  function showControlsHint() {
    if (!controlsHintEl) return;
    controlsHintEl.classList.add("bw-visible");
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(function () {
      controlsHintEl.classList.remove("bw-visible");
    }, 4500);
  }

  function enter() {
    entered = true;
    introEl.classList.add("bw-fading");
    window.setTimeout(function () {
      introEl.classList.add("bw-gone");
    }, 600);
    bwRoot.classList.add("bw-playing");
    if (touchMode) {
      player.setEngaged(true);
    } else {
      player.lock();
    }
    showControlsHint();
    if (reducedMotion) {
      finishEnterInstant();
    } else {
      startEnterSequence();
    }
  }

  introEl.addEventListener("click", function () {
    if (started && !entered) enter();
  });

  function onLockChange(locked) {
    if (!entered) return;
    const paused = !locked && !overlay.isOpen();
    pauseEl.classList.toggle("bw-visible", paused);
  }

  function requestResume() {
    if (touchMode) {
      player.setEngaged(true);
      pauseEl.classList.remove("bw-visible");
      return;
    }
    player.lock().then(function () {
      if (!player.state.locked) {
        window.setTimeout(function () {
          if (!player.state.locked && !overlay.isOpen()) {
            player.lock();
          }
        }, 1300);
      }
    });
  }

  pauseEl.addEventListener("click", requestResume);

  if (pauseBtn) {
    pauseBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      if (touchMode && entered && !overlay.isOpen()) {
        player.setEngaged(false);
        pauseEl.classList.add("bw-visible");
      }
    });
  }

  canvas.addEventListener("click", function () {
    if (!started || !entered || overlay.isOpen()) return;
    if (!player.state.engaged) requestResume();
  });

  const raycaster = new THREE.Raycaster();
  raycaster.far = REACH;
  const centerNdc = new THREE.Vector2(0, 0);
  const aimAssistNdc = [
    new THREE.Vector2(-0.035, 0), new THREE.Vector2(0.035, 0),
    new THREE.Vector2(0, -0.035), new THREE.Vector2(0, 0.035),
  ];
  let aimed = null;

  function pickCenter() {
    if (!started) return null;
    player.rigYaw.updateMatrixWorld(true);
    const intersect = function (ndc) {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(raycastTargets.concat(occluders), false);
      return hits.length ? hits[0].object.userData.record || null : null;
    };
    const direct = intersect(centerNdc);
    if (direct || !touchMode) return direct;
    for (let i = 0; i < aimAssistNdc.length; i++) {
      const assisted = intersect(aimAssistNdc[i]);
      if (assisted) return assisted;
    }
    return null;
  }

  function setAimed(record) {
    if (aimed === record) return;
    aimed = record;
    if (record && record.isLadder) {
      aimLabelEl.textContent = "move ladder";
      aimLabelEl.style.background = "rgba(10, 6, 3, 0.72)";
      aimLabelEl.style.color = "#f6ecd9";
      reticleEl.classList.add("bw-aiming");
      aimLabelEl.classList.add("bw-visible");
    } else if (record) {
      aimLabelEl.textContent = record.book.author + " — " + record.book.title;
      if (record.colors) {
        const c = record.colors;
        aimLabelEl.style.background = "hsl(" + c.h + ", " + c.s + "%, " + c.l + "%)";
        aimLabelEl.style.color = relativeLuminance(c.h, c.s, c.l) > 0.4 ? "#241a10" : "#f6ecd9";
      }
      reticleEl.classList.add("bw-aiming");
      aimLabelEl.classList.add("bw-visible");
    } else {
      reticleEl.classList.remove("bw-aiming");
      aimLabelEl.classList.remove("bw-visible");
    }
  }

  const POP_OUT = 0.085;
  const POP_TILT = THREE.MathUtils.degToRad(13);
  const POP_TIME = 0.15;
  const POP_EMISSIVE_BOOST = 1.15;
  const NEIGHBOR_DIM = 0.45;
  const MISS_GRACE = 0.08;
  const pops = [];
  let missTimer = 0;
  const popTiltQuat = new THREE.Quaternion();
  const popAxis = new THREE.Vector3(1, 0, 0);
  const popTranslation = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const localOutZ = new THREE.Vector3(0, 0, 1);

  function neighborSpineMat(record) {
    return record && record.group.children[1] ? record.group.children[1].material : null;
  }

  function findPop(record) {
    return pops.find(function (p) {
      return p.record === record;
    }) || null;
  }

  function restPoseFor(record) {
    const entry = findPop(record);
    return {
      position: entry ? entry.restPos.clone() : record.group.position.clone(),
      quaternion: entry ? entry.restQuat.clone() : record.group.quaternion.clone(),
    };
  }

  function beginPopEntry(record) {
    let entry = findPop(record);
    if (entry) {
      entry.goal = 1;
      return;
    }
    const spine = record.group.children[1];
    const spineMat = spine ? spine.material : null;
    const neighbors = [];
    [record.prevOnShelf, record.nextOnShelf].forEach(function (n) {
      const mat = neighborSpineMat(n);
      if (mat) neighbors.push({ mat: mat, base: mat.emissiveIntensity, baseColor: mat.color.clone() });
    });
    entry = {
      record: record, k: 0, goal: 1,
      restPos: record.group.position.clone(), restQuat: record.group.quaternion.clone(),
      spineMat: spineMat, baseEmissive: spineMat ? spineMat.emissiveIntensity : 0, neighbors: neighbors,
    };
    pops.push(entry);
  }

  function beginRetract(record) {
    const entry = findPop(record);
    if (entry) entry.goal = 0;
  }

  function dropPopEntry(record) {
    const idx = pops.findIndex(function (p) {
      return p.record === record;
    });
    if (idx === -1) return;
    const entry = pops[idx];
    if (entry.spineMat) entry.spineMat.emissiveIntensity = entry.baseEmissive;
    entry.neighbors.forEach(function (n) {
      n.mat.emissiveIntensity = n.base;
      n.mat.color.copy(n.baseColor);
    });
    pops.splice(idx, 1);
  }

  function updatePopEntry(entry, dt) {
    const k = 1 - Math.exp(-dt / Math.max(POP_TIME / 3, 0.001));
    entry.k += (entry.goal - entry.k) * k;
    if (entry.goal === 0 && entry.k < 0.002) {
      entry.record.group.position.copy(entry.restPos);
      entry.record.group.quaternion.copy(entry.restQuat);
      if (entry.spineMat) entry.spineMat.emissiveIntensity = entry.baseEmissive;
      entry.neighbors.forEach(function (n) {
        n.mat.emissiveIntensity = n.base;
        n.mat.color.copy(n.baseColor);
      });
      return false;
    }

    const ht = entry.record.dims ? entry.record.dims.ht : 0.3;
    pivot.set(0, -ht / 2, -BOOK_DEPTH);
    popTiltQuat.setFromAxisAngle(popAxis, POP_TILT * entry.k);
    popTranslation.copy(pivot).applyQuaternion(popTiltQuat).sub(pivot);

    entry.record.group.position.copy(entry.restPos).add(popTranslation).addScaledVector(localOutZ, POP_OUT * entry.k);
    tmpQuat.copy(entry.restQuat).multiply(popTiltQuat);
    entry.record.group.quaternion.copy(tmpQuat);

    if (entry.spineMat) {
      entry.spineMat.emissiveIntensity = entry.baseEmissive + (POP_EMISSIVE_BOOST - entry.baseEmissive) * entry.k;
    }
    entry.neighbors.forEach(function (n) {
      n.mat.emissiveIntensity = n.base * (1 - (1 - NEIGHBOR_DIM) * entry.k);
      n.mat.color.copy(n.baseColor).multiplyScalar(1 - (1 - NEIGHBOR_DIM) * entry.k);
    });

    return true;
  }

  function updateAnticipation(dt) {
    const rawTarget = (aimed && !aimed.isLadder && grab.isIdle() && !overlay.isOpen()) ? aimed : null;

    if (rawTarget) {
      missTimer = 0;
      pops.forEach(function (p) {
        if (p.record !== rawTarget) beginRetract(p.record);
      });
      beginPopEntry(rawTarget);
    } else {
      missTimer += dt;
      if (missTimer >= MISS_GRACE) {
        pops.forEach(function (p) {
          beginRetract(p.record);
        });
      }
    }

    for (let i = pops.length - 1; i >= 0; i--) {
      if (!updatePopEntry(pops[i], dt)) pops.splice(i, 1);
    }
  }

  function interactWith(record) {
    if (record && record.isLadder) return stacks.ladder.moveNext();
    if (!record) return false;
    const restPose = restPoseFor(record);
    dropPopEntry(record);
    if (grab.begin(record, restPose)) {
      setAimed(null);
      return true;
    }
    return false;
  }

  function onBookReturned() {
    player.setEnabled(true);
    canvas.focus({ preventScroll: true });
    if (entered && !touchMode) player.lock();
  }

  document.addEventListener("keydown", onEscKeydown);
  function onEscKeydown(event) {
    if (destroyed) return;
    if (event.code !== "Escape") return;
    if (pauseEl.classList.contains("bw-visible")) requestResume();
  }

  canvas.addEventListener("mousedown", onCanvasMousedown);
  function onCanvasMousedown(event) {
    if (!started || overlay.isOpen() || !player.state.engaged || enterSeq) return;
    if (event.button === 0 && aimed) interactWith(aimed);
  }

  document.addEventListener("keydown", onEKeydown);
  function onEKeydown(event) {
    if (destroyed || !started || overlay.isOpen() || enterSeq) return;
    if (event.code === "KeyE" && aimed && player.state.engaged) interactWith(aimed);
  }

  function onResize() {
    const { w, h } = widthHeight();
    viewW = w;
    viewH = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);
  let resizeObserver = null;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(root);
  }

  let lastFrameTime = performance.now();
  let elapsedTime = 0;
  let lastClockUpdate = -1;
  let readyFlagged = false;
  let rafId = null;
  function animate() {
    if (destroyed) return;
    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    elapsedTime += dt;
    frameEma = frameEma ? frameEma * 0.92 + dt * 1000 * 0.08 : dt * 1000;

    if (started) {
      stacks.ladder.update(dt);
      player.update(dt);
      updateEnterSequence(dt);
      grab.update(dt);
      stacks.updateDust(dt, elapsedTime);
      updateAnticipation(dt);

      if (!overlay.isOpen() && grab.isIdle() && !enterSeq) {
        setAimed(pickCenter());
      }
      if (escHintEl) {
        escHintEl.classList.toggle("bw-visible", player.state.engaged && !touchMode);
      }
      if (stacks.updateClock && elapsedTime - lastClockUpdate >= 1) {
        lastClockUpdate = elapsedTime;
        stacks.updateClock();
      }
    }

    if (composer) composer.render(); else renderer.render(scene, camera);

    if (started && !readyFlagged) {
      readyFlagged = true;
      if (bootEl) bootEl.classList.add("bw-gone");
    }
    rafId = requestAnimationFrame(animate);
  }

  start();
  rafId = requestAnimationFrame(animate);

  function findRecord(id) {
    return records.find(function (r) {
      return r.book.id === id;
    }) || null;
  }

  function aimAtRecord(record) {
    const bookPos = new THREE.Vector3();
    record.group.updateMatrixWorld(true);
    record.group.getWorldPosition(bookPos);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(record.group.getWorldQuaternion(new THREE.Quaternion()));

    const standX = bookPos.x + normal.x * 1.05;
    const standZ = bookPos.z + normal.z * 1.05;
    const eye = new THREE.Vector3(standX, STACKS.eyeHeight, standZ);
    const dir = bookPos.clone().sub(eye);
    const yaw = Math.atan2(-dir.x, -dir.z);
    const pitchVal = Math.asin(dir.y / dir.length());

    player.teleport(standX, standZ, yaw, pitchVal);
    setAimed(pickCenter());
    return aimed === record;
  }

  function aimAtLadder() {
    if (!stacks || !stacks.ladder) return false;
    const target = new THREE.Vector3();
    stacks.ladder.group.updateMatrixWorld(true);
    stacks.ladder.group.getWorldPosition(target);
    target.y = STACKS.eyeHeight;
    const standX = target.x + 1.0;
    const standZ = target.z;
    const eye = new THREE.Vector3(standX, STACKS.eyeHeight, standZ);
    const dir = target.clone().sub(eye);
    player.teleport(standX, standZ, Math.atan2(-dir.x, -dir.z), 0);
    setAimed(pickCenter());
    return aimed === stacks.ladder.record;
  }

  function disposeObject(obj) {
    // Module-level singletons (books.js's unit box/plane/pick material) are
    // shared across every createLibrary() instance and must survive this
    // instance's destroy() — see the comment at their declaration.
    if (obj.geometry && !obj.geometry.userData.shared) obj.geometry.dispose();
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach(function (mat) {
        if (mat.userData.shared) return;
        Object.keys(mat).forEach(function (key) {
          const value = mat[key];
          if (value && value.isTexture) value.dispose();
        });
        mat.dispose();
      });
    }
  }

  const handle = {
    destroy: function () {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      if (resizeObserver) resizeObserver.disconnect();
      document.removeEventListener("keydown", onEscKeydown);
      document.removeEventListener("keydown", onEKeydown);
      canvas.removeEventListener("mousedown", onCanvasMousedown);
      if (touchController) touchController.destroy();
      overlay.destroy();
      scene.traverse(disposeObject);
      renderer.dispose();
      if (composer) composer.dispose();
      // dispose() frees GPU-side buffers/programs but keeps the WebGL context
      // itself alive; forcing context loss actually releases it. Without
      // this, repeated mount/unmount (the customize step) can pile up
      // contexts and hit the browser's per-page WebGL context limit.
      const gl = renderer.getContext();
      const loseContextExt = gl && gl.getExtension && gl.getExtension("WEBGL_lose_context");
      if (loseContextExt) loseContextExt.loseContext();
      if (bwRoot.parentNode) bwRoot.parentNode.removeChild(bwRoot);
    },
    setTheme: function () {
      // Live re-theme requires regenerating canvas textures and swapping
      // material.map in place. Deferred to M3 (customize step) — v1 has no
      // geometry-affecting tokens, so a future implementation can hook in
      // here without touching the rest of the public API.
    },
    state: function () {
      const pos = player ? player.rigYaw.position : { x: 0, z: 0 };
      return {
        ready: readyFlagged,
        books: records.length,
        entered: entered,
        locked: player ? player.state.locked : false,
        engaged: player ? player.state.engaged : false,
        touchMode: touchMode,
        joystick: touchController ? touchController.state() : { x: 0, y: 0 },
        frameTime: Number(frameEma.toFixed(1)),
        player: player ? {
          x: Number(pos.x.toFixed(3)), z: Number(pos.z.toFixed(3)),
          yaw: Number(player.state.yaw.toFixed(3)), pitch: Number(player.state.pitch.toFixed(3)),
        } : null,
        aimedBookId: aimed && !aimed.isLadder ? aimed.book.id : null,
        aimedObject: aimed ? (aimed.isLadder ? "ladder" : "book") : null,
        grabState: grab ? grab.state() : "idle",
        overlayOpen: overlay.isOpen(),
        doorsOpen: doorsOpen,
        entering: enterSeq !== null,
      };
    },
    enter: function () {
      entered = true;
      introEl.classList.add("bw-gone");
      bwRoot.classList.add("bw-playing");
      player.setEngaged(true);
      finishEnterInstant();
    },
    enterAnimated: function () {
      entered = true;
      introEl.classList.add("bw-gone");
      bwRoot.classList.add("bw-playing");
      player.setEngaged(true);
      if (reducedMotion) {
        finishEnterInstant();
      } else {
        startEnterSequence();
      }
    },
    teleportTo: function (x, z, yaw, pitchVal) {
      player.teleport(x, z, yaw, pitchVal);
    },
    nudge: function (dx, dz) {
      player.nudge(dx, dz);
    },
    setKeys: function (map) {
      Object.keys(map).forEach(function (code) {
        player.keys[code] = map[code];
      });
    },
    injectLook: function (dx, dy) {
      player.injectLook(dx, dy);
    },
    injectMove: function (x, y) {
      player.injectMove(x, y);
    },
    tap: function () {
      if (aimed && player.state.engaged) interactWith(aimed);
    },
    colliders: function () {
      return stacks ? stacks.colliders : [];
    },
    aimAtBook: function (id) {
      const record = findRecord(id);
      return record ? aimAtRecord(record) : false;
    },
    openBookById: function (id) {
      const record = findRecord(id);
      if (record) {
        aimAtRecord(record);
        setAimed(null);
        const restPose = restPoseFor(record);
        dropPopEntry(record);
        grab.openInstant(record, restPose);
      }
      return !!record;
    },
    grabBookById: function (id) {
      const record = findRecord(id);
      if (record) {
        aimAtRecord(record);
        setAimed(null);
        const restPose = restPoseFor(record);
        dropPopEntry(record);
        grab.begin(record, restPose);
      }
      return !!record;
    },
    closeBook: function () {
      overlay.close();
    },
    aimAtLadder: function () {
      return aimAtLadder();
    },
    moveLadder: function () {
      return stacks && stacks.ladder ? stacks.ladder.moveNext() : false;
    },
    ladderState: function () {
      return stacks && stacks.ladder ? stacks.ladder.state() : null;
    },
    screenPointFor: function (id) {
      const record = findRecord(id);
      if (!record) return null;
      const world = new THREE.Vector3();
      record.group.getWorldPosition(world);
      world.project(camera);
      const { w, h } = widthHeight();
      return { x: (world.x * 0.5 + 0.5) * w, y: (-world.y * 0.5 + 0.5) * h };
    },
  };

  return handle;
}
