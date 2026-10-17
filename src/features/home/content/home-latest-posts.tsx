import type { ReactElement } from "react";
import Link from "next/link";
import {
  getBlogFrontmatterIndex,
  isListableBlogEntry,
} from "~/lib/content/blog-loader";

/** Newest three listable blog posts: one featured, two compact. */
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
        <Link href={`/blog/${lead.slug}`} className="home-tile min-h-48">
          <span className="home-kicker">{lead.frontmatter.category}</span>
          <span className="font-display text-foreground text-2xl font-semibold">
            {lead.frontmatter.title}
          </span>
          <span className="text-muted text-sm leading-6">
            {lead.frontmatter.description}
          </span>
        </Link>
        <div className="grid gap-4">
          {rest.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="home-tile home-tile--compact"
            >
              <span className="home-kicker">{p.frontmatter.category}</span>
              <span className="text-foreground font-semibold">
                {p.frontmatter.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
