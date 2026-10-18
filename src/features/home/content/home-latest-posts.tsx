import type { ReactElement } from "react";
import Link from "next/link";
import { BlogPostImage } from "~/components/blog/blog-post-cards";
import {
  getBlogFrontmatterIndex,
  isListableBlogEntry,
  type BlogFrontmatterIndexEntry,
} from "~/lib/content/blog-loader";

const cardLinkClass =
  "border-border bg-surface focus-visible:ring-accent/50 flex h-full flex-row items-stretch overflow-hidden rounded-3xl border no-underline transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/50 focus-visible:ring-2 focus-visible:outline-none";

function HomeBlogCard({
  entry,
  featured,
}: {
  entry: BlogFrontmatterIndexEntry;
  featured?: boolean;
}): ReactElement {
  return (
    <Link
      href={`/blog/${entry.slug}`}
      className={featured ? `${cardLinkClass} min-h-48` : cardLinkClass}
    >
      <div className="relative w-28 shrink-0 self-stretch sm:w-36">
        <BlogPostImage
          entry={entry}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3 sm:px-5">
        <span className="home-kicker">{entry.frontmatter.category}</span>
        <span
          className={
            featured
              ? "font-display text-foreground block text-2xl font-semibold"
              : "text-foreground block font-semibold"
          }
        >
          {entry.frontmatter.title}
        </span>
        {featured ? (
          <span className="text-muted block text-sm leading-6">
            {entry.frontmatter.description}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

/** Newest three listable blog posts: one featured, two compact, each with the blog tile. */
export async function HomeLatestPosts(): Promise<ReactElement | null> {
  const index = await getBlogFrontmatterIndex();
  const posts = index.filter((e) => isListableBlogEntry(e)).slice(0, 3);
  const [lead, ...rest] = posts;
  if (!lead) return null;
  return (
    <section aria-labelledby="home-blog" className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2
          id="home-blog"
          className="font-display text-foreground text-2xl font-semibold"
        >
          From the blog
        </h2>
        <Link href="/blog" className="text-accent text-sm">
          All posts
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <HomeBlogCard entry={lead} featured />
        <div className="grid gap-4">
          {rest.map((p) => (
            <HomeBlogCard key={p.slug} entry={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
