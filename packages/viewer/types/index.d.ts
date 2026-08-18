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

export type ColliderBox = { minX: number; maxX: number; minZ: number; maxZ: number };

export type LadderState = { currentStop: number; targetStop: number; moving: boolean; x: number; z: number };

export type ScreenPoint = { x: number; y: number };

export type LibraryHandle = {
  destroy(): void;
  setTheme(theme: Theme): void;
  state(): ViewerState;
  enter(): void;
  enterAnimated(): void;
  teleportTo(x: number, z: number, yaw?: number, pitch?: number): void;
  nudge(dx: number, dz: number): void;
  setKeys(map: Record<string, boolean>): void;
  injectLook(dx: number, dy: number): void;
  injectMove(x: number, y: number): void;
  tap(): void;
  colliders(): ColliderBox[];
  aimAtBook(id: string): boolean;
  openBookById(id: string): boolean;
  grabBookById(id: string): boolean;
  closeBook(): void;
  aimAtLadder(): boolean;
  moveLadder(): boolean;
  ladderState(): LadderState | null;
  screenPointFor(id: string): ScreenPoint | null;
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
