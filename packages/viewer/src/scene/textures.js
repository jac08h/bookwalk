import * as THREE from "three";

export function leatherFor(theme, book) {
  const palette = theme.spines;
  const idx = book.hue % palette.length;
  const base = palette[idx];
  const jitter = Math.round(book.spine_seed * 6) - 3;
  return {
    h: base.h,
    s: base.s,
    l: Math.max(14, Math.min(38, base.l + jitter)),
  };
}

export function hsl(c, dl = 0, ds = 0) {
  return "hsl(" + c.h + ", " + Math.max(0, c.s + ds) + "%, " +
    Math.max(2, Math.min(96, c.l + dl)) + "%)";
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function grain(ctx, w, h, count, rng, alpha = 0.05) {
  for (let i = 0; i < count; i++) {
    const dark = rng() < 0.5;
    ctx.fillStyle = dark
      ? "rgba(0, 0, 0, " + alpha + ")"
      : "rgba(255, 235, 200, " + alpha * 0.7 + ")";
    ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng() * 2);
  }
}

function asTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

function hexToCss(hex, alpha = 1) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

export function makeWoodTexture(theme) {
  const w = 256, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const rng = mulberry32(11);
  ctx.fillStyle = hexToCss(theme.wood.hex);
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    const x = rng() * w;
    const light = 10 + rng() * 16;
    ctx.strokeStyle = "hsla(" + (theme.wood.grainHue + rng() * 10) + ", " +
      theme.wood.grainSat + "%, " + light + "%, " + (0.25 + rng() * 0.4) + ")";
    ctx.lineWidth = 1 + rng() * 3;
    ctx.beginPath();
    ctx.moveTo(x, -8);
    ctx.bezierCurveTo(
      x + (rng() - 0.5) * 14, h * 0.33,
      x + (rng() - 0.5) * 14, h * 0.66,
      x + (rng() - 0.5) * 10, h + 8);
    ctx.stroke();
  }
  grain(ctx, w, h, 500, rng, 0.05);
  return asTexture(canvas);
}

export function makeFloorTexture(theme) {
  const w = 512, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const rng = mulberry32(23);
  const boardW = 64;
  for (let bx = 0; bx < w; bx += boardW) {
    const l = 9 + rng() * 7;
    ctx.fillStyle = "hsl(" + (theme.floor.hue + rng() * 12) + ", " + theme.floor.sat + "%, " + l + "%)";
    ctx.fillRect(bx, 0, boardW, h);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = "hsla(" + (theme.floor.hue + 2 + rng() * 8) + ", " +
        (theme.floor.sat + 6) + "%, " + (l + (rng() - 0.4) * 9) + "%, 0.35)";
      ctx.lineWidth = 1 + rng() * 2;
      const sx = bx + rng() * boardW;
      ctx.beginPath();
      ctx.moveTo(sx, -6);
      ctx.bezierCurveTo(sx + (rng() - 0.5) * 8, h * 0.4,
        sx + (rng() - 0.5) * 8, h * 0.7, sx + (rng() - 0.5) * 6, h + 6);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(bx, 0, 2, h);
    const seamY = rng() * h;
    ctx.fillRect(bx, seamY, boardW, 2);
  }
  grain(ctx, w, h, 900, rng, 0.04);
  return asTexture(canvas, 3, 14);
}

export function makeRugTexture(theme) {
  const w = 256, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const rng = mulberry32(37);
  ctx.fillStyle = theme.rug.base;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, 2200, rng, 0.06);
  const stripes = [
    { x: 10, w: 3, c: theme.rug.stripeGilt },
    { x: 18, w: 8, c: theme.rug.stripeDark },
    { x: 30, w: 2, c: theme.rug.stripeGilt },
  ];
  stripes.forEach(function (s) {
    ctx.fillStyle = s.c;
    ctx.fillRect(s.x, 0, s.w, h);
    ctx.fillRect(w - s.x - s.w, 0, s.w, h);
  });
  ctx.save();
  ctx.strokeStyle = theme.rug.stripeGilt;
  ctx.lineWidth = 2;
  for (let y = 32; y < h; y += 64) {
    ctx.beginPath();
    ctx.moveTo(w / 2, y - 18);
    ctx.lineTo(w / 2 + 22, y);
    ctx.lineTo(w / 2, y + 18);
    ctx.lineTo(w / 2 - 22, y);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
  return asTexture(canvas, 1, 10);
}

