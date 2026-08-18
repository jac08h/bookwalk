# Bookwalk — build plan

A hosted generator that turns a StoryGraph CSV export into a walkable first-person 3D library, published at a shareable URL.

**Read order:** this file → `manifest-schema.md` (data contracts) → `viewer-port.md` (how the existing 3D code becomes a reusable package). Design decisions are at the bottom of this file (§12).

**Operating mode: low-contact.** Jakub wants to go hands-off and come back to a working project. Use judgement on anything underspecified rather than pausing to ask — the design decisions in §12 are the defaults, not a checklist to re-confirm. Do not do anything irreversible or risky to his accounts, billing, or existing data: no paid-tier upgrades, no destructive operations against the existing Upstash database (§6a) or any other account he already has, no force-pushes, no deleting anything that isn't this project's own output. When a call is genuinely ambiguous *and* hard to reverse, stop and note it rather than guessing; everything else, just decide and keep moving.

## 1. What we're building

**Landing page** (`/`) offers exactly two doors:
- **Create your own** — StoryGraph import
- **Browse existing** — a static example link to Jakub's own published library (not a real gallery — see D4)

**Create flow** is linear, three steps, no account:
1. **Import** — drop a StoryGraph CSV export. Parsed entirely in the browser.
2. **Review** — show what loaded: totals by status, a per-year histogram, and warnings (undated rows, unparseable dates, duplicates). Set a display name. Toggle whether to-read / currently-reading are included.
3. **Customize** — pick a theme preset from a small grid, with a live 3D preview of the actual room. Then publish.

**Publish** returns a public URL (`/l/{slug}`) plus a secret edit URL. Anyone with the public link walks the library.

### v1 scope (deliberately small)

In: year-based shelving, procedural spines, ~5 theme presets, the library-card overlay when you open a book, publish + a single-entry example page (D4), mobile touch mode (already exists).

Out of v1: real cover art / ISBN lookups, in-world decorator mode, quotes, accounts, re-sync with StoryGraph, exhibits/curation, comments, multi-source import (Goodreads/Kindle).

The v1 cut is chosen so the whole pipeline is exercised end to end. Every deferred item slots into an extension point the v1 schema already reserves.

## 2. Constraints & principles

- **Hosting:** Vercel. **Database:** Upstash Redis.
- **The existing library at `/home/jh/personal_projects/jac08h.github.io/library` is read-only reference.** Do not modify it. It stays live as Jakub's personal site. Code moves by copy-then-refactor into the new repo.
- **New project root:** `/home/jh/personal_projects/bookwalk` (see D3).
- **Reusable by construction.** The 3D viewer must not know that Next.js, StoryGraph, Vercel, or Redis exist. The importer must not know the DOM exists. Both are plain packages consumed by the web app.
- **Low-touch after §12.** Prefer boring, well-trodden choices over clever ones. Prefer configuration that cannot produce an ugly result over configuration that is maximally expressive.
- **Data is personal.** A reading history is identifying. Default to unlisted, opt in to public.

## 3. Repository layout

```
/home/jh/personal_projects/bookwalk/
├── package.json                  # npm workspaces root
├── packages/
│   ├── manifest/                 # schema, types, validation, migrations
│   │   ├── src/schema.ts         # zod schemas -> inferred TS types
│   │   ├── src/migrate.ts        # version N -> N+1 upgrades
│   │   └── src/index.ts
│   ├── importer/                 # StoryGraph CSV -> Manifest. Pure, isomorphic.
│   │   ├── src/parse.ts          # CSV -> RawRow[]
│   │   ├── src/dates.ts          # the four date shapes
│   │   ├── src/normalize.ts      # RawRow -> Book
│   │   ├── src/build.ts          # Book[] + options -> Manifest
│   │   ├── src/cli.ts            # node cli: csv path -> manifest json on stdout
│   │   └── test/                 # vitest + fixtures
│   └── viewer/                   # framework-free 3D renderer
│       ├── src/index.js          # createLibrary(root, manifest, opts) -> handle
│       ├── src/theme/            # tokens + presets
│       ├── src/scene/            # room, stacks, entry, books, textures
│       ├── src/ui/               # overlay, reticle, hud (creates its own DOM)
│       ├── src/viewer.css        # fully prefixed, injected by the package
│       ├── vendor/               # pinned three.js 0.185.1 (copied as-is)
│       └── types/index.d.ts      # hand-written public API types
└── apps/
    └── web/                      # Next.js App Router
        ├── app/page.tsx          # landing
        ├── app/create/           # import -> review -> customize
        ├── app/l/[slug]/         # the viewer page
        ├── app/browse/           # static example page, one hardcoded entry — not a gallery
        ├── app/api/libraries/    # POST create, GET read, PATCH edit, DELETE
        └── lib/store.ts          # Upstash access, the only file that touches Redis
```

