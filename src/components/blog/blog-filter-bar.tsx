"use client";

import { cn } from "@heroui/styles";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import {
  BLOG_CATEGORIES,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";
import {
  buildBlogFilterHash,
  DEFAULT_BLOG_FILTER_STATE,
  parseBlogFilterHash,
  type BlogFilterState,
  type BlogSortOrder,
} from "~/components/blog/blog-filter-hash";

function toggleCategory(
  current: BlogCategorySlug[],
  category: BlogCategorySlug,
): BlogCategorySlug[] {
  return current.includes(category)
    ? current.filter((value) => value !== category)
    : [...current, category];
}

function toggleTag(current: string[], tag: string): string[] {
  return current.includes(tag)
    ? current.filter((value) => value !== tag)
    : [...current, tag];
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      className={cn(
        "border-border rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        selected
          ? "bg-accent/15 text-accent border-accent/40"
          : "bg-surface text-muted hover:text-foreground hover:border-accent/30",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Blog index filter bar with category pills, tag chips, and sort controls.
 *
 * Syncs filter state to the location hash via `history.replaceState` without
 * `useSearchParams`, keeping `/blog` statically generated.
 */
export function BlogFilterBar({
  availableTags,
  onFilterChange,
}: {
  availableTags: string[];
  onFilterChange: (state: BlogFilterState) => void;
}): ReactElement {
  const [state, setState] = useState<BlogFilterState>(
    DEFAULT_BLOG_FILTER_STATE,
  );

  const applyState = useCallback(
    (next: BlogFilterState) => {
      setState(next);
      onFilterChange(next);
      const hash = buildBlogFilterHash(next);
      const path = `${window.location.pathname}${window.location.search}${hash}`;
      window.history.replaceState(null, "", path);
    },
    [onFilterChange],
  );

  useEffect(() => {
    const initial = parseBlogFilterHash(window.location.hash);
    setState(initial);
    onFilterChange(initial);
  }, [onFilterChange]);

  const setSort = (sort: BlogSortOrder): void => {
    applyState({ ...state, sort });
  };

  return (
    <div className="border-border space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-foreground text-sm font-medium">Filter posts</p>
        <div
          className="border-border flex rounded-full border p-0.5"
          role="group"
          aria-label="Sort order"
        >
          {(["newest", "oldest"] as const).map((sort) => (
            <button
              key={sort}
              type="button"
              onClick={() => setSort(sort)}
              aria-pressed={state.sort === sort}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                state.sort === sort
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground",
              )}
            >
              {sort}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-muted text-xs font-medium tracking-wide uppercase">
          Categories
        </p>
        <div className="flex flex-wrap gap-2">
          {BLOG_CATEGORIES.map((category) => (
            <FilterChip
              key={category.slug}
              label={category.label}
              selected={state.categories.includes(category.slug)}
              onPress={() =>
                applyState({
                  ...state,
                  categories: toggleCategory(state.categories, category.slug),
                })
              }
            />
          ))}
        </div>
      </div>

      {availableTags.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted text-xs font-medium tracking-wide uppercase">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <FilterChip
                key={tag}
                label={tag}
                selected={state.tags.includes(tag)}
                onPress={() =>
                  applyState({
                    ...state,
                    tags: toggleTag(state.tags, tag),
                  })
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Tag-only filter row for category-scoped blog indexes.
 */
export function BlogCategoryTagFilterBar({
  availableTags,
  onFilterChange,
}: {
  availableTags: string[];
  onFilterChange: (state: BlogFilterState) => void;
}): ReactElement | null {
  const [state, setState] = useState<BlogFilterState>(
    DEFAULT_BLOG_FILTER_STATE,
  );

  const applyState = useCallback(
    (next: BlogFilterState) => {
      setState(next);
      onFilterChange(next);
      const hash = buildBlogFilterHash(next);
      const path = `${window.location.pathname}${window.location.search}${hash}`;
      window.history.replaceState(null, "", path);
    },
    [onFilterChange],
  );

  useEffect(() => {
    const initial = parseBlogFilterHash(window.location.hash);
    setState(initial);
    onFilterChange(initial);
  }, [onFilterChange]);

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-muted text-xs font-medium tracking-wide uppercase">
        Filter by tag
      </p>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <FilterChip
            key={tag}
            label={tag}
            selected={state.tags.includes(tag)}
            onPress={() =>
              applyState({
                ...state,
                tags: toggleTag(state.tags, tag),
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
