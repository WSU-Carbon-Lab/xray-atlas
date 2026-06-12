import Link from "next/link";
import type { ReactElement } from "react";
import { Breadcrumbs } from "@heroui/react";
import {
  blogCategoryHref,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";

export interface BlogBreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Renders `Home / Blog / {category} / {post}` using the shared HeroUI Breadcrumbs pattern.
 */
export function BlogBreadcrumbs({
  items,
}: {
  items: BlogBreadcrumbItem[];
}): ReactElement {
  return (
    <Breadcrumbs className="text-muted mb-6 min-w-0 text-sm font-medium">
      <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/blog">Blog</Breadcrumbs.Item>
      {items.map((item, index) => {
        const isTerminal = index === items.length - 1;
        return (
          <Breadcrumbs.Item
            key={`${item.label}-${item.href ?? "terminal"}`}
            href={!isTerminal ? item.href : undefined}
          >
            {item.label}
          </Breadcrumbs.Item>
        );
      })}
    </Breadcrumbs>
  );
}

/**
 * Builds breadcrumb items for a category index page (terminal category label).
 */
export function blogCategoryBreadcrumbItems(
  categoryLabel: string,
): BlogBreadcrumbItem[] {
  return [{ label: categoryLabel }];
}

/**
 * Builds breadcrumb items for a post page (linked category, terminal post title).
 */
export function blogPostBreadcrumbItems({
  categoryLabel,
  categorySlug,
  postTitle,
}: {
  categoryLabel: string;
  categorySlug: BlogCategorySlug;
  postTitle: string;
}): BlogBreadcrumbItem[] {
  return [
    { label: categoryLabel, href: blogCategoryHref(categorySlug) },
    { label: postTitle },
  ];
}
