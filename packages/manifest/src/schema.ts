import { z } from "zod";

export const CURRENT_VERSION = 1 as const;

export const ReadDatePointSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
});

export const ReadDateSchema = z.union([
  ReadDatePointSchema,
  z.object({
    from: ReadDatePointSchema,
    to: ReadDatePointSchema,
  }),
]);

export const BookStatusSchema = z.enum([
  "read",
  "currently-reading",
  "to-read",
  "did-not-finish",
]);

export const BookFormatSchema = z.enum([
  "paperback",
  "hardcover",
  "digital",
  "audio",
]);

export const BookSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()).min(1),
  contributors: z.array(z.string()).optional(),
  isbn: z.string().optional(),
  format: BookFormatSchema.optional(),
  status: BookStatusSchema,
  owned: z.boolean().optional(),
  yearRead: z.number().int().optional(),
  datesRead: z.array(ReadDateSchema),
  readCount: z.number().int().min(0),
  rating: z.number().min(0).max(5).optional(),
  review: z.string().optional(),
  moods: z.array(z.string()).optional(),
  pace: z.enum(["slow", "medium", "fast"]).optional(),
  tags: z.array(z.string()).optional(),
  hue: z.number().min(0).max(359),
  spineSeed: z.number().min(0).max(1),
});

export const ManifestSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  slug: z.string(),
  displayName: z.string().min(1).max(40),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.object({
    kind: z.literal("storygraph"),
    importedAt: z.string(),
    rowCount: z.number().int().min(0),
  }),
  theme: z.object({
    presetId: z.string(),
  }),
  layout: z.object({
    groupBy: z.literal("year-read"),
    sortWithinGroup: z.literal("author-title"),
    includeToRead: z.boolean(),
    includeCurrentlyReading: z.boolean(),
  }),
  books: z.array(BookSchema),
});

export type ReadDatePoint = z.infer<typeof ReadDatePointSchema>;
export type ReadDate = z.infer<typeof ReadDateSchema>;
export type BookStatus = z.infer<typeof BookStatusSchema>;
export type BookFormat = z.infer<typeof BookFormatSchema>;
export type Book = z.infer<typeof BookSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
