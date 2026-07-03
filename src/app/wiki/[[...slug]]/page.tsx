import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { MdxArticle } from "~/components/content/mdx-article";
import { getWikiEntries, getWikiEntryBySlug } from "~/lib/content/wiki-loader";

interface WikiCatchAllPageProps {
  params: Promise<{ slug?: string[] }>;
}

export const revalidate = 3600;

/**
 * Builds static params for every non-draft wiki MDX entry, including the wiki index at `/wiki`.
 */
export async function generateStaticParams(): Promise<{ slug?: string[] }[]> {
  const entries = await getWikiEntries();
  return entries
    .filter((entry) => !entry.frontmatter.draft)
    .map((entry) => {
      const segments = entry.slug.split("/").filter(Boolean);
      return segments.length === 0 ? { slug: [] } : { slug: segments };
    });
}

/**
 * Supplies page metadata from wiki MDX frontmatter for the resolved slug.
 */
export async function generateMetadata({
  params,
}: WikiCatchAllPageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = slug?.join("/") ?? "";
  const entry = await getWikiEntryBySlug(slugPath);

  if (!entry) {
    return {};
  }

  const canonical = entry.slug.length === 0 ? "/wiki" : `/wiki/${entry.slug}`;

  return {
    title: entry.frontmatter.title,
    description: entry.frontmatter.description,
    alternates: {
      canonical,
    },
  };
}

/**
 * Optional catch-all wiki route that renders MDX content from `content/wiki`.
 *
 * Resolves `/wiki` from `content/wiki/index.mdx` and nested paths from sibling MDX files.
 * Static TSX routes under `src/app/wiki` take precedence. Draft entries are excluded from
 * static generation and return 404 in production.
 */
export default async function WikiCatchAllPage({
  params,
}: WikiCatchAllPageProps): Promise<ReactElement> {
  const { slug } = await params;
  const slugPath = slug?.join("/") ?? "";
  const entry = await getWikiEntryBySlug(slugPath);

  if (!entry) {
    notFound();
  }

  if (entry.frontmatter.draft && process.env.NODE_ENV === "production") {
    notFound();
  }

  return <MdxArticle source={entry.body} />;
}
