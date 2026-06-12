import { ImageResponse } from "next/og";
import { site } from "~/app/brand";
import { blogOgTilePalette } from "~/lib/content/blog-og-palette";

export const alt = `${site.name} Blog`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Open Graph image for the blog index.
 */
export default function BlogIndexOpenGraphImage(): ImageResponse {
  const { primary, secondary } = blogOgTilePalette("blog-index");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        color: "white",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          fontSize: 28,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          opacity: 0.9,
        }}
      >
        Announcements
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.05 }}>
          Blog
        </div>
        <div style={{ fontSize: 30, opacity: 0.92, maxWidth: 760 }}>
          Engineering notes and updates from the X-ray Atlas team.
        </div>
      </div>
      <div style={{ fontSize: 34, fontWeight: 600 }}>{site.name}</div>
    </div>,
    size,
  );
}
