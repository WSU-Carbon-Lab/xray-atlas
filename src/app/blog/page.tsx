import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { getBlogEntries } from "~/lib/content/blog-loader";

export const metadata: Metadata = {
  title: "Blog",
  description: "Announcements and engineering notes from the X-ray Atlas team.",
};

function formatBlogDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Static blog index listing every published post newest first.
 */
export default async function BlogIndexPage(): Promise<ReactElement> {
  const entries = await getBlogEntries();
  const published = entries.filter((entry) => !entry.frontmatter.draft);

  return (
    <div className="mx-auto w-full max-w-3xl py-10">
      <header className="mb-8 space-y-2">
        <h1 className="text-foreground text-4xl font-bold">Blog</h1>
        <p className="text-muted text-lg">
          Announcements and engineering notes from the X-ray Atlas team.
        </p>
      </header>

      {published.length === 0 ? (
        <p className="text-muted">No posts yet.</p>
      ) : (
        <ul className="space-y-4">
          {published.map((entry) => (
            <li
              key={entry.slug}
              className="border-border bg-surface rounded-lg border p-5"
            >
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  href={`/blog/${entry.slug}`}
                  className="text-foreground hover:text-accent text-xl font-semibold no-underline hover:underline"
                >
                  {entry.frontmatter.title}
                </Link>
                <time
                  dateTime={entry.frontmatter.date}
                  className="text-muted text-sm"
                >
                  {formatBlogDate(entry.frontmatter.date)}
                </time>
              </div>
              <p className="text-muted mb-3 text-sm">
                {entry.frontmatter.description}
              </p>
              {entry.frontmatter.tags.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {entry.frontmatter.tags.map((tag) => (
                    <li
                      key={tag}
                      className="border-border bg-background text-muted rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
