"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ImportResult } from "@bw/importer";
import { buildManifest } from "@bw/importer";
import type { Manifest } from "@bw/manifest";

const PRESETS = [
  { id: "reading-room", name: "Reading Room", blurb: "Warm oak, crimson runner, candlelight" },
  { id: "nordic", name: "Nordic", blurb: "Pale ash, grey-blue light, bright" },
  { id: "study", name: "Study", blurb: "Near-black walnut, deep green, low light" },
  { id: "atrium", name: "Atrium", blurb: "Limestone, daylight, minimal fog" },
  { id: "archive", name: "Archive", blurb: "Grey steel and concrete, cold even light" },
];

type Props = {
  result: ImportResult;
  displayName: string;
  includeToRead: boolean;
  includeCurrentlyReading: boolean;
  onBack: () => void;
};

export function CustomizeStep({ result, displayName, includeToRead, includeCurrentlyReading, onBack }: Props) {
  const [presetId, setPresetId] = useState("reading-room");
  const mountRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<{ destroy: () => void } | null>(null);

  const manifest: Manifest = useMemo(() => {
    const now = new Date().toISOString();
    return buildManifest(result, {
      displayName: displayName.trim() || "My Library",
      presetId,
      includeToRead,
      includeCurrentlyReading,
      slug: "preview",
      now,
    });
  }, [result, displayName, presetId, includeToRead, includeCurrentlyReading]);

  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;
    if (!mount) return;

    handleRef.current?.destroy();
    handleRef.current = null;
    mount.innerHTML = "";

    import("@bw/viewer").then(({ createLibrary }) => {
      if (cancelled || !mountRef.current) return;
      const handle = createLibrary(mountRef.current, manifest, {
        onReady: () => {
          if (!cancelled) handle.enter();
        },
        onError: (err) => {
          console.error("viewer error", err);
        },
      });
      handleRef.current = handle;
    });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  function handlePublish() {
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${manifest.slug || "library"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold">Customize your library</h1>
      <p className="mt-2 text-sm text-zinc-400">Pick a theme, then take a look before you publish.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setPresetId(preset.id)}
            className={`rounded-lg border px-3 py-3 text-left transition-colors ${
              presetId === preset.id
                ? "border-zinc-400 bg-zinc-900"
                : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
            }`}
          >
            <div className="text-sm font-medium text-zinc-100">{preset.name}</div>
            <div className="mt-1 text-[11px] leading-snug text-zinc-500">{preset.blurb}</div>
          </button>
        ))}
      </div>

      <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <div ref={mountRef} className="absolute inset-0" />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Back
        </button>
        <button
          onClick={handlePublish}
          className="rounded-full bg-zinc-50 px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
        >
          Publish (download manifest)
        </button>
      </div>
    </div>
  );
}