npm workspaces (not pnpm/turbo) — Vercel supports it natively with zero config, and the dependency graph here is four packages deep at most.

## 4. Package contracts

These three signatures are the whole architecture. Everything else is an implementation detail behind them.

```ts
// @bw/importer
export function parseStoryGraphCsv(text: string): ImportResult
// ImportResult = { books: Book[], warnings: Warning[], stats: ImportStats }
// Pure. No DOM, no fs, no network. Runs identically in the browser and in the CLI.

export function buildManifest(result: ImportResult, opts: BuildOptions): Manifest
```

```ts
// @bw/manifest
export const ManifestSchema: z.ZodType<Manifest>
export function migrate(input: unknown): Manifest   // throws on unrecoverable input
export const CURRENT_VERSION = 1
```

```js
// @bw/viewer  — plain ES modules, no framework, no build step required
export function createLibrary(root: HTMLElement, manifest: Manifest, opts?: {
  reducedMotion?: boolean,
  touchMode?: "auto" | "force" | "off",
  music?: boolean,
  onReady?: () => void,
  onError?: (e: Error) => void,
}): LibraryHandle

// LibraryHandle = {
//   destroy(): void,
//   setTheme(theme: Theme): void,   // live re-theme, no full rebuild where possible
//   state(): ViewerState,           // the existing __library test hooks, promoted to real API
//   ...test hooks
// }
```

Three rules that make these actually reusable, each of which is a real refactor of the current code:

1. **The viewer creates its own DOM.** Today `library.js` looks up `#stage`, `#reticle`, `#pause` etc. from `index.html`. It must instead build that markup inside `root`. See `viewer-port.md` §3.
2. **The viewer injects its own CSS, fully prefixed.** `library.css` has 6 bare `body`/`html`/`*` rules and unprefixed class names that would collide with the web app. Every selector becomes `.bw-*` under a single `.bw-root` scope.
3. **No module-level singletons that outlive a library.** The customize step mounts and unmounts the viewer repeatedly; `destroy()` must actually free GPU resources (geometries, textures, render targets) or the customize page leaks a scene per preset click.

## 5. Milestones

Each milestone is independently demoable. Do not start the next until the previous runs.

### M0 — Skeleton
Monorepo, four workspace packages, Next.js app deployed to Vercel showing a placeholder landing page, vitest running with one trivial test, Upstash `.env.local` wired against the shared database with the `bookwalk:` prefix (unused for now), Vercel Web Analytics enabled (§9). Verify the deploy URL loads and a pageview lands before moving on.

### M1 — Importer (the highest-value, lowest-risk milestone)
Implement `parseStoryGraphCsv` and `buildManifest` against the real export at `/home/jh/Downloads/storygraph.csv`, following `manifest-schema.md` §2 exactly. Ship the CLI so a manifest can be generated on disk for M2.

Done when: the real CSV produces 220 books, 0 crashes, a warning list matching the known-quirks table in `manifest-schema.md` §2.6, and all fixture tests pass including the 500-book stress fixture.

### M2 — Viewer package
Port the library per `viewer-port.md`. Manifest-driven, self-mounting, themed, with the library-card overlay replacing the quote overlay. Develop against the M1 manifest on disk via a standalone dev page — no web app involvement.

Done when: `/home/jh/Downloads/storygraph.csv` → manifest → a walkable room with 10 year-labelled shelf faces, all five presets render, and the rodney checks in `viewer-port.md` §6 pass.

Without PostHog (§9), evidence for the checkpoint below comes from direct observation (rodney screenshots/walkthrough, your own pass through the room) rather than instrumented events. Note the impression in this plan or in a follow-up message rather than silently deciding scope.

**This is the milestone to stop and look at.** Everything after it is product scaffolding; this is where you find out whether a room built from bare title/author/year is actually worth walking through.

### M3 — Create flow, client-only
`/create` with the three steps. The importer runs in the browser (same package, no server round-trip), the viewer mounts live in the customize step. Publishing is stubbed — it just downloads the manifest JSON. No database yet.

Done when: you can go from CSV to a themed preview in a browser with the network tab empty after page load.

### M4 — Persistence & sharing
Upstash wiring, `POST /api/libraries`, `/l/{slug}`, edit tokens, the static `/browse` example page, rate limiting, size guards. See §6.

Done when: a published link opens the right library in an incognito window, and `/browse` shows only Jakub's example entry — no other published library is discoverable anywhere.

