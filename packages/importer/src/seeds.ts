import { sha256 } from "js-sha256";
import SparkMD5 from "spark-md5";

export function normalizeForId(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function bookId(title: string, author: string): string {
  const normalizedTitle = normalizeForId(title);
  const normalizedAuthor = normalizeForId(author);
  const digest = sha256(`${normalizedTitle} ${normalizedAuthor}`);
  return digest.slice(0, 16);
}

export function visualSeeds(author: string, title: string): { hue: number; spineSeed: number } {
  const digest = SparkMD5.hash(`${author}|${title}`);
  const hue = parseInt(digest.slice(0, 4), 16) % 360;
  const spineSeed = Math.round((parseInt(digest.slice(4, 8), 16) / 0xffff) * 10000) / 10000;
  return { hue, spineSeed };
}
