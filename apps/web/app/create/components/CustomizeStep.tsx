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

type PublishState =
  | { status: "idle" }
  | { status: "publishing" }
  | { status: "done"; slug: string; editToken: string }
  | { status: "error"; message: string };

function saveLibraryToLocalStorage(slug: string, editToken: string, displayName: string) {
  try {
    const key = "bookwalk:my-libraries";
    const raw = window.localStorage.getItem(key);
    const list: Array<{ slug: string; editToken: string; displayName: string; createdAt: string }> = raw
      ? JSON.parse(raw)
      : [];
    list.push({ slug, editToken, displayName, createdAt: new Date().toISOString() });
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // localStorage can fail (private browsing, quota) — losing the local
    // bookmark isn't fatal, the user still has the edit link on screen.
  }
}

export function CustomizeStep({ result, displayName, includeToRead, includeCurrentlyReading, onBack }: Props) {
  const [presetId, setPresetId] = useState("reading-room");
  const [publishState, setPublishState] = useState<PublishState>({ status: "idle" });
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

  async function handlePublish() {
    setPublishState({ status: "publishing" });
    try {
      const res = await fetch("/api/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifest),
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishState({ status: "error", message: data.error || "Something went wrong publishing." });
        return;
      }
      saveLibraryToLocalStorage(data.slug, data.editToken, manifest.displayName);
      setPublishState({ status: "done", slug: data.slug, editToken: data.editToken });
    } catch {
      setPublishState({ status: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  }

  function handleDownload() {
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

      {publishState.status === "done" ? (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-sm font-medium text-zinc-100">Your library is live</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-xs text-zinc-500">Public link — share this</div>
              <a href={`/l/${publishState.slug}`} className="text-zinc-100 underline hover:text-white">
                {typeof window !== "undefined" ? window.location.origin : ""}/l/{publishState.slug}
              </a>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Edit token — keep this private, it authorizes changes or deletion</div>
              <code className="block break-all text-zinc-400">{publishState.editToken}</code>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            This token is saved to this browser&apos;s local storage under &ldquo;your libraries&rdquo;. There&apos;s no edit
            page yet — losing it means re-importing and publishing fresh.
          </p>
        </div>
      ) : (
        <div className="mt-10 flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300">
            &larr; Back
          </button>
          <div className="flex items-center gap-3">
            {publishState.status === "error" && (
              <span className="text-sm text-red-400">{publishState.message}</span>
            )}
            <button
              onClick={handleDownload}
              className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500"
            >
              Download manifest
            </button>
            <button
              onClick={handlePublish}
              disabled={publishState.status === "publishing"}
              className="rounded-full bg-zinc-50 px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishState.status === "publishing" ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
