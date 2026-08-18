import { ImageResponse } from "next/og";
import { getLibrary } from "@/lib/store";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manifest = await getLibrary(slug);
  const displayName = manifest?.displayName ?? "A Library";
  const bookCount = manifest?.books.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #12100d 0%, #241a10 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 8, color: "#c6a05c", textTransform: "uppercase" }}>
          Bookwalk
        </div>
        <div style={{ marginTop: 28, fontSize: 64, color: "#f3e7d6", fontStyle: "italic" }}>
          {`${displayName}'s Library`}
        </div>
        <div style={{ marginTop: 20, fontSize: 28, color: "#c9b299" }}>
          {`${bookCount} books, walkable in 3D`}
        </div>
      </div>
    ),
    { ...size }
  );
}
