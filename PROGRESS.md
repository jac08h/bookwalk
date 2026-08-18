# Overnight build log

Working through docs/PLAN.md milestones M0-M5 unsupervised, per "low-contact" operating mode (§ intro). This file is my running log for Jakub to catch up on waking — newest entries at top of each section. Decisions I made without asking are noted with reasoning; anything genuinely blocking gets flagged under "Needs Jakub" at the bottom instead of guessed.

## Status

- [x] M0 — Skeleton
- [ ] M1 — Importer
- [ ] M2 — Viewer package (stop-and-look checkpoint)
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
