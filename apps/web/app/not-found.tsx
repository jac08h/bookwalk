import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-24 text-center text-zinc-50">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        There&apos;s nothing at this address — the library you&apos;re looking for may have been removed or never
        existed.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-zinc-50 px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
      >
        Go home
      </Link>
    </div>
  );
}
