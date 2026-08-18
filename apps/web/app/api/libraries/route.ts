import { NextRequest, NextResponse } from "next/server";
import { ManifestSchema } from "@bw/manifest";
import {
  publishLibrary,
  checkPublishRateLimit,
  ManifestTooLargeError,
  PublishLimitError,
} from "@/lib/store";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  try {
    await checkPublishRateLimit(ip);
  } catch (err) {
    if (err instanceof PublishLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ManifestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That doesn't look like a valid library manifest.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const { slug, editToken } = await publishLibrary(parsed.data);
    return NextResponse.json({ slug, editToken }, { status: 201 });
  } catch (err) {
    if (err instanceof ManifestTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    throw err;
  }
}
