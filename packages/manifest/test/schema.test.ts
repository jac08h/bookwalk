import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, ManifestSchema } from "../src/schema.js";

describe("ManifestSchema", () => {
  it("accepts a minimal valid manifest", () => {
    const manifest = {
      version: CURRENT_VERSION,
      slug: "test",
      displayName: "Test",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      source: { kind: "storygraph", importedAt: "2026-01-01T00:00:00.000Z", rowCount: 0 },
      theme: { presetId: "reading-room" },
      layout: {
        groupBy: "year-read",
        sortWithinGroup: "author-title",
        includeToRead: true,
        includeCurrentlyReading: true,
      },
      books: [],
    };
    expect(() => ManifestSchema.parse(manifest)).not.toThrow();
  });
});
