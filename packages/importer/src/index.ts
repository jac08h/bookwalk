import type { Book } from "@bw/manifest";
import { parseStoryGraphCsv as parseCsvRows, type Warning } from "./parse.js";
import { normalizeRow } from "./normalize.js";

export type { Warning, RawRow } from "./parse.js";
export type { BuildOptions } from "./build.js";
export { buildManifest } from "./build.js";

export type ImportStats = {
  rowCount: number;
  bookCount: number;
  droppedCount: number;
};

export type ImportResult = {
  books: Book[];
  warnings: Warning[];
  stats: ImportStats;
};

export function parseStoryGraphCsv(text: string): ImportResult {
  const parsed = parseCsvRows(text);
  const warnings: Warning[] = [...parsed.warnings];
  const books: Book[] = [];

  parsed.rows.forEach((row, index) => {
    const { book, warnings: rowWarnings } = normalizeRow(row, { row: index + 2 });
    warnings.push(...rowWarnings);
    if (book) {
      books.push(book);
    }
  });

  return {
    books,
    warnings,
    stats: {
      rowCount: parsed.rowCount,
      bookCount: books.length,
      droppedCount: parsed.rowCount - books.length,
    },
  };
}
