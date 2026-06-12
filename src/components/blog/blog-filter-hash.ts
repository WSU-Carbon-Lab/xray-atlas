import {
  BLOG_CATEGORY_SLUGS,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";

export type BlogSortOrder = "newest" | "oldest";

export interface BlogFilterState {
  categories: BlogCategorySlug[];
  tags: string[];
  sort: BlogSortOrder;
}

export const DEFAULT_BLOG_FILTER_STATE: BlogFilterState = {
  categories: [],
  tags: [],
  sort: "newest",
};

function isBlogCategorySlug(value: string): value is BlogCategorySlug {
  return (BLOG_CATEGORY_SLUGS as readonly string[]).includes(value);
}

/**
 * Parses blog index filter state from a location hash (`#tags=a,b&category=guides&sort=oldest`).
 */
export function parseBlogFilterHash(hash: string): BlogFilterState {
  const normalized = hash.replace(/^#/u, "");
  if (!normalized) {
    return DEFAULT_BLOG_FILTER_STATE;
  }

  const params = new URLSearchParams(normalized);
  const tags =
    params
      .get("tags")
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? [];
  const categories =
    params
      .get("category")
      ?.split(",")
      .map((category) => category.trim())
      .filter(isBlogCategorySlug) ?? [];
  const sortParam = params.get("sort");
  const sort: BlogSortOrder = sortParam === "oldest" ? "oldest" : "newest";

  return { categories, tags, sort };
}

/**
 * Serializes blog filter state to a location hash for shareable deep links.
 */
export function buildBlogFilterHash(state: BlogFilterState): string {
  const params = new URLSearchParams();
  if (state.tags.length > 0) {
    params.set("tags", state.tags.join(","));
  }
  if (state.categories.length > 0) {
    params.set("category", state.categories.join(","));
  }
  if (state.sort === "oldest") {
    params.set("sort", "oldest");
  }
  const serialized = params.toString();
  return serialized ? `#${serialized}` : "";
}
