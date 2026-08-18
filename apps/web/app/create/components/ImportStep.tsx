"use client";

import { useCallback, useRef, useState } from "react";
import { parseStoryGraphCsv, type ImportResult } from "@bw/importer";

const MAX_CSV_BYTES = 10 * 1024 * 1024;

type Props = {
  onParsed: (result: ImportResult, suggestedDisplayName: string) => void;
};

export function ImportStep({ onParsed }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_CSV_BYTES) {
        setError("That file is over 10 MB — StoryGraph exports are usually well under 1 MB. Is this the right file?");
        return;
      }
      setBusy(true);
      try {
        const text = await file.text();
        const result = parseStoryGraphCsv(text);
        if (result.stats.bookCount === 0) {
          setError("No books could be read from that file. Make sure it's a StoryGraph CSV export.");
          setBusy(false);
          return;
        }
        const suggestedName = file.name.replace(/\.csv$/i, "").replace(/[_-]+/g, " ").trim() || "My Library";
        onParsed(result, suggestedName.length <= 40 ? suggestedName : "My Library");
      } catch {
        setError("Couldn't parse that file. Make sure it's a StoryGraph CSV export.");
        setBusy(false);
      }
    },
    [onParsed]
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold">Import your reading history</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Drop your StoryGraph CSV export below. Everything is parsed in your browser — nothing is uploaded until you
        publish.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-8 flex w-full max-w-md cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-14 transition-colors ${
          dragging ? "border-zinc-400 bg-zinc-900" : "border-zinc-700 hover:border-zinc-500"
        }`}
      >
        <span className="text-4xl">📚</span>
        <span className="text-sm text-zinc-300">
          {busy ? "Reading your export…" : "Drop your CSV here, or click to browse"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {error && <p className="mt-4 max-w-md text-sm text-red-400">{error}</p>}

      <p className="mt-8 text-xs text-zinc-600">
        Don&apos;t have an export? You can generate one from your StoryGraph account settings.
      </p>
    </div>
  );
}
