"use client";

import { useEffect, useRef } from "react";
import type { Manifest } from "@bw/manifest";

type Props = { manifest: Manifest };

export function LibraryViewer({ manifest }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;
    if (!mount) return;

    let handle: { destroy: () => void } | null = null;

    import("@bw/viewer").then(({ createLibrary }) => {
      if (cancelled || !mountRef.current) return;
      handle = createLibrary(mountRef.current, manifest, {
        onError: (err) => {
          console.error("viewer error", err);
        },
      });
    });

    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, [manifest]);

  return <div ref={mountRef} className="fixed inset-0 bg-black" />;
}
