import { describe, expect, it } from "vitest";
import { parseDatePoint, parseDateEntry, parseDatesRead } from "../src/dates.js";

describe("parseDatePoint", () => {
  it("parses YYYY", () => {
    expect(parseDatePoint("2025")).toEqual({ year: 2025 });
  });

  it("parses YYYY/MM/DD", () => {
    expect(parseDatePoint("2017/08/15")).toEqual({ year: 2017, month: 8, day: 15 });
  });

  it("parses YYYY/MM", () => {
    expect(parseDatePoint("2020/05")).toEqual({ year: 2020, month: 5 });
  });

  it("rejects garbage", () => {
    expect(parseDatePoint("not-a-date")).toBeUndefined();
  });
});

describe("parseDateEntry", () => {
  it("parses a range", () => {
    const result = parseDateEntry("2026/08/13-2026/08/16");
    expect(result?.isRange).toBe(true);
    expect(result?.date).toEqual({
      from: { year: 2026, month: 8, day: 13 },
      to: { year: 2026, month: 8, day: 16 },
    });
  });
});

describe("parseDatesRead", () => {
  it("splits comma-separated dates and flags a range", () => {
    const { dates, hasRange } = parseDatesRead("2024, 2020");
    expect(dates).toEqual([{ year: 2024 }, { year: 2020 }]);
    expect(hasRange).toBe(false);
  });

  it("handles an empty string", () => {
    expect(parseDatesRead("")).toEqual({ dates: [], hasRange: false });
  });

  it("flags the range form", () => {
    const { hasRange } = parseDatesRead("2026/08/13-2026/08/16");
    expect(hasRange).toBe(true);
  });
});
