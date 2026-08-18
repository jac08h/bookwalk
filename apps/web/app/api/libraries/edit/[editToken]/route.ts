import { NextRequest, NextResponse } from "next/server";
import { ManifestSchema } from "@bw/manifest";
import {
  updateLibrary,
  deleteLibraryByEditToken,
  InvalidEditTokenError,
  LibraryNotFoundError,
  ManifestTooLargeError,
} from "@/lib/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ editToken: string }> }
) {
  const { editToken } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const bodyObj = (body ?? {}) as { manifest?: unknown; presetId?: unknown };
  let manifest;
  if (bodyObj.manifest !== undefined) {
    const parsed = ManifestSchema.safeParse(bodyObj.manifest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "That doesn't look like a valid library manifest.", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    manifest = parsed.data;
  }
  const presetId = typeof bodyObj.presetId === "string" ? bodyObj.presetId : undefined;

  try {
    const { slug } = await updateLibrary(editToken, { manifest, presetId });
    return NextResponse.json({ slug });
  } catch (err) {
    if (err instanceof InvalidEditTokenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof LibraryNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ManifestTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ editToken: string }> }
) {
  const { editToken } = await params;
  try {
    const { slug } = await deleteLibraryByEditToken(editToken);
    return NextResponse.json({ slug });
  } catch (err) {
    if (err instanceof InvalidEditTokenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
