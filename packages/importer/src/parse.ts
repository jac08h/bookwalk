export type Warning = {
  type:
    | "unknown-column"
    | "row-dropped"
    | "date-range-form"
    | "duplicate-author"
    | "html-in-review"
    | "missing-isbn";
  message: string;
  row?: number;
};

export type RawRow = Record<string, string>;

export type ParseResult = {
  rows: RawRow[];
  warnings: Warning[];
};

export function parseStoryGraphCsv(_text: string): ParseResult {
  throw new Error("not implemented yet — M1");
}
