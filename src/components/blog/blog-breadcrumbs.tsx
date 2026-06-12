import Link from "next/link";
import type { ReactElement } from "react";
import {
  blogCategoryHref,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";

interface BlogBreadcrumbsProps {
  categoryLabel: string;
  categorySlug?: BlogCategorySlug;
  /** When false, renders the category as the current page without a link. */
  linkCategory?: boolean;
}

/**
 * Renders `Blog / {category}` navigation for blog index descendants.
 *
 * The Blog segment always links to `/blog`. The category segment links to the
 * category index when `linkCategory` is true (post pages); otherwise it renders
 * as the active page label (category index pages).
 */
export function BlogBreadcrumbs({
  categoryLabel,
  categorySlug,
  linkCategory = true,
}: BlogBreadcrumbsProps): ReactElement {
  const showCategoryLink =
    linkCategory && categorySlug !== undefined;

  return (
    <nav aria-label="Breadcrumb" className="text-muted mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/blog" className="hover:text-accent no-underline">
            Blog
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          {showCategoryLink ? (
            <Link
              href={blogCategoryHref(categorySlug)}
              className="text-foreground hover:text-accent no-underline"
            >
              {categoryLabel}
            </Link>
          ) : (
            <span className="text-foreground">{categoryLabel}</span>
          )}
        </li>
      </ol>
    </nav>
  );
}