### M5 — Launch readiness
OG share images, meta tags, error boundaries and a real fallback when WebGL is unavailable, abuse controls, a short about page, domain.

## 6. Data & storage

Upstash Redis holds everything in v1. Manifest sizes: ~220 books ≈ 70 KB of JSON, ~1000 books ≈ 300 KB. Well inside limits, but guard anyway.

**Sharing the existing Upstash database.** Jakub's free-tier account already has one Redis database in use by another project, and free tier caps at one database per account. Rather than upgrade to a paid plan, Bookwalk reuses that same database under a `bookwalk:` key prefix — every key below is actually `bookwalk:lib:{slug}`, etc. This is namespace isolation, not data isolation: the two projects share request-volume and storage quota. Revisit (separate paid database) only if that becomes a real constraint; do not upgrade the plan preemptively.

```
bookwalk:lib:{slug}          JSON string  the full manifest
bookwalk:meta:{slug}         Hash         displayName, bookCount, yearMin, yearMax, themeId,
                                          createdAt, updatedAt, visibility, viewCount
bookwalk:edit:{token}        String       -> slug   (unguessable, 32 bytes base64url)
bookwalk:ratelimit:{ip}      via @upstash/ratelimit
```

Guards, all of which exist to keep this low-touch rather than to be strict:
- Reject manifests over **2 MB** or **5000 books** with a clear message.
- Rate limit publishing to **5 libraries per IP per day**.
- Reject CSVs over **10 MB** before parsing.
- Store **only the derived manifest, never the raw CSV**.

Everything is served from `/l/{slug}` with ISR/edge caching keyed on `updatedAt`, so a popular library costs ~0 Redis commands after the first hit — the main lever for staying inside the free tier.

## 7. Theming

The current code has ~120 hard-coded colour literals across 6 files (`textures.js`, `room.js`, `stacks.js`, `entry.js`, `books.js`, `library.js`). They collapse into 9 semantic token groups:

| Token group | Drives |
|---|---|
| `wood` | cases, trim, doors, shelf planks |
| `woodDark` | back panels, plinths, shadowed interior |
| `floor` | floorboard texture |
| `rug` | runner base, border, motif |
| `plaster` | wall surfaces |
| `wainscot` | panelling below the chair rail |
| `metal` | sconces, year plaques, spine lettering, gilt |
| `light` | sconce/pendant colour, hemisphere sky+ground, exposure, bloom strength, fog colour + density |
| `spines` | the leather palette array books sample from |

A `Theme` is exactly these nine groups. A **preset** is a named `Theme`. v1 ships ~5 presets and **no free colour picking** — see D17/D18. This is the single most important product-quality decision in the plan: curated presets are hard to make ugly, and a hue slider on wood is almost impossible to make pretty.

`setTheme()` should regenerate procedural canvas textures and swap `material.map` in place rather than rebuilding the scene, so preset clicks feel instant. Fall back to a full rebuild only for tokens that change geometry (none in v1).

## 8. Testing

- **vitest** for `manifest` and `importer`. Fixtures per `manifest-schema.md` §3: the real export, a synthetic "rich" export exercising moods/ratings/reviews/DNF, a 500-books-in-one-year stress file, and a malformed file.
- **rodney** for the viewer, reusing the workflow and hard-won gotchas already documented in `/home/jh/personal_projects/jac08h.github.io/library/CLAUDE.md` — especially: `rodney clear-cache` + `reload --hard` after editing any ES module, and `RODNEY_HOME` isolation if agents run concurrently.
- **Playwright** for exactly one web test: the create-flow happy path (upload → review → customize → publish → open published URL). Not comprehensive, just a smoke test that the seams hold.
- Port the viewer's `window.__library` test hooks into the `LibraryHandle` public API rather than leaving them as globals.

## 9. Analytics

**PostHog is out of scope for v1** — Jakub does not want to pay for a second project (his existing org is past the free single-project allowance). This is a real downgrade from the original plan: no custom event funnel, no answer to §11's open risk ("is the room worth walking through") beyond direct observation.

**Replacement: Vercel Web Analytics.** Free on the Hobby tier, zero code (one dashboard toggle plus the `@vercel/analytics` package and a single `<Analytics />` mount in the root layout). Gives pageviews, top pages, referrers, and rough visitor counts for `/`, `/create`, `/l/{slug}` — enough to see whether published libraries get opened at all. No custom events (`book_opened`, `theme_previewed`, etc.), no funnel breakdown, no bot-traffic caveats to manage.

If PostHog becomes free or worth paying for later, the event table, cookieless config, and bot-classification trap this section replaced are recoverable from this plan's edit history — the event names and firing points still apply, they're just not implemented in v1.

