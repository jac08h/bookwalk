import type { ReadDate, ReadDatePoint } from "@bw/manifest";

export function parseDatePoint(text: string): ReadDatePoint | undefined {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d{4})(?:\/(\d{2}))?(?:\/(\d{2}))?$/);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : undefined;
  const day = match[3] ? Number(match[3]) : undefined;
  const point: ReadDatePoint = { year };
  if (month !== undefined) {
    point.month = month;
  }
  if (day !== undefined) {
    point.day = day;
  }
  return point;
}

export type ParsedDateEntry = {
  date?: ReadDate;
  isRange: boolean;
};

export function parseDateEntry(text: string): ParsedDateEntry | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  const rangeMatch = trimmed.match(/^(\d{4}\/\d{2}\/\d{2})-(\d{4}\/\d{2}\/\d{2})$/);
  if (rangeMatch) {
    const from = parseDatePoint(rangeMatch[1]);
    const to = parseDatePoint(rangeMatch[2]);
    if (from && to) {
      return { date: { from, to }, isRange: true };
    }
    return undefined;
  }
  const point = parseDatePoint(trimmed);
  if (!point) {
    return undefined;
  }
  return { date: point, isRange: false };
}

export function parseDatesRead(text: string): { dates: ReadDate[]; hasRange: boolean } {
  if (!text.trim()) {
    return { dates: [], hasRange: false };
  }
  const entries = text.split(",").map((part) => part.trim()).filter(Boolean);
  const dates: ReadDate[] = [];
  let hasRange = false;
  for (const entry of entries) {
    const parsed = parseDateEntry(entry);
    if (!parsed || !parsed.date) {
      continue;
    }
    dates.push(parsed.date);
    if (parsed.isRange) {
      hasRange = true;
    }
  }
  return { dates, hasRange };
}

export function yearFromLastDateRead(text: string): number | undefined {
  const parsed = parseDateEntry(text);
  if (!parsed || !parsed.date) {
    return undefined;
  }
  if ("year" in parsed.date) {
    return parsed.date.year;
  }
  return parsed.date.to.year;
}
