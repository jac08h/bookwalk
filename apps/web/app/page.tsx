import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-24 text-zinc-50">
      <div className="flex max-w-2xl flex-col items-center text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Bookwalk
        </h1>
        <p className="mt-4 max-w-lg text-lg text-zinc-400">
          Turn a StoryGraph export into a walkable first-person 3D library —
          your reading history, shelved by year, with a room you can share.
        </p>
        <div className="mt-12 flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/create"
            className="flex h-14 w-full items-center justify-center rounded-full bg-zinc-50 px-8 text-base font-medium text-zinc-950 transition-colors hover:bg-zinc-200 sm:w-auto"
          >
            Create your own
          </Link>
          <Link
            href="/browse"
            className="flex h-14 w-full items-center justify-center rounded-full border border-zinc-700 px-8 text-base font-medium text-zinc-50 transition-colors hover:border-zinc-500 sm:w-auto"
          >
            Browse existing
          </Link>
        </div>
      </div>
    </div>
  );
}
