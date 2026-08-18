import { NextRequest, NextResponse } from "next/server";
import { getLibrary } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manifest = await getLibrary(slug);
  if (!manifest) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=3600",
    },
  });
}
