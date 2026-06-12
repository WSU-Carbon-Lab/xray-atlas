import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { BlogTile } from "~/components/blog/blog-tile";
import { getBlogEntries, type BlogEntry } from "~/lib/content/blog-loader";
import {
  formatBlogDate,
  resolveBlogHeroImageUrl,
} from "~/lib/content/blog-presentation";

export const metadata: Metadata = {
  title: "Blog",
  description: "Announcements and engineering notes from the X-ray Atlas team.",
};

function BlogPostImage({
  entry,
  className,
}: {
  entry: BlogEntry;
  className?: string;
}): ReactElement {
  if (entry.frontmatter.heroImage) {
    const src = resolveBlogHeroImageUrl(entry.frontmatter.heroImage);
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <BlogTile
      slug={entry.slug}
      title={entry.frontmatter.title}
      className={className}
    />
  );
}

function FeaturedPostCard({ entry }: { entry: BlogEntry }): ReactElement {
  return (
    <article className="border-border bg-surface overflow-hidden rounded-2xl border">
      <Link
        href={`/blog/${entry.slug}`}
        className="grid no-underline lg:grid-cols-2"
      >
        <div className="relative min-h-52 overflow-hidden lg:min-h-full">
          <BlogPostImage
            entry={entry}
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-accent font-semibold tracking-[0.16em] uppercase">
              {entry.frontmatter.category}
            </span>
            <time dateTime={entry.frontmatter.date} className="text-muted">
              {formatBlogDate(entry.frontmatter.date, { relative: true })}
            </time>
          </div>
          <h2 className="font-display text-foreground text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {entry.frontmatter.title}
          </h2>
          <p className="text-muted text-base leading-7">
            {entry.frontmatter.description}
          </p>
          <span className="text-accent text-sm font-medium">Read post</span>
        </div>
      </Link>
    </article>
  );
}

function GridPostCard({ entry }: { entry: BlogEntry }): ReactElement {
  return (
    <article className="border-border bg-surface overflow-hidden rounded-xl border">
      <Link href={`/blog/${entry.slug}`} className="block no-underline">
        <div className="aspect-[16/10] overflow-hidden">
          <BlogPostImage entry={entry} className="h-full w-full" />
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-accent font-semibold tracking-[0.14em] uppercase">
              {entry.frontmatter.category}
            </span>
            <time dateTime={entry.frontmatter.date} className="text-muted">
              {formatBlogDate(entry.frontmatter.date, { relative: true })}
            </time>
          </div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            {entry.frontmatter.title}
          </h2>
          <p className="text-muted line-clamp-3 text-sm leading-6">
            {entry.frontmatter.description}
          </p>
        </div>
      </Link>
    </article>
  );
}

/**
 * Static blog index with a featured newest post and a grid of remaining entries.
 */
export default async function BlogIndexPage(): Promise<ReactElement> {
  const entries = await getBlogEntries();
  const published = entries.filter((entry) => !entry.frontmatter.draft);
  const [featured, ...rest] = published;

  return (
    <div className="mx-auto w-full max-w-5xl py-10">
      <header className="mb-10 max-w-2xl space-y-3">
        <h1 className="text-foreground text-4xl font-bold tracking-tight">
          Blog
        </h1>
        <p className="text-muted text-lg leading-8">
          Announcements and engineering notes from the X-ray Atlas team.
        </p>
      </header>

      {published.length === 0 ? (
        <p className="text-muted">No posts yet.</p>
      ) : (
        <div className="space-y-10">
          {featured ? <FeaturedPostCard entry={featured} /> : null}
          {rest.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {rest.map((entry) => (
                <GridPostCard key={entry.slug} entry={entry} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
