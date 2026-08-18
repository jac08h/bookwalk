"use client";

import { useMemo } from "react";
import type { ImportResult } from "@bw/importer";

type Props = {
  result: ImportResult;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  includeToRead: boolean;
  onIncludeToReadChange: (value: boolean) => void;
  includeCurrentlyReading: boolean;
  onIncludeCurrentlyReadingChange: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
};

const WARNING_LABELS: Record<string, string> = {
  "unknown-column": "Unrecognized column in the export",
  "row-dropped": "Row skipped (missing title or author)",
  "date-range-form": "Date given as a range",
  "duplicate-author": "Duplicate author listed on a book",
  "html-in-review": "Review text contained formatting",
  "missing-isbn": "No ISBN on file",
};

export function ReviewStep({
  result,
  displayName,
  onDisplayNameChange,
  includeToRead,
  onIncludeToReadChange,
  includeCurrentlyReading,
  onIncludeCurrentlyReadingChange,
  onBack,
  onContinue,
}: Props) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const book of result.books) {
      counts[book.status] = (counts[book.status] ?? 0) + 1;
    }
    return counts;
  }, [result.books]);

  const yearHistogram = useMemo(() => {
    const counts = new Map<number, number>();
    let undated = 0;
    for (const book of result.books) {
      if (book.status !== "read") continue;
      if (book.yearRead === undefined) {
        undated += 1;
        continue;
      }
      counts.set(book.yearRead, (counts.get(book.yearRead) ?? 0) + 1);
    }
    const years = Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);
    const max = Math.max(1, ...years.map(([, count]) => count));
    return { years, undated, max };
  }, [result.books]);

  const warningCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const warning of result.warnings) {
      counts[warning.type] = (counts[warning.type] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [result.warnings]);

  const nameValid = displayName.trim().length > 0 && displayName.length <= 40;

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold">Review your library</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {result.stats.bookCount} books loaded from {result.stats.rowCount} rows
        {result.stats.droppedCount > 0 ? ` (${result.stats.droppedCount} skipped)` : ""}.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {(["read", "to-read", "currently-reading", "did-not-finish"] as const).map((status) => (
          <div key={status} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="text-2xl font-semibold">{statusCounts[status] ?? 0}</div>
            <div className="text-xs text-zinc-500">{status.replace(/-/g, " ")}</div>
          </div>
        ))}
      </div>

      {yearHistogram.years.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-zinc-300">Books read by year</h2>
          <div className="mt-3 flex items-end gap-1.5 overflow-x-auto pb-2">
            {yearHistogram.years.map(([year, count]) => (
              <div key={year} className="flex flex-col items-center gap-1">
                <div
                  className="w-7 rounded-t bg-zinc-600"
                  style={{ height: `${Math.max(4, (count / yearHistogram.max) * 96)}px` }}
                  title={`${year}: ${count}`}
                />
                <span className="text-[10px] text-zinc-600">{String(year).slice(2)}</span>
              </div>
            ))}
            {yearHistogram.undated > 0 && (
              <div className="ml-2 flex flex-col items-center gap-1">
                <div
                  className="w-7 rounded-t bg-zinc-800"
                  style={{ height: `${Math.max(4, (yearHistogram.undated / yearHistogram.max) * 96)}px` }}
                  title={`Undated: ${yearHistogram.undated}`}
                />
                <span className="text-[10px] text-zinc-600">?</span>
              </div>
            )}
          </div>
        </div>
      )}

      {warningCounts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-zinc-300">Notes</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-500">
            {warningCounts.map(([type, count]) => (
              <li key={type}>
                {count}&times; {WARNING_LABELS[type] ?? type}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 space-y-5 border-t border-zinc-800 pt-8">
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-zinc-300">
            Display name
          </label>
          <p className="mt-1 text-xs text-zinc-500">Appears on the door plaque, e.g. &ldquo;JAKUB&apos;S LIBRARY&rdquo;.</p>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            maxLength={40}
            placeholder="Your name"
            className="mt-2 w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={includeToRead}
            onChange={(e) => onIncludeToReadChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
          />
          Include to-read books ({statusCounts["to-read"] ?? 0})
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={includeCurrentlyReading}
            onChange={(e) => onIncludeCurrentlyReadingChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
          />
          Include currently-reading books ({statusCounts["currently-reading"] ?? 0})
        </label>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Back
        </button>
        <button
          onClick={onContinue}
          disabled={!nameValid}
          className="rounded-full bg-zinc-50 px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
