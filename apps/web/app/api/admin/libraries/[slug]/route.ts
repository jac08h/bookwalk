import { NextRequest, NextResponse } from "next/server";
import { deleteLibraryBySlug } from "@/lib/store";

// D30: an admin-token delete so a library can be nuked without a deploy.
// Requires ADMIN_TOKEN to be set — if it isn't configured, the endpoint is
// closed rather than silently open.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: "Admin endpoint not configured." }, { status: 503 });
  }

  const provided = req.headers.get("x-admin-token");
  if (!provided || provided !== adminToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { slug } = await params;
  await deleteLibraryBySlug(slug);
  return NextResponse.json({ slug, deleted: true });
}
