import Link from "next/link";
import type { ReactElement } from "react";
import { ResearcherAvatar } from "~/components/ui/avatar";
import {
  blogAuthorProfileHref,
  resolveBlogAuthors,
} from "~/lib/content/blog-authors";

function BlogAuthorName({
  name,
  href,
}: {
  name: string;
  href?: string;
}): ReactElement {
  if (href) {
    return (
      <Link
        href={href}
        className="text-foreground hover:text-accent no-underline"
      >
        {name}
      </Link>
    );
  }
  return <span>{name}</span>;
}

/**
 * Renders stacked author avatars and linked names for a blog post byline.
 */
export function BlogAuthorByline({
  authors,
  size = "sm",
}: {
  authors: string[];
  size?: "sm" | "md";
}): ReactElement {
  const profiles = resolveBlogAuthors(authors);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center -space-x-2">
        {profiles.map((author) => (
          <ResearcherAvatar
            key={author.name}
            displayName={author.name}
            imageUrl={author.avatarUrl ?? null}
            identitySeed={author.userId ?? author.orcid ?? author.name}
            isAtlasProfile={Boolean(author.userId ?? author.orcid)}
            size={size}
            className="ring-background ring-2"
          />
        ))}
      </span>
      <span className="inline-flex flex-wrap items-center gap-x-1">
        {profiles.map((author, index) => {
          const href = blogAuthorProfileHref(author);
          return (
            <span
              key={author.name}
              className="inline-flex items-center gap-x-1"
            >
              {index > 0 ? <span aria-hidden>, </span> : null}
              <BlogAuthorName name={author.name} href={href} />
            </span>
          );
        })}
      </span>
    </span>
  );
}

/**
 * Compact author row for featured cards: miniature avatar plus linked name.
 */
export function BlogFeaturedAuthor({
  authors,
}: {
  authors: string[];
}): ReactElement {
  const [primary, ...rest] = resolveBlogAuthors(authors);
  if (!primary) {
    return <span />;
  }

  const href = blogAuthorProfileHref(primary);
  const label =
    rest.length > 0 ? `${primary.name} + ${rest.length}` : primary.name;

  return (
    <span className="text-muted inline-flex items-center gap-2 text-sm">
      <ResearcherAvatar
        displayName={primary.name}
        imageUrl={primary.avatarUrl ?? null}
        identitySeed={primary.userId ?? primary.orcid ?? primary.name}
        isAtlasProfile={Boolean(primary.userId ?? primary.orcid)}
        size="sm"
      />
      {href ? (
        <Link href={href} className="hover:text-accent no-underline">
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}
