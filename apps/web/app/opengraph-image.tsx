import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
        <div style={{ fontSize: 88, color: "#f3e7d6", fontStyle: "italic" }}>Bookwalk</div>
        <div style={{ marginTop: 24, fontSize: 30, color: "#c9b299", maxWidth: 800, textAlign: "center" }}>
          Turn a StoryGraph export into a walkable first-person 3D library
        </div>
      </div>
    ),
    { ...size }
  );
}
