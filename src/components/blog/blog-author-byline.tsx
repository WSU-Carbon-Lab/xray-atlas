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
        {profiles.map((author) => {
          const isAtlasProfile = Boolean(author.userId ?? author.orcid);
          return (
            <ResearcherAvatar
              key={author.name}
              displayName={author.name}
              imageUrl={author.avatarUrl ?? null}
              identitySeed={author.userId ?? author.orcid ?? author.name}
              isAtlasProfile={isAtlasProfile}
              placeholder={isAtlasProfile ? "initials" : "person"}
              size={size}
              className="ring-background ring-2"
            />
          );
        })}
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
 * Compact author row for featured cards: miniature avatar plus optional linked name.
 */
export function BlogFeaturedAuthor({
  authors,
  linkable = true,
}: {
  authors: string[];
  linkable?: boolean;
}): ReactElement {
  const [primary, ...rest] = resolveBlogAuthors(authors);
  if (!primary) {
    return <span />;
  }

  const href = linkable ? blogAuthorProfileHref(primary) : undefined;
  const label =
    rest.length > 0 ? `${primary.name} + ${rest.length}` : primary.name;
  const isAtlasProfile = Boolean(primary.userId ?? primary.orcid);

  return (
    <span className="text-muted inline-flex items-center gap-2 text-sm">
      <ResearcherAvatar
        displayName={primary.name}
        imageUrl={primary.avatarUrl ?? null}
        identitySeed={primary.userId ?? primary.orcid ?? primary.name}
        isAtlasProfile={isAtlasProfile}
        placeholder={isAtlasProfile ? "initials" : "person"}
        size="sm"
      />
      <BlogAuthorName name={label} href={href} />
    </span>
  );
}
