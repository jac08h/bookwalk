# Manifest schema & StoryGraph import contract

Companion to `PLAN.md`. Everything here is derived from the real export at `/home/jh/Downloads/storygraph.csv` (220 rows, exported 2026-08-16) unless marked *speculative*.

## 1. The manifest

The manifest is the single source of truth a viewer needs. It stores **books and configuration, never derived layout** — shelf assignment is computed at render time so that changing `layout` is a re-render, not a re-import.

```ts
type Manifest = {
  version: 1
  slug: string                    // url identity, assigned at publish
  displayName: string             // "Jakub", becomes "JAKUB'S LIBRARY" on the door plaque
  createdAt: string               // ISO
  updatedAt: string
  source: {
    kind: "storygraph"            // extension point: "goodreads" | "kindle" | "manual"
    importedAt: string
    rowCount: number              // rows in the original CSV, for the review screen
  }
  theme: { presetId: string }     // v1: preset reference only. Later: presetId + token overrides.
  layout: {
    groupBy: "year-read"          // v1 only value
    sortWithinGroup: "author-title"
    includeToRead: boolean
    includeCurrentlyReading: boolean
  }
  books: Book[]
}

type Book = {
  id: string                      // stable: sha256(normalizedTitle + " " + normalizedAuthor).slice(0,16)
  title: string
  authors: string[]               // deduped, order preserved
  contributors?: string[]
  isbn?: string                   // digits only, 10 or 13; unparseable UIDs dropped
  format?: "paperback" | "hardcover" | "digital" | "audio"
  status: "read" | "currently-reading" | "to-read" | "did-not-finish"
  owned?: boolean
  yearRead?: number               // from Last Date Read; absent for to-read/currently-reading/undated
  datesRead: ReadDate[]           // may be empty
  readCount: number
  rating?: number                 // 0.5..5, half steps
  review?: string                 // sanitized to plain text, may be omitted at publish (D10)
  moods?: string[]
  pace?: "slow" | "medium" | "fast"
  tags?: string[]
  hue: number                     // 0..359, deterministic - see section 4
  spineSeed: number               // 0..1, deterministic
}

type ReadDate =
  | { year: number; month?: number; day?: number }
  | { from: ReadDatePoint; to: ReadDatePoint }   // the range form
```

`version` + `@bw/manifest`'s `migrate()` exist from day one. A published manifest outlives the code that wrote it.

## 2. StoryGraph CSV contract

### 2.1 Header

The observed export has exactly these 23 columns:

```
Title, Authors, Contributors, ISBN/UID, Format, Read Status, Date Added,
Last Date Read, Dates Read, Read Count, Moods, Pace,
Character- or Plot-Driven?, Strong Character Development?, Loveable Characters?,
Diverse Characters?, Flawed Characters?, Star Rating, Review,
Content Warnings, Content Warning Description, Tags, Owned?
```

**Parse by header name, never by index.** Missing columns are tolerated (absent leads to field omitted). Unknown columns produce an `unknown-column` warning, not an error — that is the early-warning system for StoryGraph changing the format.

Only `Title` and `Authors` are required. A row missing either is dropped with a `row-dropped` warning.

### 2.2 Observed fill rates - design for the empty case

| Column | Fill | Consequence |
|---|---|---|
| Title, Authors, Read Status, Read Count, Owned? | 100% | safe to rely on |
| Last Date Read, Dates Read | 95% | 11/220 empty - see 2.4 |
| Format | 94% | good enough to drive book geometry |
| ISBN/UID | 90% | enables covers post-v1 |
| Star Rating | **3.6%** (8 rows) | decoration only |
| Review | **0.5%** (1 row) | decoration only |
| Moods, Pace, Tags, Content Warnings, the 4 character questions | **0%** | must not be load-bearing anywhere |

This is one user's export. A friend who rates and reviews everything produces a much richer file — hence every one of these is optional in the schema and every consumer degrades gracefully. But **build and test against the empty case**, because it is the observed reality.

### 2.3 Dates - four shapes

`Dates Read` is comma-separated and may hold multiple entries; `Last Date Read` holds one. Observed across 216 date entries:

| Shape | Count | Example |
|---|---|---|
| `YYYY` | 214 | `2025` |
| `YYYY/MM/DD` | 1 | `2017/08/15` |
| `YYYY/MM/DD-YYYY/MM/DD` (range) | 1 | `2026/08/13-2026/08/16` |
| `YYYY/MM` | 0 | *speculative, but trivially supported - accept it* |

Consequences:

- Precision is **ragged**. Normalize to `{year, month?, day?}`, never to a `Date`, or you invent a January 1st that isn't in the data.
- Year is the only universally available grain, which is exactly why `groupBy: "year-read"` is the v1 layout.
- **There is no intra-year ordering signal.** Hence D16 (alphabetical). `Date Added` cannot substitute — every row in this export says `2026/08/1x` because it was a bulk import.

`Dates Read` must be split by a real CSV parse first (use **papaparse**), because titles contain commas too and the field is quote-wrapped.

### 2.4 Read status routing

Observed: `read` 211, `to-read` 6, `currently-reading` 3. *(StoryGraph also emits `did-not-finish`; absent here, handle it.)*

The 11 rows with no `Last Date Read` are not an edge case — they are a feature:

