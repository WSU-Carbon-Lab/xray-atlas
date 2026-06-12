import { cn } from "@heroui/styles";
import type { ReactElement } from "react";
import type { BlogHeading } from "~/lib/content/blog-presentation";

function BlogTocNav({
  headings,
  className,
}: {
  headings: BlogHeading[];
  className?: string;
}): ReactElement {
  return (
    <nav aria-label="Table of contents" className={className}>
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
  );
}

/**
 * Renders blog table of contents in compact (details) or sticky rail layouts.
 *
 * Returns null when fewer than three h2 headings exist.
 */
export function BlogTableOfContents({
  headings,
  variant,
}: {
  headings: BlogHeading[];
  variant: "inline" | "rail";
}): ReactElement | null {
  const sectionHeadings = headings.filter((heading) => heading.level === 2);
  if (sectionHeadings.length < 3) {
    return null;
  }

  if (variant === "rail") {
    return (
      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <p className="text-foreground mb-3 text-sm font-medium">
            On this page
          </p>
          <BlogTocNav headings={headings} />
        </div>
      </aside>
    );
  }

  return (
    <details className="border-border bg-surface mb-8 rounded-xl border px-4 py-3 xl:hidden">
      <summary className="text-foreground cursor-pointer text-sm font-medium">
        On this page
      </summary>
      <BlogTocNav headings={headings} className="mt-3" />
    </details>
  );
}