### 9.1 Where it lands

- **M0** — `@vercel/analytics` installed, `<Analytics />` mounted, Web Analytics enabled in the Vercel project dashboard. Verify a pageview lands before moving on.
- Nothing further is scheduled in M2–M5; revisit only if Jakub asks for it.

## 10. What will still need you

Unavoidably human, everything else is automatable:

1. Provide `UPSTASH_REDIS_REST_URL` / `_TOKEN` for the existing shared database (done — see `.env.local`).
2. Decide the music question (D26) — this one has legal teeth.
3. Buy a domain if you want one (D2).

## 11. Risks

**The room may not be worth walking through without quotes.** Your export has 0% moods, 0% tags, 3.6% ratings, 0.5% reviews. A book you open shows title, author, year, format, read count. That is thin. Mitigated by the library-card treatment (D20) and by M2 being an explicit stop-and-look checkpoint — if it's flat there, reconsider scope before building the product around it.

**Big libraries break the room.** Your worst year is 45 books; a heavy reader logging 200/year will overflow a shelf face. Mitigated by spill-to-adjacent-bay in M2 and the 500-book stress fixture in M1.

**StoryGraph changes its export format.** Mitigated by parsing strictly by header name with tolerant handling of missing columns, and by surfacing unknown columns as a warning rather than an error.

**Free-tier ceilings.** Vercel Hobby forbids commercial use (fine here). Upstash free tier is 10k commands/day, now shared with another project (§6) — reachable if a `/l/{slug}` link goes viral and nothing is cached, which is why §6 leans on ISR.

## 12. Design decisions

Recommendations are marked ✅. Answer the **Blocking** set before M0; the rest can wait but answering now is what buys the low-touch build.

### Blocking — needed before M0

**D1. Product name.** ✅ **Decided: Bookwalk.** Repo, package scope (`@bw/*`), CSS prefix (`.bw-*`/`.bw-root`), and project root (`/home/jh/personal_projects/bookwalk`) all reflect this.

**D2. Domain.** ✅ Ship on the free `*.vercel.app` for v1; buy a domain only once someone other than you has published a library.

**D3. Repo location and visibility.** ✅ `/home/jh/personal_projects/bookwalk`, GitHub **public**. Public means the test fixture must not be your real reading history — see D13.

**D22. Next.js vs a lighter SPA.** ✅ **Next.js App Router.** Server rendering and the share cards want `@vercel/og`, and it's the zero-config path on Vercel. A Vite SPA is smaller but you'd hand-build both.

**D23. TypeScript boundary.** ✅ **TS for `manifest`, `importer`, `web`; leave `viewer` as plain JS** with a hand-written `.d.ts`. The viewer is a 6300-line port of working code — converting it to TS during the port doubles the diff and the risk for little gain, since its public surface is one function.

**D27. three.js: vendored vs npm.** ✅ **npm dependency** (`three@0.185.1`, pinned exact). The vendoring in the current repo exists because that site has no build step; the new one does. Keeps the addons import map hack out of the picture entirely.

### Data & privacy

**D10. Publish review text and content warnings?** Reviews are the most personal field in the export. ✅ **Include reviews, exclude content-warning text**, with a clearly-labelled toggle on the review screen defaulting to include. Content warnings are frequently about the reader, not the book.

**D11. Include to-read and currently-reading by default?** ✅ **Yes, both on by default**, toggleable on the review screen. They're 9 of your 220 and they're what makes the room feel current rather than archival.

**D12. Retention.** ✅ **Keep forever**, no expiry. Redis has no TTL on these keys. Revisit only if storage becomes a real cost, which at 70 KB/library it will not.

**D13. Test fixture privacy.** With a public repo, `/home/jh/Downloads/storygraph.csv` cannot be committed. ✅ **Commit an anonymized 30-row fixture** (real structure and quirks, fabricated titles/authors) and keep the real file at a gitignored path for local verification.

**D30. Abuse controls.** ✅ 5 publishes/IP/day, 10 MB CSV cap, 2 MB manifest cap, plus a `DELETE /api/libraries/{slug}` behind an admin token so you can nuke something without a deploy.

### Identity & URLs

**D7. Accounts or link-is-identity?** ✅ **Link-is-identity.** Publishing returns a secret edit URL, stashed in localStorage under "your libraries". Losing it means re-importing, which takes 30 seconds. Accounts would double the security surface to protect a 30-second asset.

**D8. Editable after publish? Deletable?** ✅ **Both yes, via the edit link.** Re-import replaces the book list and keeps the slug; theme is editable independently. Delete is permanent and asks twice.