| Situation | Count | v1 placement |
|---|---|---|
| `currently-reading` | 3 | the reading table (the mesh already exists in `stacks.js`) |
| `to-read` | 6 | a labelled shelf face near the entrance |
| `read` with no date | 2 | unlabelled shelf face at the far end (D15) |
| `did-not-finish` | 0 here | shelved spine-in, no plaque |

### 2.5 Per-field normalization rules

- **Authors** — comma-separated inside the quoted field, and **can contain duplicates**: observed `"James Mace Ward, James Mace Ward"`. Split, trim, dedupe, preserve order.
- **Read Count** — integer, and **can disagree with `Dates Read`**: observed `Alchemy...` with count `2` but one date. Trust `Read Count` for the number, `Dates Read` for the stamps; do not derive one from the other.
- **Star Rating** — `"4.0"`, `"3.5"` to float. Empty means omitted, never 0.
- **Review** — **contains HTML**: the one populated row starts `<div>`. Strip tags to plain text (keep paragraph breaks); never inject raw. Also the highest-sensitivity field (D10).
- **ISBN/UID** — mostly ISBN-13. StoryGraph also emits non-ISBN UIDs for editions without one; keep only 10/13-digit forms, drop the rest silently.
- **Owned?** — `Yes`/`No` to boolean. All 220 rows say `No` here, so it carries no signal in practice.
- **Encoding** — UTF-8 with Czech/Slovak diacritics throughout (`Zelena svatozar`, `Kruhova obrana` in the real file carry full diacritics). Read as UTF-8 explicitly; do not let a `latin-1` default through. Add a diacritics assertion to the fixture tests.

### 2.6 Known-quirks table (M1 acceptance criteria)

Running the real export must produce exactly:

```
rows parsed            220
books emitted          220
dropped                0
status: read           211   currently-reading 3   to-read 6
no Last Date Read      11
year histogram         2017:8  2018:16  2019:45  2020:30  2021:24
                       2022:16 2023:17  2024:22  2025:24  2026:7   undated:11
warnings               1 x date-range-form        (2026/08/13-2026/08/16)
                       1 x duplicate-author       (James Mace Ward)
                       1 x html-in-review         (Nuclear War : A Scenario)
                       21 x missing-isbn
```

Any deviation is a bug in the importer, not in the fixture.

## 3. Test fixtures

Under `/home/jh/personal_projects/bookwalk/packages/importer/test/fixtures/`:

| Fixture | Purpose |
|---|---|
| `real-anonymized.csv` | 30 rows preserving every quirk in 2.6, fabricated titles/authors (D13) |
| `rich.csv` | the counterfactual: moods, pace, tags, ratings, long reviews, `did-not-finish`, all populated |
| `stress-500.csv` | 500 books in a single year - proves shelf spill (`PLAN.md` section 11) |
| `malformed.csv` | missing header, wrong column count, empty file, BOM, CRLF, non-UTF8 bytes |
| `minimal.csv` | one book, title + author only - the true floor |

The real export stays at `/home/jh/Downloads/storygraph.csv`, referenced by a gitignored local-only test that is skipped in CI.

## 4. Deterministic visual seeds

Preserve the existing scheme from `/home/jh/personal_projects/jac08h.github.io/scripts/build_quotes_json.py:53` so rooms are stable across re-imports and identical for the same book everywhere:

```
digest     = sha256(author + " " + title)   # hex
hue        = int(digest[0:4], 16) % 360
spineSeed  = int(digest[4:8], 16) / 0xFFFF
```

`hue` indexes the theme's `spines` palette; `spineSeed` jitters lightness and drives dimensions in `realBookDims`.

**One v1 change:** book dimensions should read `format` first and fall back to `spineSeed` — hardcover taller and thicker with visible boards, paperback thinner, digital/audio deliberately odd (a slim case). At 94% fill this replaces noise with real signal for almost every book, and it is the cheapest thing in the whole plan that makes a shelf look like someone's actual shelf.

## 5. Reserved extension points

Present in the schema or trivially additive, deliberately unused in v1:

- `Book.coverUrl` + `Book.coverColor` — ISBN to Open Library. **Verified working**: `https://covers.openlibrary.org/b/isbn/9780618680009-M.jpg` returns a real 180x272 JPEG, keyless, `access-control-allow-origin: *` (so canvas sampling for `coverColor` won't taint). **Gotcha:** a miss returns **HTTP 200 with a 43-byte 1x1 GIF** — you must append `?default=false` to get a 404. Hit rate across a real library is unmeasured; Czech/Slovak editions are the likely weak spot. Fetch at import time, cache, fall back to the procedural spine.
- `Manifest.theme.overrides` — per-token customization beyond presets (D18 defers).
- `Manifest.layout.groupBy` — `"author" | "rating" | "mood"`.
- `Book.quotes: string[]` — the payload chain is quote, then review, then plate. Jakub's existing `quotes.json` merges in here, but **title matching cannot be the join key**: StoryGraph normalizes to the English edition (`The Stranger`) while the quote files use the edition actually read (`Cizinec`). A crude normalized-title match got 157/220. An exact merge needs `isbn` or a `storygraph_id` added to the quote markdown frontmatter and ~60 backfilled by hand.
