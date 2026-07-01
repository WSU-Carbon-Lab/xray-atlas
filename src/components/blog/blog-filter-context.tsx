"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  buildBlogFilterHash,
  DEFAULT_BLOG_FILTER_STATE,
  parseBlogFilterHash,
  type BlogFilterState,
} from "~/components/blog/blog-filter-hash";

interface BlogFilterContextValue {
  state: BlogFilterState;
  applyState: (next: BlogFilterState) => void;
}

const BlogFilterContext = createContext<BlogFilterContextValue | null>(null);

/**
 * Owns blog index filter state and syncs it to `location.hash` via `replaceState`.
 *
 * Wrap `/blog` index content so the hero category nav, filter bar, and grid share
 * one filter source without full-page navigation.
 */
export function BlogFilterProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [state, setState] = useState<BlogFilterState>(DEFAULT_BLOG_FILTER_STATE);

  const applyState = useCallback((next: BlogFilterState) => {
    setState(next);
    const hash = buildBlogFilterHash(next);
    const path = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, "", path);
  }, []);

  useEffect(() => {
    setState(parseBlogFilterHash(window.location.hash));
  }, []);

  const value = useMemo(
    () => ({
      state,
      applyState,
    }),
    [state, applyState],
  );

  return (
    <BlogFilterContext.Provider value={value}>
      {children}
    </BlogFilterContext.Provider>
  );
}

/**
 * Reads shared blog index filter state when inside {@link BlogFilterProvider}.
 */
export function useOptionalBlogFilter(): BlogFilterContextValue | null {
  return useContext(BlogFilterContext);
}

/**
 * Reads shared blog index filter state from {@link BlogFilterProvider}.
 *
 * @throws When called outside `BlogFilterProvider`.
 */
export function useBlogFilter(): BlogFilterContextValue {
  const context = useOptionalBlogFilter();
  if (!context) {
    throw new Error("useBlogFilter must be used within BlogFilterProvider");
  }
  return context;
}
