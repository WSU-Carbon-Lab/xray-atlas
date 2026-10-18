import type { ReactElement } from "react";
import { LoadingSkeleton } from "~/components/feedback/loading-state";

/**
 * Paints a blog-column placeholder for the blog segment, including posts and
 * category pages, while that segment streams.
 */
export default function BlogLoading(): ReactElement {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-8 py-10"
      aria-busy
      aria-label="Loading blog"
    >
      <LoadingSkeleton className="h-12 w-2/3 max-w-md rounded" />
      <LoadingSkeleton className="h-5 w-full max-w-prose rounded" />
      <LoadingSkeleton className="h-5 w-5/6 max-w-prose rounded" />
      <LoadingSkeleton className="h-64 w-full rounded-2xl" />
      <div className="grid gap-6 sm:grid-cols-2">
        <LoadingSkeleton className="h-40 rounded-xl" />
        <LoadingSkeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