**D9. URL shape.** ✅ `/l/{slug}` where slug is `slugify(displayName)` plus a 4-char suffix on collision (`/l/jakub`, `/l/jakub-k3f9`). Keeps the root namespace free for real routes and avoids name squatting.

### Gallery

**D4. Gallery openness.** ✅ **Changed: no real gallery in v1.** No submission flow, no opt-in toggle, no approval queue, no `gallery` Redis key. `/browse` is a static page with exactly one hardcoded entry — Jakub's own library. Every other published library is unlisted-by-link only (D7/D9) and appears nowhere. This removes an entire feature surface, not just the approval chore: no `gallery` sorted set (§6), no listing API, no visibility toggle on the publish step (every library is simply a link). Revisit a real gallery only if Jakub asks for one later.

**D5. Is a display name required?** ✅ **Yes, required**, free text, 40 chars max. It's the door plaque on the library itself. No uniqueness requirement (D9 handles collisions).

**D6. Seed `/browse` with your own library?** ✅ **Yes** — it's the only entry `/browse` will ever have in v1, hardcoded at build time (not fetched from a submissions list, since there isn't one).

### Layout

**D14. v1 grouping.** ✅ **Year read only**, newest year nearest the entrance (matches the existing behaviour). `groupBy` stays in the schema for later.

**D15. Undated `read` books.** Your export has 2. ✅ **A single unlabelled shelf face at the far end** with a blank plaque. Hiding them silently loses data; a dedicated "undated" plaque draws more attention than 2 books deserve.

**D16. Sort within a year.** No intra-year signal exists — 214 of 216 dates are bare `YYYY`. ✅ **Alphabetical by author, then title.** Deterministic, browsable, and it clusters an author's books together on the shelf, which looks right.

**D19. Custom text over the door.** ✅ **Yes** — the vestibule plaque reads the display name ("JAKUB'S LIBRARY"). It's the first thing a visitor sees and it costs one texture parameter.

### Interaction

**D20. What opening a book shows.** ✅ The **library card** — the checkout-card skeuomorph: title/author at the top, a date stamp per entry in `Dates Read` (so a reread shows two stamps), format, read count, star rating as pencil marks if present, review text below if present. Reuses the existing two-page book shell and `fitType()` autofit. Given how thin the data is, the framing has to carry it: a card with two stamps reads as an artifact, a modal with two fields reads as a bug.

**D21. Are dataless books still openable?** ✅ **Yes.** Every book opens; a book with nothing but title/author gets a card with an empty stamp box. Consistency beats a mysterious subset of inert books.

**D26. Music.** `nocturne.mp3` is 5.5 MB with no licence recorded in the repo. Shipping it in a public product is a real, if small, legal risk. ✅ **Ship v1 with no music**, add a clearly-licensed CC0/public-domain track later. If you know its provenance and it's clean, say so and it goes back in — it does a lot for the atmosphere.

### Theme

**D17. Which presets, and how many?** ✅ **Five**, spanning warm→cool and dark→light so the grid reads as genuinely different rooms rather than five browns: *Reading Room* (the current look — warm oak, crimson runner, candlelight), *Nordic* (pale ash, grey-blue light, bright), *Study* (near-black walnut, deep green, very low light), *Atrium* (limestone, daylight, minimal fog), *Archive* (grey steel and concrete, cold even light). Confirm or swap names/moods.

**D18. Any free colour picking in v1?** ✅ **No.** Presets only. Revisit after real users; the request will probably be for more presets, not for a hue wheel.

### Deferred (answer before M4/M5, not blocking)

**D24. Viewer CSS isolation:** ✅ prefixed selectors under `.bw-root`, not shadow DOM (simpler, and nothing here needs true encapsulation).
**D25. Storage:** ✅ Redis only for v1; Vercel Blob is the documented escape hatch if manifests grow.
**D28. Analytics:** ✅ **Vercel Web Analytics, not PostHog** — see §9. Reversed from the original recommendation: Jakub's PostHog org is past its free single-project allowance and he doesn't want to pay for a second one. Vercel Web Analytics is free, zero-config, and gives pageviews/visitor counts; it cannot answer §11's open risk with the same precision a custom event funnel would have, but it's the honest zero-cost option. Revisit if PostHog becomes free or the product outgrows pageview-level evidence.
**D29. Error reporting:** ✅ none in v1; add Sentry only if M5 surfaces real unknowns.
**D31. Free-tier overrun:** ✅ hard-fail publishing with a friendly "the library is full today, try tomorrow" rather than auto-scaling into a bill.
**D32. Analytics project:** ✅ **superseded by D28** — no PostHog project needed for v1.
