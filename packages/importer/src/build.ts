import type { Manifest } from "@bw/manifest";
import type { ImportResult } from "./normalize.js";

export type BuildOptions = {
  displayName: string;
  presetId: string;
  includeToRead: boolean;
  includeCurrentlyReading: boolean;
};

export function buildManifest(_result: ImportResult, _opts: BuildOptions): Manifest {
  throw new Error("not implemented yet — M1");
}