const SPINE_TITLE_FONT = "bold 27px Georgia, serif";
const SPINE_AUTHOR_FONT = "italic 19px Georgia, serif";
const SPINE_GILT_BANDS = [[26, 3], [34, 2], [384 - 40, 2], [384 - 32, 3]];

function drawSpineLettering(ctx, w, h, title, author, emissive) {
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(w * 0.56, 52);
  ctx.rotate(Math.PI / 2);
  ctx.font = SPINE_TITLE_FONT;
  ctx.textAlign = "left";
  ctx.fillStyle = "#e6cd9c";
  if (!emissive) {
    ctx.strokeStyle = "rgba(10, 6, 2, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.strokeText(title, 0, 0);
  }
  ctx.fillText(title, 0, 0);
  ctx.font = SPINE_AUTHOR_FONT;
  ctx.textAlign = "right";
  ctx.globalAlpha = emissive ? 0.7 : 0.9;
  if (!emissive) {
    ctx.strokeText(author, h - 52 - 56, 0);
  }
  ctx.fillText(author, h - 52 - 56, 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function fitSpineTitle(ctx, book, h) {
  ctx.save();
  ctx.font = SPINE_AUTHOR_FONT;
  const authorW = ctx.measureText(book.author).width;
  ctx.font = SPINE_TITLE_FONT;
  const titleMax = (h - 52 - 56) - authorW - 26;
  let title = book.title;
  while (title.length > 1 && ctx.measureText(title).width > titleMax) {
    title = title.slice(0, -1);
  }
  if (title !== book.title) {
    title = title.replace(/\s+$/, "") + "…";
  }
  const titleW = ctx.measureText(title).width;
  ctx.restore();
  return { title: title, titleW: titleW };
}

function spineCanvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

export function makeSpineTexture(book, colors) {
  const w = 96, h = 384, ss = 3;
  const canvas = makeCanvas(w * ss, h * ss);
  const ctx = canvas.getContext("2d");
  ctx.scale(ss, ss);
  const rng = mulberry32(Math.round(book.spine_seed * 100000) + 7);

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, hsl(colors, -12));
  grad.addColorStop(0.22, hsl(colors, 0));
  grad.addColorStop(0.5, hsl(colors, 9, 4));
  grad.addColorStop(0.78, hsl(colors, 0));
  grad.addColorStop(1, hsl(colors, -12));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, 500, rng, 0.06);

  if (book.spine_seed > 0.45) {
    for (let i = 1; i <= 3; i++) {
      const y = h * (0.2 + i * 0.16);
      ctx.fillStyle = "rgba(255, 230, 190, 0.10)";
      ctx.fillRect(0, y - 3, w, 3);
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.fillRect(0, y, w, 3);
    }
  }

  const fitted = fitSpineTitle(ctx, book, h);

  const panelTop = 42;
  const panelH = fitted.titleW + 20;
  ctx.fillStyle = hsl(colors, -13, -6);
  ctx.fillRect(5, panelTop, w - 10, panelH);
  ctx.fillStyle = "rgba(216, 184, 120, 0.5)";
  ctx.fillRect(5, panelTop, w - 10, 1.5);
  ctx.fillRect(5, panelTop + panelH - 1.5, w - 10, 1.5);

  ctx.fillStyle = "rgba(216, 184, 120, 0.85)";
  SPINE_GILT_BANDS.forEach(function (band) {
    ctx.fillRect(6, band[0], w - 12, band[1]);
  });

  drawSpineLettering(ctx, w, h, fitted.title, book.author, false);

  const glowCanvas = makeCanvas(w * ss, h * ss);
  const gctx = glowCanvas.getContext("2d");
  gctx.scale(ss, ss);
  gctx.fillStyle = "#000000";
  gctx.fillRect(0, 0, w, h);
  gctx.fillStyle = "rgba(216, 184, 120, 0.3)";
  SPINE_GILT_BANDS.forEach(function (band) {
    gctx.fillRect(6, band[0], w - 12, band[1]);
  });
  drawSpineLettering(gctx, w, h, fitted.title, book.author, true);

  return {
    map: spineCanvasTexture(canvas),
    emissiveMap: spineCanvasTexture(glowCanvas),
  };
}

