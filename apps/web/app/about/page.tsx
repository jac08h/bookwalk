import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "What Bookwalk is and how it works.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center bg-zinc-950 px-6 py-24 text-zinc-50">
      <h1 className="text-3xl font-semibold">About Bookwalk</h1>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-zinc-400">
        <p>
          Bookwalk turns a StoryGraph reading export into a walkable, first-person 3D library — a room shelved by
          the year you read each book, that you can share with a link.
        </p>
        <p>
          Everything runs in your browser: your CSV is parsed locally and never leaves your device until you
          choose to publish. Publishing stores only the derived data (titles, authors, dates, ratings, reviews you
          choose to include) — never the raw export.
        </p>
        <p>
          Published libraries are unlisted by default: reachable only by the link you share, never listed publicly
          or searchable. There are no accounts — a secret edit link lets you make changes or delete your library
          later.
        </p>
        <p>
          Bookwalk is a small, personal project. It has no ads, doesn&apos;t sell data, and isn&apos;t trying to be
          a platform.
        </p>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-zinc-500 underline hover:text-zinc-300">
          &larr; Back home
        </Link>
      </div>
    </div>
  );
}
