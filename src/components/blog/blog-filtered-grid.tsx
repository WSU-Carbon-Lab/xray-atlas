"use client";

import {
  Children,
  useCallback,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { BlogCategorySlug } from "~/lib/content/blog-categories";
import {
  BlogCategoryTagFilterBar,
  BlogFilterBar,
} from "~/components/blog/blog-filter-bar";
import {
  DEFAULT_BLOG_FILTER_STATE,
  type BlogFilterState,
} from "~/components/blog/blog-filter-hash";

/** Metadata for one blog grid card used by client-side filtering and sort ordering. */
export interface BlogGridItemMeta {
  slug: string;
  category: BlogCategorySlug;
  tags: string[];
  date: string;
}

function entryMatchesFilter(
  meta: BlogGridItemMeta,
  state: BlogFilterState,
): boolean {
  if (
    state.categories.length > 0 &&
    !state.categories.includes(meta.category)
  ) {
    return false;
  }
  if (state.tags.length > 0 && !state.tags.some((tag) => meta.tags.includes(tag))) {
    return false;
  }
  return true;
}

function sortedVisibleItems(
  items: BlogGridItemMeta[],
  state: BlogFilterState,
): BlogGridItemMeta[] {
  const visible = items.filter((item) => entryMatchesFilter(item, state));
  return [...visible].sort((left, right) => {
    const compare = left.date.localeCompare(right.date);
    return state.sort === "oldest" ? compare : -compare;
  });
}

function BlogGridShell({
  items,
  children,
  filterState,
}: {
  items: BlogGridItemMeta[];
  children: ReactNode;
  filterState: BlogFilterState;
}): ReactElement {
  const childArray = Children.toArray(children);
  const orderBySlug = useMemo(() => {
    const ordered = sortedVisibleItems(items, filterState);
    const map = new Map<string, number>();
    ordered.forEach((item, index) => {
      map.set(item.slug, index + 1);
    });
    return map;
  }, [items, filterState]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {childArray.map((child, index) => {
        const meta = items[index];
        if (!meta) {
          return null;
        }
        const visible = entryMatchesFilter(meta, filterState);
        const order = orderBySlug.get(meta.slug);
        return (
          <div
            key={meta.slug}
            className={visible ? undefined : "hidden"}
            style={visible && order !== undefined ? { order } : undefined}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Wraps the blog index grid with filter bar and visibility-based filtering.
 */
export function BlogIndexFilteredSection({
  items,
  availableTags,
  children,
}: {
  items: BlogGridItemMeta[];
  availableTags: string[];
  children: ReactNode;
}): ReactElement {
  const [filterState, setFilterState] = useState<BlogFilterState>(
    DEFAULT_BLOG_FILTER_STATE,
  );
  const handleFilterChange = useCallback((next: BlogFilterState) => {
    setFilterState(next);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <BlogFilterBar
        availableTags={availableTags}
        onFilterChange={handleFilterChange}
      />
      <BlogGridShell items={items} filterState={filterState}>
        {children}
      </BlogGridShell>
    </div>
  );
}

/**
 * Wraps a category-scoped grid with tag-only filtering.
 */
export function BlogCategoryFilteredSection({
  items,
  availableTags,
  children,
}: {
  items: BlogGridItemMeta[];
  availableTags: string[];
  children: ReactNode;
}): ReactElement {
  const [filterState, setFilterState] = useState<BlogFilterState>(
    DEFAULT_BLOG_FILTER_STATE,
  );
  const handleFilterChange = useCallback((next: BlogFilterState) => {
    setFilterState(next);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <BlogCategoryTagFilterBar
        availableTags={availableTags}
        onFilterChange={handleFilterChange}
      />
      <BlogGridShell items={items} filterState={filterState}>
        {children}
      </BlogGridShell>
    </div>
  );
}
