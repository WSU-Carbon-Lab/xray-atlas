import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { notFound } from "next/navigation";
import type { MDXComponents } from "mdx/types";
import { cn } from "@heroui/styles";
import { BlogAuthorByline } from "~/components/blog/blog-author-byline";
import {
  BlogBreadcrumbs,
  blogPostBreadcrumbItems,
} from "~/components/blog/blog-breadcrumbs";
import { BlogRelatedPosts } from "~/components/blog/blog-related-posts";
import { BlogSeriesBox } from "~/components/blog/blog-series-box";
import { BlogTableOfContents } from "~/components/blog/blog-toc";
import { CopyLinkButton } from "~/components/blog/copy-link-button";
import { BlogPostTagChips } from "~/components/blog/blog-post-tag-chips";
import { MdxArticle } from "~/components/content/mdx-article";
import {
  blogCategoryRssHref,
  getBlogCategory,
} from "~/lib/content/blog-categories";
import { relatedBlogPosts } from "~/lib/content/blog-related";
import {
  adjacentBlogPosts,
  blogSeriesPartRows,
} from "~/lib/content/blog-series";
import {
  getBlogEntries,
  getBlogEntryBySlug,
  isListableBlogEntry,
} from "~/lib/content/blog-loader";
import {
  extractHeadings,
  formatBlogDate,
  readingTimeMinutes,
  resolveBlogHeroImageUrl,
} from "~/lib/content/blog-presentation";
import type { BlogFrontmatter } from "~/lib/content/schema";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

