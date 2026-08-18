import type { Book, BookFormat, BookStatus } from "@bw/manifest";
import type { RawRow, Warning } from "./parse.js";
import { parseDatesRead, yearFromLastDateRead } from "./dates.js";
import { bookId, visualSeeds } from "./seeds.js";

const FORMAT_MAP: Record<string, BookFormat> = {
  paperback: "paperback",
  hardcover: "hardcover",
  digital: "digital",
  audio: "audio",
};

const STATUS_MAP: Record<string, BookStatus> = {
  read: "read",
  "to-read": "to-read",
  "currently-reading": "currently-reading",
  "did-not-finish": "did-not-finish",
};

export function splitAuthors(text: string): { authors: string[]; hasDuplicate: boolean } {
  const raw = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const authors: string[] = [];
  let hasDuplicate = false;
  for (const author of raw) {
    if (seen.has(author)) {
      hasDuplicate = true;
      continue;
    }
    seen.add(author);
    authors.push(author);
  }
  return { authors, hasDuplicate };
}

export function normalizeIsbn(text: string): string | undefined {
  const digits = text.trim();
  if (/^\d{10}$/.test(digits) || /^\d{13}$/.test(digits)) {
    return digits;
  }
  return undefined;
}

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(?:nbsp|amp|lt|gt|quot|#39|apos);/g, (match) => HTML_ENTITIES[match] ?? match);
}

export function stripHtml(text: string): { plain: string; hadHtml: boolean } {
  const hadHtml = /<[a-z][\s\S]*>/i.test(text);
  const withBreaks = text.replace(/<\/(p|div|br)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  const plain = decodeEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n")
    .trim();
  return { plain, hadHtml };
}

export type NormalizeContext = { row: number };

export function normalizeRow(
  row: RawRow,
  ctx: NormalizeContext
): { book?: Book; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const title = (row["Title"] ?? "").trim();
  const authorsText = (row["Authors"] ?? "").trim();

  if (!title || !authorsText) {
    warnings.push({ type: "row-dropped", row: ctx.row, reason: "missing Title or Authors" });
    return { warnings };
  }

  const { authors, hasDuplicate } = splitAuthors(authorsText);
  if (hasDuplicate) {
    warnings.push({ type: "duplicate-author", row: ctx.row, author: authors[0] ?? authorsText });
  }

  const contributorsText = (row["Contributors"] ?? "").trim();
  const contributors = contributorsText
    ? contributorsText.split(",").map((part) => part.trim()).filter(Boolean)
    : undefined;

  const isbnRaw = (row["ISBN/UID"] ?? "").trim();
  const isbn = isbnRaw ? normalizeIsbn(isbnRaw) : undefined;
  if (!isbnRaw) {
    warnings.push({ type: "missing-isbn", row: ctx.row });
  }

  const formatRaw = (row["Format"] ?? "").trim().toLowerCase();
  const format = FORMAT_MAP[formatRaw];

  const statusRaw = (row["Read Status"] ?? "").trim().toLowerCase();
  const status = STATUS_MAP[statusRaw] ?? "read";

  const ownedRaw = (row["Owned?"] ?? "").trim().toLowerCase();
  const owned = ownedRaw === "yes" ? true : ownedRaw === "no" ? false : undefined;

  const datesReadText = (row["Dates Read"] ?? "").trim();
  const { dates: datesRead, hasRange } = parseDatesRead(datesReadText);
  if (hasRange) {
    warnings.push({ type: "date-range-form", row: ctx.row, value: datesReadText });
  }

  const lastDateReadText = (row["Last Date Read"] ?? "").trim();
  const yearRead =
    status === "read" ? yearFromLastDateRead(lastDateReadText) : undefined;

  const readCountRaw = (row["Read Count"] ?? "").trim();
  const readCount = readCountRaw ? parseInt(readCountRaw, 10) : 0;

  const ratingRaw = (row["Star Rating"] ?? "").trim();
  const rating = ratingRaw ? parseFloat(ratingRaw) : undefined;

  const reviewRaw = (row["Review"] ?? "").trim();
  let review: string | undefined;
  if (reviewRaw) {
    const { plain, hadHtml } = stripHtml(reviewRaw);
    review = plain || undefined;
    if (hadHtml) {
      warnings.push({ type: "html-in-review", row: ctx.row });
    }
  }

  const moodsRaw = (row["Moods"] ?? "").trim();
  const moods = moodsRaw ? moodsRaw.split(",").map((m) => m.trim()).filter(Boolean) : undefined;

  const paceRaw = (row["Pace"] ?? "").trim().toLowerCase();
  const pace =
    paceRaw === "slow" || paceRaw === "medium" || paceRaw === "fast" ? paceRaw : undefined;

  const tagsRaw = (row["Tags"] ?? "").trim();
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  const primaryAuthor = authors[0] ?? "";
  const { hue, spineSeed } = visualSeeds(primaryAuthor, title);

  const book: Book = {
    id: bookId(title, primaryAuthor),
    title,
    authors,
    ...(contributors && contributors.length > 0 ? { contributors } : {}),
    ...(isbn ? { isbn } : {}),
    ...(format ? { format } : {}),
    status,
    ...(owned !== undefined ? { owned } : {}),
    ...(yearRead !== undefined ? { yearRead } : {}),
    datesRead,
    readCount,
    ...(rating !== undefined ? { rating } : {}),
    ...(review ? { review } : {}),
    ...(moods && moods.length > 0 ? { moods } : {}),
    ...(pace ? { pace } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    hue,
    spineSeed,
  };

  return { book, warnings };
}
