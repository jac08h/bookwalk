import { CURRENT_VERSION, ManifestSchema, type Manifest } from "./schema.js";

export function migrate(input: unknown): Manifest {
  if (typeof input !== "object" || input === null) {
    throw new Error("migrate: input is not an object");
  }
  const version = (input as Record<string, unknown>).version;
  if (version !== CURRENT_VERSION) {
    throw new Error(`migrate: unsupported manifest version ${String(version)}`);
  }
  return ManifestSchema.parse(input);
}