export function makePlaqueTexture(year, side) {
  const w = 256, h = 96;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const rng = mulberry32(typeof year === "number" ? year : 999);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#241509");
  grad.addColorStop(0.5, "#160c05");
  grad.addColorStop(1, "#1e1208");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, 260, rng, 0.05);
  ctx.strokeStyle = "rgba(216, 184, 120, 0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(7, 7, w - 14, h - 14);
  ctx.strokeStyle = "rgba(216, 184, 120, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = "#e6cd9c";
  ctx.font = "44px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 0;
  const label = String(year ?? "—").split("").join(" ");
  ctx.fillText(label, w / 2, h / 2 + 2);
  if (side) {
    const tipX = side < 0 ? 26 : w - 26;
    const baseX = side < 0 ? 44 : w - 44;
    ctx.beginPath();
    ctx.moveTo(tipX, h / 2);
    ctx.lineTo(baseX, h / 2 - 11);
    ctx.lineTo(baseX, h / 2 + 11);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeGlowTexture(size = 128, inner = "rgba(255, 220, 170, 1)") {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, "rgba(255, 210, 150, 0.35)");
  grad.addColorStop(1, "rgba(255, 200, 130, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeWallTexture(theme) {
  const w = 256, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const rng = mulberry32(61);
  ctx.fillStyle = hexToCss(theme.plaster.hex);
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 240; i++) {
    const r = 6 + rng() * 34;
    const l = 24 + rng() * 14;
    ctx.fillStyle = "hsla(" + (theme.wood.grainHue + rng() * 12) + ", 30%, " + l + "%, 0.06)";
    ctx.beginPath();
    ctx.arc(rng() * w, rng() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const x = rng() * w;
    ctx.beginPath();
    ctx.moveTo(x, rng() * h * 0.2);
    ctx.lineTo(x + (rng() - 0.5) * 30, h * (0.6 + rng() * 0.4));
    ctx.stroke();
  }
  grain(ctx, w, h, 700, rng, 0.05);
  return asTexture(canvas, 4, 2);
}

export function makePanelTexture(theme) {
  const w = 256, h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const rng = mulberry32(43);
  ctx.fillStyle = hexToCss(theme.wainscot.hex);
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    const y = rng() * h;
    const light = 8 + rng() * 12;
    ctx.strokeStyle = "hsla(" + (theme.wood.grainHue + rng() * 10) + ", 40%, " + light + "%, " +
      (0.2 + rng() * 0.35) + ")";
    ctx.lineWidth = 1 + rng() * 2;
    ctx.beginPath();
    ctx.moveTo(-8, y);
    ctx.bezierCurveTo(
      w * 0.33, y + (rng() - 0.5) * 12,
      w * 0.66, y + (rng() - 0.5) * 12,
      w + 8, y + (rng() - 0.5) * 8);
    ctx.stroke();
  }
  grain(ctx, w, h, 500, rng, 0.05);
  return asTexture(canvas);
}

export function makeSconceTexture() {
  const size = 128;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(
    size / 2, size * 0.44, 2, size / 2, size * 0.44, size * 0.5);
  grad.addColorStop(0, "rgba(255, 226, 170, 1)");
  grad.addColorStop(0.4, "rgba(255, 180, 110, 0.75)");
  grad.addColorStop(1, "rgba(60, 30, 10, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(size / 2, size * 0.44, size * 0.24, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
