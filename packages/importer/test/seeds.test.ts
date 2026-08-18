import { describe, expect, it } from "vitest";
import { bookId, visualSeeds } from "../src/seeds.js";

describe("visualSeeds", () => {
  it("matches the reference implementation in build_quotes_json.py", () => {
    // Reference: hashlib.md5(f"{author}|{title}").hexdigest() -> hue, spine_seed
    const result = visualSeeds(
      "Cal Newport",
      "Deep Work: Rules for Focused Success in a Distracted World"
    );
    expect(result).toEqual({ hue: 303, spineSeed: 0.6629 });
  });

  it("is deterministic", () => {
    const a = visualSeeds("Author", "Title");
    const b = visualSeeds("Author", "Title");
    expect(a).toEqual(b);
  });
});

describe("bookId", () => {
  it("is deterministic and stable across whitespace/case differences", () => {
    const a = bookId("The Idiot", "Fyodor Dostoevsky");
    const b = bookId("the idiot", "  Fyodor Dostoevsky  ");
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });
});
