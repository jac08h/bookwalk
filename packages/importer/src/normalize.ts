import type { Book } from "@bw/manifest";
import type { RawRow, Warning } from "./parse.js";

export type ImportResult = {
  books: Book[];
  warnings: Warning[];
  stats: {
    rowCount: number;
    bookCount: number;
    droppedCount: number;
  };
};

export function normalizeRow(_row: RawRow): { book?: Book; warnings: Warning[] } {
  throw new Error("not implemented yet — M1");
}
