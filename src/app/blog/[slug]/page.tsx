import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { MdxArticle } from "~/components/content/mdx-article";
import { getBlogEntries, getBlogEntryBySlug } from "~/lib/content/blog-loader";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

function formatBlogDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Builds static params for every non-draft blog MDX entry.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const entries = await getBlogEntries();
  return entries
    .filter((entry) => !entry.frontmatter.draft)
    .map((entry) => ({ slug: entry.slug }));
}

/**
 * Supplies page metadata from blog MDX frontmatter for the resolved slug.
 */
export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getBlogEntryBySlug(slug);

  if (!entry) {
    return {};
  }

  return {
    title: entry.frontmatter.title,
    description: entry.frontmatter.description,
    alternates: {
      canonical: `/blog/${entry.slug}`,
    },
  };
}

/**
 * Renders one blog post from `content/blog` with byline metadata and MDX body.
 *
 * Draft entries render in development and return 404 in production.
 */
export default async function BlogPostPage({
  params,
}: BlogPostPageProps): Promise<ReactElement> {
  const { slug } = await params;
  const entry = await getBlogEntryBySlug(slug);

  if (!entry) {
    notFound();
  }

  if (entry.frontmatter.draft && process.env.NODE_ENV === "production") {
    notFound();
  }

  const authorLabel = entry.frontmatter.authors.join(", ");

  return (
    <div className="mx-auto w-full max-w-3xl py-10">
      <p className="text-muted mb-6 text-sm">
        <time dateTime={entry.frontmatter.date}>
          {formatBlogDate(entry.frontmatter.date)}
        </time>
        <span aria-hidden> · </span>
        <span>{authorLabel}</span>
      </p>
      <MdxArticle source={entry.body} />
    </div>
  );
}
