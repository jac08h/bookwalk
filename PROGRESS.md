# Overnight build log

Working through docs/PLAN.md milestones M0-M5 unsupervised, per "low-contact" operating mode (§ intro). This file is my running log for Jakub to catch up on waking — newest entries at top of each section. Decisions I made without asking are noted with reasoning; anything genuinely blocking gets flagged under "Needs Jakub" at the bottom instead of guessed.

## Status

- [x] M0 — Skeleton
- [x] M1 — Importer
- [x] M2 — Viewer package (stop-and-look checkpoint)
- [ ] M3 — Create flow, client-only
- [ ] M4 — Persistence & sharing
- [ ] M5 — Launch readiness

## Needs Jakub

- **Vercel Toolbar / preview-comments is broken for this project, git-triggered auto-deploys will fail.** Every deploy that goes through Vercel's normal remote build (i.e. anything triggered by a `git push`, not `vercel deploy --prebuilt`) fails at the final "Deploying outputs..." step with: `Cannot patch preview comments when immutable static file upload is enabled. Upgrade to next@v16.3.0-canary.32 or newer to resolve this.` We're on Next 16.3.1 stable, which actually postdates that canary tag — looks like a bug in Vercel's own version comparator (treats prerelease tags as always "newer" than a full release). No CLI surface exists to disable the Toolbar/preview-comments feature; it needs the dashboard (Project Settings → Toolbar, turn off Comments, for the `bookwalk` project). Until then I'm deploying manually every time via `vercel build --prod --yes && vercel deploy --prebuilt --prod --yes` from the repo root, which sidesteps the broken step entirely. **This means the GitHub → Vercel auto-deploy I connected (`vercel git connect`) will silently fail on every push** — worth checking Vercel's deployment list once you're back, and turning off Comments (or re-testing after Vercel ships a fix) before relying on auto-deploy again.

## Log

