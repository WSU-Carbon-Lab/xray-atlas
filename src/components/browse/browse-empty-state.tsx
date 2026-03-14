"use client";

import Link from "next/link";

type BrowseEmptyStateProps = {
  message: string;
  hasSearchQuery: boolean;
  browseAllHref: string;
  onClearSearch?: () => void;
  children?: React.ReactNode;
};

export function BrowseEmptyState({
  message,
  hasSearchQuery,
  browseAllHref,
  onClearSearch,
  children,
}: BrowseEmptyStateProps) {
  return (
    <div className="border-border bg-surface rounded-xl border p-8 text-center">
      <p className="text-muted">{message}</p>
      {hasSearchQuery && onClearSearch && (
        <p className="text-muted mt-2 text-sm">
          Try a different search term or{" "}
          <Link
            href={browseAllHref}
            className="text-accent hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onClearSearch();
            }}
          >
            browse all
          </Link>
          .
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
