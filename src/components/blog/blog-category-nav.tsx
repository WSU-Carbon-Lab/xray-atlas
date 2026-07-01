"use client";

import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";
import Link from "next/link";
import type { ReactElement } from "react";
import { useOptionalBlogFilter } from "~/components/blog/blog-filter-context";
import {
  BLOG_CATEGORIES,
  blogCategoryHref,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";

type BlogCategoryNavMode = "hash" | "route";

function categoryIsActive(
  slug: BlogCategorySlug,
  mode: BlogCategoryNavMode,
  activeCategory: BlogCategorySlug | null,
  hashCategories: BlogCategorySlug[],
): boolean {
  if (mode === "route") {
    return activeCategory === slug;
  }
  return hashCategories.length === 1 && hashCategories[0] === slug;
}

function anyCategoryActive(
  mode: BlogCategoryNavMode,
  activeCategory: BlogCategorySlug | null,
  hashCategories: BlogCategorySlug[],
): boolean {
  if (mode === "route") {
    return activeCategory !== null;
  }
  return hashCategories.length > 0;
}

/**
 * Category navigation for blog mastheads: hash filtering on `/blog` or route links on category pages.
 */
export function BlogCategoryNav({
  mode,
  activeCategory = null,
}: {
  mode: BlogCategoryNavMode;
  activeCategory?: BlogCategorySlug | null;
}): ReactElement {
  const filter = useOptionalBlogFilter();
  const hashCategories = filter?.state.categories ?? [];
  const showAll = anyCategoryActive(mode, activeCategory, hashCategories);

  const selectCategory = (slug: BlogCategorySlug): void => {
    if (mode !== "hash" || !filter) {
      return;
    }
    filter.applyState({
      ...filter.state,
      categories: [slug],
    });
  };

  const clearCategory = (): void => {
    if (mode !== "hash" || !filter) {
      return;
    }
    filter.applyState({
      ...filter.state,
      categories: [],
    });
  };

  return (
    <nav aria-label="Blog categories" className="space-y-0.5 md:space-y-1 md:pt-1">
      {showAll ? (
        mode === "hash" ? (
          <button
            type="button"
            onClick={clearCategory}
            className="text-muted hover:text-foreground font-display mb-1 block py-1 text-left text-lg font-normal tracking-tight transition-colors sm:text-xl"
          >
            All posts
          </button>
        ) : (
          <Link
            href="/blog"
            className="text-muted hover:text-foreground font-display mb-1 block py-1 text-lg font-normal tracking-tight no-underline transition-colors sm:text-xl"
          >
            All posts
          </Link>
        )
      ) : null}

      {BLOG_CATEGORIES.map((category) => {
        const isActive = categoryIsActive(
          category.slug,
          mode,
          activeCategory,
          hashCategories,
        );

        if (mode === "hash") {
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => selectCategory(category.slug)}
              className={cn(
                "font-display group flex w-full items-center justify-between gap-3 py-1 text-left text-3xl leading-none font-normal tracking-tight transition-colors sm:text-4xl md:text-[2rem] lg:text-5xl xl:text-6xl",
                isActive
                  ? "text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              <span>{category.label}</span>
              <ArrowRightIcon
                className={cn(
                  "size-6 shrink-0 transition-transform sm:size-7 md:size-7 lg:size-8 xl:size-10",
                  isActive
                    ? "translate-x-0 opacity-100"
                    : "opacity-0 group-hover:translate-x-1 group-hover:opacity-60",
                )}
                aria-hidden
              />
            </button>
          );
        }

        return (
          <Link
            key={category.slug}
            href={blogCategoryHref(category.slug)}
            className={cn(
              "font-display group flex items-center justify-between gap-3 py-1 text-3xl leading-none font-normal tracking-tight no-underline transition-colors sm:text-4xl md:text-[2rem] lg:text-5xl xl:text-6xl",
              isActive
                ? "text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            <span>{category.label}</span>
            <ArrowRightIcon
              className={cn(
                "size-6 shrink-0 transition-transform sm:size-7 md:size-7 lg:size-8 xl:size-10",
                isActive
                  ? "translate-x-0 opacity-100"
                  : "opacity-0 group-hover:translate-x-1 group-hover:opacity-60",
              )}
              aria-hidden
            />
          </Link>
        );
      })}
    </nav>
  );
}
