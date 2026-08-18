import Papa from "papaparse";

export type Warning =
  | { type: "unknown-column"; column: string }
  | { type: "row-dropped"; row: number; reason: string }
  | { type: "date-range-form"; row: number; value: string }
  | { type: "duplicate-author"; row: number; author: string }
  | { type: "html-in-review"; row: number }
  | { type: "missing-isbn"; row: number };

export const KNOWN_COLUMNS = [
  "Title",
  "Authors",
  "Contributors",
  "ISBN/UID",
  "Format",
  "Read Status",
  "Date Added",
  "Last Date Read",
  "Dates Read",
  "Read Count",
  "Moods",
  "Pace",
  "Character- or Plot-Driven?",
  "Strong Character Development?",
  "Loveable Characters?",
  "Diverse Characters?",
  "Flawed Characters?",
  "Star Rating",
  "Review",
  "Content Warnings",
  "Content Warning Description",
  "Tags",
  "Owned?",
] as const;

export type RawRow = Record<string, string>;

export type ParseResult = {
  rows: RawRow[];
  warnings: Warning[];
  rowCount: number;
};

export function parseStoryGraphCsv(text: string): ParseResult {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value,
  });

  const warnings: Warning[] = [];
  const fields = result.meta.fields ?? [];
  const knownSet = new Set<string>(KNOWN_COLUMNS);
  for (const field of fields) {
    if (!knownSet.has(field)) {
      warnings.push({ type: "unknown-column", column: field });
    }
  }

  return {
    rows: result.data,
    warnings,
    rowCount: result.data.length,
  };
}
