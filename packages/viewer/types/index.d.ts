import type { Manifest } from "@bw/manifest";

export type Theme = {
  wood: Record<string, unknown>;
  woodDark: Record<string, unknown>;
  floor: Record<string, unknown>;
  rug: Record<string, unknown>;
  plaster: Record<string, unknown>;
  wainscot: Record<string, unknown>;
  metal: Record<string, unknown>;
  light: Record<string, unknown>;
  spines: Record<string, unknown>;
};

export type ViewerState = {
  ready: boolean;
  entered: boolean;
  locked: boolean;
  touchMode: boolean;
  [key: string]: unknown;
};

export type LibraryHandle = {
  destroy(): void;
  setTheme(theme: Theme): void;
  state(): ViewerState;
};

export function createLibrary(
  root: HTMLElement,
  manifest: Manifest,
  opts?: {
    reducedMotion?: boolean;
    touchMode?: "auto" | "force" | "off";
    music?: boolean;
    onReady?: () => void;
    onError?: (e: Error) => void;
  }
): LibraryHandle;
