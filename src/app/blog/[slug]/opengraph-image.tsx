import { ImageResponse } from "next/og";
import { site } from "~/app/brand";
import { getBlogCategory } from "~/lib/content/blog-categories";
import {
  getBlogEntries,
  getBlogEntryBySlug,
  isListableBlogEntry,
} from "~/lib/content/blog-loader";
import { blogOgTilePalette } from "~/lib/content/blog-og-palette";

export const alt = "Blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface BlogPostOpenGraphImageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Emits static params for listable blog posts only.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const entries = await getBlogEntries();
  return entries
    .filter(isListableBlogEntry)
    .map((entry) => ({ slug: entry.slug }));
}

/**
 * Open Graph image for one blog post.
 */
export default async function BlogPostOpenGraphImage({
  params,
}: BlogPostOpenGraphImageProps): Promise<ImageResponse> {
  const { slug } = await params;
  const entry = await getBlogEntryBySlug(slug);

  if (!entry || !isListableBlogEntry(entry)) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          color: "white",
          fontSize: 48,
          fontFamily: "Georgia, serif",
        }}
      >
        {site.name}
      </div>,
      size,
    );
  }

  const category = getBlogCategory(entry.frontmatter.category);
  const kicker = category?.kicker ?? entry.frontmatter.category;
  const { primary, secondary } = blogOgTilePalette(entry.slug);

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
        {kicker}
      </div>
      <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.08 }}>
        {entry.frontmatter.title}
      </div>
      <div style={{ fontSize: 34, fontWeight: 600 }}>{site.name}</div>
    </div>,
    size,
  );
}