const blogMdxComponents: MDXComponents = {
  img: ({ src, alt, className, ...props }: ComponentPropsWithoutRef<"img">) => {
    const imageSrc = typeof src === "string" ? src : undefined;
    if (!imageSrc) {
      return null;
    }
    const imageAlt = typeof alt === "string" ? alt : "";
    return (
      <figure className="my-8 space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={imageAlt}
          className={cn(
            "border-border w-full rounded-xl border object-cover",
            className,
          )}
          {...props}
        />
        {imageAlt ? (
          <figcaption className="text-muted text-center text-sm">
            {imageAlt}
          </figcaption>
        ) : null}
      </figure>
    );
  },
  h1: ({ children, className, ...props }) => (
    <h1
      {...props}
      className={cn(
        "font-display text-foreground mt-10 scroll-mt-24 text-3xl font-semibold tracking-tight first:mt-0",
        className,
      )}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2
      {...props}
      className={cn(
        "font-display text-foreground mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3
      {...props}
      className={cn(
        "font-display text-foreground mt-8 scroll-mt-24 text-xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }) => (
    <h4
      {...props}
      className={cn(
        "font-display text-foreground mt-6 scroll-mt-24 text-lg font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }) => (
    <h5
      {...props}
      className={cn(
        "font-display text-foreground mt-6 scroll-mt-24 text-base font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }) => (
    <h6
      {...props}
      className={cn(
        "font-display text-muted mt-6 scroll-mt-24 text-sm font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
    </h6>
  ),
  p: ({ children, className, ...props }) => (
    <p
      {...props}
      className={cn("text-muted text-[1.05rem] leading-8", className)}
    >
      {children}
    </p>
  ),
};

function PostNavLink({
  direction,
  slug,
  title,
}: {
  direction: "previous" | "next";
  slug: string;
  title: string;
}): ReactElement {
  const label = direction === "previous" ? "Previous" : "Next";
  return (
    <Link
      href={`/blog/${slug}`}
      className="border-border hover:border-accent/40 group block rounded-xl border p-4 no-underline transition-colors"
    >
      <span className="text-muted text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="text-foreground group-hover:text-accent mt-1 block text-base font-semibold">
        {title}
      </span>
    </Link>
  );
}

function BlogHeroImage({
  frontmatter,
}: {
  frontmatter: BlogFrontmatter;
}): ReactElement | null {
  if (!frontmatter.heroImage) {
    return null;
  }

  const src = resolveBlogHeroImageUrl(frontmatter.heroImage);
  return (
    <figure className="mb-10 overflow-hidden rounded-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="aspect-[16/9] w-full object-cover" />
    </figure>
  );
}

/**
 * Builds static params for every listable blog MDX entry.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const entries = await getBlogEntries();
  return entries
    .filter(isListableBlogEntry)
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

  if (!entry || !isListableBlogEntry(entry)) {
    return {};
  }

  const category = getBlogCategory(entry.frontmatter.category);

  return {
    title: entry.frontmatter.title,
    description: entry.frontmatter.description,
    alternates: {
      canonical: `/blog/${entry.slug}`,
      types: {
        "application/rss+xml": [
          { url: "/blog/rss.xml", title: "X-ray Atlas Blog" },
          ...(category
            ? [
                {
                  url: blogCategoryRssHref(category.slug),
                  title: `X-ray Atlas Blog — ${category.label}`,
                },
              ]
            : []),
        ],
      },
    },
  };
}

/**
 * Renders one blog post with editorial header chrome, optional hero, TOC, and MDX body.
 */
export default async function BlogPostPage({
  params,
}: BlogPostPageProps): Promise<ReactElement> {
  const { slug } = await params;
  const [entry, entries] = await Promise.all([
    getBlogEntryBySlug(slug),
    getBlogEntries(),
  ]);

  if (!entry) {
    notFound();
  }

  if (entry.frontmatter.draft && process.env.NODE_ENV === "production") {
    notFound();
  }

  if (!isListableBlogEntry(entry) && process.env.NODE_ENV === "production") {
    notFound();
  }

  const category = getBlogCategory(entry.frontmatter.category);
  const headings = extractHeadings(entry.body);
  const minutes = readingTimeMinutes(entry.body);
  const { previous, next } = adjacentBlogPosts(
    entries,
    entry.slug,
    entry.frontmatter,
  );
  const seriesParts = blogSeriesPartRows(entries, entry);
  const related = relatedBlogPosts(entries, entry);
  const breadcrumbItems = category
    ? blogPostBreadcrumbItems({
        categoryLabel: category.label,
        categorySlug: category.slug,
        postTitle: entry.frontmatter.title,
      })
    : [{ label: entry.frontmatter.title }];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 xl:px-6">
      <div className="flex items-start gap-10 xl:gap-12">
        <div className="mx-auto w-full min-w-0 max-w-2xl xl:mx-0 xl:flex-1">
          <BlogBreadcrumbs items={breadcrumbItems} />

          <header className="mb-8 space-y-4">
            <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">
              {category?.kicker ?? entry.frontmatter.category}
            </p>
            <h1 className="font-display text-foreground text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              {entry.frontmatter.title}
            </h1>
            <div className="text-muted flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
              <time dateTime={entry.frontmatter.date}>
                {formatBlogDate(entry.frontmatter.date)}
              </time>
              <span aria-hidden>·</span>
              <BlogAuthorByline authors={entry.frontmatter.authors} />
              <span aria-hidden>·</span>
              <span>{minutes} min read</span>
              <span aria-hidden>·</span>
              <CopyLinkButton />
            </div>
            <BlogPostTagChips tags={entry.frontmatter.tags} />
          </header>

          <BlogHeroImage frontmatter={entry.frontmatter} />
            {entry.frontmatter.series ? (
              <BlogSeriesBox
                seriesName={entry.frontmatter.series.name}
                parts={seriesParts}
              />
            ) : null}
            <BlogTableOfContents headings={headings} variant="inline" />

            <MdxArticle
              source={entry.body}
              components={blogMdxComponents}
              className="max-w-2xl"
            />

            {previous || next ? (
              <nav
                aria-label="Post pagination"
                className="border-border mt-12 grid gap-4 border-t pt-8 sm:grid-cols-2"
              >
                {previous ? (
                  <PostNavLink
                    direction="previous"
                    slug={previous.slug}
                    title={previous.title}
                  />
                ) : (
                  <span />
                )}
                {next ? (
                  <PostNavLink
                    direction="next"
                    slug={next.slug}
                    title={next.title}
                  />
                ) : null}
              </nav>
            ) : null}

            <BlogRelatedPosts posts={related} />
          </div>

          <div className="hidden w-56 shrink-0 xl:block">
            <BlogTableOfContents headings={headings} variant="rail" />
          </div>
        </div>
    </div>
  );
}
