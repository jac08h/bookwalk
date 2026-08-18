import Link from "next/link";

// D4/D6: /browse is a static page with exactly one hardcoded entry — Jakub's
// own published library. There is no submission flow or listing API; every
// other published library is unlisted-by-link only. Set BROWSE_EXAMPLE_SLUG
// once you've published your own library and want to feature it here.
const EXAMPLE_SLUG = process.env.BROWSE_EXAMPLE_SLUG || null;
const EXAMPLE_NAME = process.env.BROWSE_EXAMPLE_NAME || "Jakub";

export default function BrowsePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-24 text-center text-zinc-50">
      <h1 className="text-3xl font-semibold">Browse</h1>

      {EXAMPLE_SLUG ? (
        <Link
          href={`/l/${EXAMPLE_SLUG}`}
          className="mt-8 flex w-full max-w-sm flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-10 transition-colors hover:border-zinc-600"
        >
          <span className="text-lg font-medium">{EXAMPLE_NAME}&apos;s Library</span>
          <span className="text-sm text-zinc-500">Walk through it &rarr;</span>
        </Link>
      ) : (
        <p className="mt-4 max-w-md text-sm text-zinc-500">
          No example library is set yet. Publish your own from{" "}
          <Link href="/create" className="underline hover:text-zinc-300">
            /create
          </Link>
          , then set the <code className="text-zinc-400">BROWSE_EXAMPLE_SLUG</code> environment variable to feature
          it here.
        </p>
      )}
    </div>
  );
}
