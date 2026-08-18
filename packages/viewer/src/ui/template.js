// Self-mounting DOM: createLibrary() appends this fragment into `root` and
// resolves every element by querySelector against root, into one `els`
// object — no global IDs (viewer-port.md §3). Ported from index.html, with
// the paper-note subsystem and the disabled radar HUD deleted (§9).
export function buildTemplate(displayName) {
  const fragment = document.createDocumentFragment();
  const wrap = document.createElement("div");
  wrap.className = "bw-root";
  wrap.innerHTML =
    '<canvas class="bw-scene" tabindex="0" aria-label="First-person 3D library. Click to enter, walk with W A S D, aim at an object and click to interact."></canvas>' +
    '<div class="bw-vignette" aria-hidden="true"></div>' +
    '<div class="bw-reticle" aria-hidden="true"></div>' +
    '<div class="bw-aim-label" aria-hidden="true"></div>' +
    '<div class="bw-fade" aria-hidden="true"></div>' +
    '<div class="bw-boot" aria-hidden="true"></div>' +
    '<div class="bw-intro">' +
    '<div class="bw-intro-pill"><span class="bw-intro-pill-text">click to look around</span></div>' +
    "</div>" +
    '<div class="bw-controls-hint" aria-hidden="true">W&thinsp;A&thinsp;S&thinsp;D to walk &middot; aim at an object &amp; click &middot; Esc frees the mouse</div>' +
    '<div class="bw-pause">' +
    '<p class="bw-pause-text">paused</p>' +
    '<p class="bw-pause-sub">click anywhere to resume</p>' +
    "</div>" +
    '<header class="bw-hud bw-hud-header">' +
    '<nav class="bw-hud-nav" aria-label="Pause">' +
    '<button class="bw-pause-btn" aria-label="Pause">&#8551;</button>' +
    "</nav>" +
    "</header>" +
    '<div class="bw-joystick" aria-hidden="true">' +
    '<div class="bw-joystick-base"><div class="bw-joystick-thumb"></div></div>' +
    "</div>" +
    '<div class="bw-esc-hint" aria-hidden="true">Esc &mdash; pause</div>' +
    '<div class="bw-fallback" hidden>' +
    "<h1>" + escapeHtml(displayName || "Library") + "</h1>" +
    '<p class="bw-fallback-reason">This view needs WebGL, which your browser could not provide.</p>' +
    "</div>" +
    '<div class="bw-backdrop" hidden></div>' +
    '<div class="bw-stage" hidden aria-hidden="true">' +
    '<button class="bw-close-btn" aria-label="Close book">&#10005;</button>' +
    '<div class="bw-book" role="dialog" aria-modal="true" aria-label="Opened book">' +
    '<div class="bw-running-head bw-running-head-left"></div>' +
    '<div class="bw-running-head bw-running-head-right"></div>' +
    '<div class="bw-page-flow"></div>' +
    '<div class="bw-page-number bw-page-number-left"></div>' +
    '<div class="bw-page-number bw-page-number-right"></div>' +
    '<div class="bw-gutter" aria-hidden="true"></div>' +
    '<div class="bw-page-shade" aria-hidden="true"></div>' +
    "</div>" +
    '<div class="bw-book-caption">' +
    '<span class="bw-caption-title"></span>' +
    '<span class="bw-caption-author"></span>' +
    '<div class="bw-book-nav" hidden>' +
    '<button class="bw-book-nav-btn bw-book-prev-btn" aria-label="Previous book this year">&lsaquo; book</button>' +
    '<span class="bw-book-nav-pos"></span>' +
    '<button class="bw-book-nav-btn bw-book-next-btn" aria-label="Next book this year">book &rsaquo;</button>' +
    "</div>" +
    "</div>" +
    "</div>";

  fragment.appendChild(wrap);
  return fragment;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Resolves every element the subsystems need from `root` into one object.
export function resolveElements(root) {
  const q = function (sel) {
    return root.querySelector(sel);
  };
  return {
    canvas: q(".bw-scene"),
    introEl: q(".bw-intro"),
    pauseEl: q(".bw-pause"),
    fadeEl: q(".bw-fade"),
    bootEl: q(".bw-boot"),
    controlsHintEl: q(".bw-controls-hint"),
    reticleEl: q(".bw-reticle"),
    aimLabelEl: q(".bw-aim-label"),
    escHintEl: q(".bw-esc-hint"),
    pauseBtn: q(".bw-pause-btn"),
    joystickEl: q(".bw-joystick"),
    fallbackEl: q(".bw-fallback"),
    fallbackReasonEl: q(".bw-fallback-reason"),
    backdropEl: q(".bw-backdrop"),
    stageEl: q(".bw-stage"),
    closeBtn: q(".bw-close-btn"),
    bookEl: q(".bw-book"),
    headLeft: q(".bw-running-head-left"),
    headRight: q(".bw-running-head-right"),
    pageFlow: q(".bw-page-flow"),
    pagenoLeft: q(".bw-page-number-left"),
    pagenoRight: q(".bw-page-number-right"),
    captionTitle: q(".bw-caption-title"),
    captionAuthor: q(".bw-caption-author"),
    bookNavEl: q(".bw-book-nav"),
    bookPrevBtn: q(".bw-book-prev-btn"),
    bookNextBtn: q(".bw-book-next-btn"),
    bookPosEl: q(".bw-book-nav-pos"),
  };
}
