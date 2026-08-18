"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-24 text-center text-zinc-50">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        An unexpected error occurred. You can try again, or head back to the homepage.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="rounded-full bg-zinc-50 px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
