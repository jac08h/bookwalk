import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { randomBytes } from "node:crypto";
import { migrate, type Manifest } from "@bw/manifest";

const PREFIX = "bookwalk:";
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_BOOKS = 5000;

const redis = Redis.fromEnv();

const publishRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 d"),
  prefix: `${PREFIX}ratelimit:publish`,
});

export type LibraryMeta = {
  displayName: string;
  bookCount: number;
  yearMin: number | null;
  yearMax: number | null;
  themeId: string;
  createdAt: string;
  updatedAt: string;
  visibility: "unlisted";
  viewCount: number;
};

export class PublishLimitError extends Error {}
export class ManifestTooLargeError extends Error {}
export class LibraryNotFoundError extends Error {}
export class InvalidEditTokenError extends Error {}

function libKey(slug: string): string {
  return `${PREFIX}lib:${slug}`;
}

function metaKey(slug: string): string {
  return `${PREFIX}meta:${slug}`;
}

function editKey(token: string): string {
  return `${PREFIX}edit:${token}`;
}

export function validateManifestSize(manifest: Manifest): void {
  const json = JSON.stringify(manifest);
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > MAX_MANIFEST_BYTES) {
    throw new ManifestTooLargeError(
      `Manifest is ${(bytes / 1024 / 1024).toFixed(2)} MB, over the ${MAX_MANIFEST_BYTES / 1024 / 1024} MB limit.`
    );
  }
  if (manifest.books.length > MAX_BOOKS) {
    throw new ManifestTooLargeError(`Manifest has ${manifest.books.length} books, over the ${MAX_BOOKS} limit.`);
  }
}

export async function checkPublishRateLimit(ip: string): Promise<void> {
  const { success } = await publishRatelimit.limit(ip);
  if (!success) {
    throw new PublishLimitError("The library is full today, try tomorrow.");
  }
}

function slugify(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "library";
}

function buildMeta(manifest: Manifest): LibraryMeta {
  const years = manifest.books
    .map((b) => b.yearRead)
    .filter((y): y is number => typeof y === "number");
  return {
    displayName: manifest.displayName,
    bookCount: manifest.books.length,
    yearMin: years.length ? Math.min(...years) : null,
    yearMax: years.length ? Math.max(...years) : null,
    themeId: manifest.theme.presetId,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
    visibility: "unlisted",
    viewCount: 0,
  };
}

async function findAvailableSlug(base: string): Promise<string> {
  const existing = await redis.get(libKey(base));
  if (!existing) return base;
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = randomBytes(3).toString("hex").slice(0, 4);
    const candidate = `${base}-${suffix}`;
    const taken = await redis.get(libKey(candidate));
    if (!taken) return candidate;
  }
  throw new Error("Could not find an available slug after 20 attempts.");
}

export async function publishLibrary(
  manifest: Manifest
): Promise<{ slug: string; editToken: string }> {
  validateManifestSize(manifest);

  const base = slugify(manifest.displayName);
  const slug = await findAvailableSlug(base);
  const editToken = randomBytes(24).toString("base64url");

  const finalManifest: Manifest = { ...manifest, slug };
  const meta = buildMeta(finalManifest);

  await redis.set(libKey(slug), JSON.stringify(finalManifest));
  await redis.hset(metaKey(slug), meta);
  await redis.set(editKey(editToken), slug);

  return { slug, editToken };
}

export async function getLibrary(slug: string): Promise<Manifest | null> {
  const raw = await redis.get<string | Manifest>(libKey(slug));
  if (!raw) return null;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return migrate(parsed);
}

export async function incrementViewCount(slug: string): Promise<void> {
  await redis.hincrby(metaKey(slug), "viewCount", 1);
}

async function slugForEditToken(editToken: string): Promise<string> {
  const slug = await redis.get<string>(editKey(editToken));
  if (!slug) {
    throw new InvalidEditTokenError("This edit link is invalid or has been deleted.");
  }
  return slug;
}

export async function updateLibrary(
  editToken: string,
  updates: { manifest?: Manifest; presetId?: string }
): Promise<{ slug: string }> {
  const slug = await slugForEditToken(editToken);
  const existing = await getLibrary(slug);
  if (!existing) {
    throw new LibraryNotFoundError("The library this link points to no longer exists.");
  }

  const now = new Date().toISOString();
  let next: Manifest = existing;

  if (updates.manifest) {
    validateManifestSize(updates.manifest);
    next = { ...updates.manifest, slug, createdAt: existing.createdAt, updatedAt: now };
  }
  if (updates.presetId) {
    next = { ...next, theme: { presetId: updates.presetId }, updatedAt: now };
  }

  await redis.set(libKey(slug), JSON.stringify(next));
  const meta = buildMeta(next);
  await redis.hset(metaKey(slug), meta);

  return { slug };
}

export async function deleteLibraryByEditToken(editToken: string): Promise<{ slug: string }> {
  const slug = await slugForEditToken(editToken);
  await redis.del(libKey(slug));
  await redis.del(metaKey(slug));
  await redis.del(editKey(editToken));
  return { slug };
}

export async function deleteLibraryBySlug(slug: string): Promise<void> {
  await redis.del(libKey(slug));
  await redis.del(metaKey(slug));
}
