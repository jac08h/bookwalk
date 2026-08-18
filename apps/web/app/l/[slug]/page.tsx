import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLibrary, incrementViewCount } from "@/lib/store";
import { LibraryViewer } from "./LibraryViewer";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const manifest = await getLibrary(slug);
  if (!manifest) return { title: "Library not found" };
  return {
    title: `${manifest.displayName}'s Library — Bookwalk`,
    description: `Walk through a library of ${manifest.books.length} books.`,
  };
}

export default async function LibraryPage({ params }: Props) {
  const { slug } = await params;
  const manifest = await getLibrary(slug);

  if (!manifest) {
    notFound();
  }

  void incrementViewCount(slug);

  return <LibraryViewer manifest={manifest} />;
}
