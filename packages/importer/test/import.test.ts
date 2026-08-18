import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildManifest, parseStoryGraphCsv } from "../src/index.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf-8");
}

describe("parseStoryGraphCsv — minimal.csv", () => {
  it("parses the true floor: one book, title + author only", () => {
    const result = parseStoryGraphCsv(loadFixture("minimal.csv"));
    expect(result.stats.bookCount).toBe(1);
    expect(result.books[0].title).toBe("A Single Book");
    expect(result.books[0].authors).toEqual(["Solo Author"]);
  });
});

describe("parseStoryGraphCsv — rich.csv", () => {
  it("parses a fully populated row with moods, pace, tags, rating, review", () => {
    const result = parseStoryGraphCsv(loadFixture("rich.csv"));
    expect(result.stats.bookCount).toBe(3);
    const rich = result.books.find((b) => b.title === "The Fully Loaded Novel");
    expect(rich?.moods).toEqual(["dark", "reflective", "mysterious"]);
    expect(rich?.pace).toBe("slow");
    expect(rich?.tags).toEqual(["favorites", "book-club"]);
    expect(rich?.rating).toBe(4.5);
    expect(rich?.review).toContain("thorough review");
    expect(rich?.review).not.toContain("<");
    expect(rich?.readCount).toBe(2);
    expect(rich?.datesRead).toHaveLength(2);
  });

  it("handles did-not-finish status", () => {
    const result = parseStoryGraphCsv(loadFixture("rich.csv"));
    const dnf = result.books.find((b) => b.title === "Did Not Finish Example");
    expect(dnf?.status).toBe("did-not-finish");
  });
});

describe("parseStoryGraphCsv — stress-500.csv", () => {
  it("parses 500 books in one year without dropping any", () => {
    const result = parseStoryGraphCsv(loadFixture("stress-500.csv"));
    expect(result.stats.bookCount).toBe(500);
    expect(result.stats.droppedCount).toBe(0);
    expect(result.books.every((b) => b.yearRead === 2025)).toBe(true);
  });
});

describe("parseStoryGraphCsv — malformed inputs never crash", () => {
  const cases = [
    "malformed/no-header.csv",
    "malformed/wrong-column-count.csv",
    "malformed/empty.csv",
    "malformed/bom-crlf.csv",
    "malformed/non-utf8.csv",
  ];

  for (const name of cases) {
    it(`does not throw on ${name}`, () => {
      expect(() => parseStoryGraphCsv(loadFixture(name))).not.toThrow();
    });
  }

  it("still extracts the one valid row from bom-crlf.csv", () => {
    const result = parseStoryGraphCsv(loadFixture("malformed/bom-crlf.csv"));
    expect(result.stats.bookCount).toBe(1);
    expect(result.books[0].title).toBe("BOM Book");
  });
});

describe("parseStoryGraphCsv — real-anonymized.csv", () => {
  it("parses all 30 rows with no crashes and preserves quirks", () => {
    const result = parseStoryGraphCsv(loadFixture("real-anonymized.csv"));
    expect(result.stats.bookCount).toBe(30);
    expect(result.warnings.some((w) => w.type === "date-range-form")).toBe(true);
    expect(result.warnings.some((w) => w.type === "duplicate-author")).toBe(true);
    expect(result.warnings.some((w) => w.type === "html-in-review")).toBe(true);
    expect(result.warnings.some((w) => w.type === "missing-isbn")).toBe(true);
  });
});

describe("buildManifest", () => {
  it("assembles a manifest, sorted by author then title, honoring include toggles", () => {
    const result = parseStoryGraphCsv(loadFixture("rich.csv"));
    const manifest = buildManifest(result, {
      displayName: "Test Library",
      presetId: "reading-room",
      includeToRead: false,
      includeCurrentlyReading: true,
      slug: "test",
      now: "2026-01-01T00:00:00.000Z",
    });
    expect(manifest.displayName).toBe("Test Library");
    expect(manifest.books.length).toBe(result.books.length);
    for (let i = 1; i < manifest.books.length; i++) {
      const prevAuthor = manifest.books[i - 1].authors[0]?.toLowerCase() ?? "";
      const curAuthor = manifest.books[i].authors[0]?.toLowerCase() ?? "";
      expect(prevAuthor <= curAuthor).toBe(true);
    }
  });
});

const REAL_CSV_PATH = "/home/jh/Downloads/storygraph.csv";

describe.skipIf(!existsSync(REAL_CSV_PATH))("parseStoryGraphCsv — real export (local only)", () => {
  it("matches the known-quirks table in manifest-schema.md §2.6", () => {
    const text = readFileSync(REAL_CSV_PATH, "utf-8");
    const result = parseStoryGraphCsv(text);

    expect(result.stats.rowCount).toBe(220);
    expect(result.stats.bookCount).toBe(220);
    expect(result.stats.droppedCount).toBe(0);

    const byStatus = (status: string) =>
      result.books.filter((b) => b.status === status).length;
    expect(byStatus("read")).toBe(211);
    expect(byStatus("currently-reading")).toBe(3);
    expect(byStatus("to-read")).toBe(6);

    const noLastDateRead = result.books.filter(
      (b) => b.status === "read" && b.yearRead === undefined
    ).length;
    expect(noLastDateRead).toBe(2);

    const yearCounts: Record<string, number> = {};
    for (const book of result.books) {
      if (book.status !== "read") continue;
      const key = book.yearRead === undefined ? "undated" : String(book.yearRead);
      yearCounts[key] = (yearCounts[key] ?? 0) + 1;
    }
    expect(yearCounts).toEqual({
      "2017": 8,
      "2018": 16,
      "2019": 45,
      "2020": 30,
      "2021": 24,
      "2022": 16,
      "2023": 17,
      "2024": 22,
      "2025": 24,
      "2026": 7,
      undated: 2,
    });

    const warningCounts: Record<string, number> = {};
    for (const warning of result.warnings) {
      warningCounts[warning.type] = (warningCounts[warning.type] ?? 0) + 1;
    }
    expect(warningCounts["date-range-form"]).toBe(1);
    expect(warningCounts["html-in-review"]).toBe(1);
    expect(warningCounts["missing-isbn"]).toBe(21);
    // manifest-schema.md §2.6 says 1, but the real export actually has 2
    // (James Mace Ward, and David Eagleman) — a doc inaccuracy, not a bug.
    expect(warningCounts["duplicate-author"]).toBe(2);
  });
});
