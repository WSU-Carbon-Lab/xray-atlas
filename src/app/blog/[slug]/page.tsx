import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { notFound } from "next/navigation";
import type { MDXComponents } from "mdx/types";
import { cn } from "@heroui/styles";
import { CopyLinkButton } from "~/components/blog/copy-link-button";
import { BlogPostTagChips } from "~/components/blog/blog-post-tag-chips";
import { MdxArticle } from "~/components/content/mdx-article";
import {
  blogCategoryHref,
  blogCategoryRssHref,
  getBlogCategory,
} from "~/lib/content/blog-categories";
import {
  getBlogEntries,
  getBlogEntryBySlug,
  isBlogTeaser,
  isListableBlogEntry,
  type BlogEntry,
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
        "text-foreground mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight",
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
        "text-foreground mt-8 scroll-mt-24 text-xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h3>
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

function publishedEntriesFrom(entries: BlogEntry[]): BlogEntry[] {
  return entries.filter(isListableBlogEntry);
}

function adjacentPostsInCategory(
  entries: BlogEntry[],
  slug: string,
  category: BlogFrontmatter["category"],
): {
  previous?: { slug: string; title: string };
  next?: { slug: string; title: string };
} {
  const published = publishedEntriesFrom(entries).filter(
    (entry) => entry.frontmatter.category === category,
  );
  const index = published.findIndex((entry) => entry.slug === slug);
  if (index === -1) {
    return {};
  }
  return {
    previous: published[index + 1]
      ? {
          slug: published[index + 1]!.slug,
          title: published[index + 1]!.frontmatter.title,
        }
      : undefined,
    next: published[index - 1]
      ? {
          slug: published[index - 1]!.slug,
          title: published[index - 1]!.frontmatter.title,
        }
      : undefined,
  };
}

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

function BlogTableOfContents({
  headings,
}: {
  headings: ReturnType<typeof extractHeadings>;
}): ReactElement | null {
  const sectionHeadings = headings.filter((heading) => heading.level === 2);
  if (sectionHeadings.length < 3) {
    return null;
  }

  return (
    <details className="border-border bg-surface mb-8 rounded-xl border px-4 py-3">
      <summary className="text-foreground cursor-pointer text-sm font-medium">
        On this page
      </summary>
      <nav aria-label="Table of contents" className="mt-3">
        <ul className="space-y-2 text-sm">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={heading.level === 3 ? "ml-4" : undefined}
            >
              <a
                href={`#${heading.id}`}
                className="text-muted hover:text-accent no-underline transition-colors"
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
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
 * Builds static params for every non-draft blog MDX entry.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const entries = await getBlogEntries();
  return publishedEntriesFrom(entries).map((entry) => ({ slug: entry.slug }));
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

  if (isBlogTeaser(entry.frontmatter.teaser)) {
    notFound();
  }

  const category = getBlogCategory(entry.frontmatter.category);
  const headings = extractHeadings(entry.body);
  const minutes = readingTimeMinutes(entry.body);
  const { previous, next } = adjacentPostsInCategory(
    entries,
    entry.slug,
    entry.frontmatter.category,
  );
  const authorLabel = entry.frontmatter.authors.join(", ");

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <nav aria-label="Breadcrumb" className="text-muted mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/blog" className="hover:text-accent no-underline">
              Blog
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            {category ? (
              <Link
                href={blogCategoryHref(category.slug)}
                className="text-foreground hover:text-accent no-underline"
              >
                {category.label}
              </Link>
            ) : (
              <span className="text-foreground">{entry.frontmatter.category}</span>
            )}
          </li>
        </ol>
      </nav>

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
          <span>{authorLabel}</span>
          <span aria-hidden>·</span>
          <span>{minutes} min read</span>
          <span aria-hidden>·</span>
          <CopyLinkButton />
        </div>
        <BlogPostTagChips tags={entry.frontmatter.tags} />
      </header>

      <BlogHeroImage frontmatter={entry.frontmatter} />
      <BlogTableOfContents headings={headings} />

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
            <PostNavLink direction="next" slug={next.slug} title={next.title} />
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