### M0 — done
- Repo: https://github.com/jac08h/bookwalk (public, per D3)
- Live: https://bookwalk-pi.vercel.app (Production, aliased)
- npm workspaces root + `@bw/manifest` (real zod schema from manifest-schema.md), `@bw/importer` and `@bw/viewer` stubbed pending M1/M2, `apps/web` Next.js App Router.
- Landing page implements the two-door design from PLAN.md §1 (not a throwaway placeholder — the spec was already exact, so I built it for real).
- `vitest.config.ts` at root runs all workspace package tests; one passing test each in manifest/importer so far.
- Vercel: Web Analytics enabled, Upstash env vars set for Production + Preview (Development env var for the token didn't go through — not needed, local dev already has `.env.local`).
- GitHub → Vercel git integration connected, but **see "Needs Jakub" — it will fail until the Toolbar/Comments setting is turned off in the dashboard.**

### M2 — in progress
- Full port done: theme tokens (5 presets), textures, room, entry, stacks (groups-not-years + spill), books (format-driven dims), overlay (library card replacing quotes), player/grab/touch (as-is), self-mounting DOM template + prefixed CSS, index.js createLibrary().
- Verified against the real 220-book manifest via a standalone dev page (`packages/viewer/dev/`) + rodney: mounts cleanly, 217 books shelved (3 currently-reading excluded from shelves per §2.4), walkable, book-opening/library-card works with real data (screenshot: date-range stamp rendered correctly, star rating as pencil marks, review text — matches D20 exactly), a plain title/author-only book opens with an empty stamp box (D21), no page-flow scroll overflow.
- `minimal.csv` (1 book) and `stress-500.csv` (500 books, one year) both render with 0 errors — confirmed spill-across-faces works and plaques correctly show "(n/total)" suffixes.
- **Found and fixed a real bug during destroy/remount testing**: `packages/viewer/src/scene/books.js` had three module-level singleton THREE.js resources (`unitBox`, `unitPlane`, `pickMaterial`) shared across every `createLibrary()` call, but the generic `destroy()` disposal in `index.js` was disposing them — so a second mount after a first `destroy()` would render with corrupted GPU geometry. Fixed by marking them `userData.shared = true` and skipping shared resources in `disposeObject`. This is exactly the failure mode PLAN.md §4.3 warned about ("no module-level singletons that outlive a library") — worth remembering for any future singleton pattern in this package.
- Also added forced WebGL context loss (`WEBGL_lose_context`) in `destroy()` — `renderer.dispose()` alone frees GPU buffers but not the context itself; without this, repeated customize-step remounts could pile up contexts toward the browser's per-page limit.
- 20-cycle mount/destroy stress test: no crash, no errors, but each cycle costs ~7-9s under headless **SwiftShader** (software WebGL) — rebuilding ~217 unique canvas spine textures + a full room from scratch every mount is inherently expensive without hardware acceleration. This did NOT reproduce as unbounded growth (flat plateau after cycle ~2), so it reads as expected cost under software rendering, not a leak — but I have not verified real-GPU timing, since that needs an actual browser session, not headless rodney. Worth a sanity check with real Chrome once you're back, especially for M3's customize step (live re-mount on preset click) — if it feels sluggish there, this cost is why, and `setTheme()`'s "regenerate in place, no rebuild" TODO (still stubbed, see below) is the real fix.
- **`setTheme()` is currently a stub** — full re-theme requires a rebuild (`destroy()` + `createLibrary()` again) rather than an in-place material/texture swap. PLAN.md §7 wants live re-theme "so preset clicks feel instant"; given the per-mount cost above, a real in-place `setTheme()` matters more than I originally assumed. Flagging as the highest-value follow-up before M3's customize step, not done tonight due to time.
- Minor cosmetic gaps, not blocking: (1) plaque text gets cramped at long spill labels like "2025 (13/13)" — the plaque texture wasn't sized for text that long; (2) the library card's two-column CSS layout doesn't fill the right page when the left page's content is short (a book with just title/author + a short review) — looks intentionally sparse rather than broken, but not the "balanced spread" feel of the original quote layout.
- Nordic preset visually verified (screenshot): pale ash wood, blue-grey rug, brighter walls — reads as a genuinely different room, not just a recolor. Floor boards render darker than expected for "pale ash" (low-saturation dark planks rather than light) — minor tuning gap in `theme.floor` for that preset, not a bug, worth a look when you're doing a real visual pass. Did not screenshot the other 3 presets (study/atrium/archive) — only structurally validated their token objects (all 9 groups present, no missing fields).
- Did not verify: the WebGL-unavailable fallback path in a real no-WebGL browser, mobile/touch viewport via CDP device emulation. Lower-risk (fallback is a simple early-return already covered by a code read; touch mode's input plumbing in `touch.js` was copied verbatim from previously-tested working code) but still unverified by me tonight.

**M2 status: functionally done, real end-to-end walkthrough confirmed working with the real 220-book export.** This is the plan's explicit stop-and-look checkpoint (§5) — my read as an agent, not a substitute for your own: the room built from bare title/author/year does read as something worth walking through. The library-card treatment (D20) carries the thin data well — the date-stamp/rating/review layout reads as a genuine artifact rather than a bug, exactly as D20 hoped. Recommend you actually walk through it yourself once you're back (`cd packages/viewer/dev && python3 -m http.server`, or wait for M3's real /create flow) before deciding whether to keep going past M3.

### M1 — done
- Real `parseStoryGraphCsv`/`buildManifest`, all field-normalization rules from manifest-schema.md §2.5.
- Against the real export: 220/220 books, 0 dropped, exact match on status counts, year histogram, and warning counts — **except duplicate-author, where the doc says 1 and the file actually has 2** (James Mace Ward, David Eagleman). Confirmed by hand, it's the doc that's slightly off, not the importer; test asserts the true count (2) with a comment explaining the discrepancy.
- hue/spineSeed ported from `build_quotes_json.py`'s md5 scheme (not the sha256 formula manifest-schema.md §4 writes out in prose — the doc itself says "preserve the existing scheme," and the existing scheme is md5; I followed the code over the doc's paraphrase). Verified with a test oracle computed directly from the Python source.
- 5 fixtures per §3, all passing, including the 500-book stress file and 5 distinct malformed-CSV shapes (no crashes on any).
