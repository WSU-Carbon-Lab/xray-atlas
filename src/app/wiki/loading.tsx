import type { ReactElement } from "react";
import { LoadingSkeleton } from "~/components/feedback/loading-state";

/**
 * Paints the wiki article column immediately inside the existing doc shell
 * while the wiki page segment streams.
 */
export default function WikiLoading(): ReactElement {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading wiki page">
      <LoadingSkeleton className="h-10 w-2/3 max-w-md rounded" />
      <LoadingSkeleton className="h-4 w-full rounded" />
      <LoadingSkeleton className="h-4 w-full rounded" />
      <LoadingSkeleton className="h-4 w-5/6 rounded" />
      <LoadingSkeleton className="mt-4 h-8 w-1/2 max-w-xs rounded" />
      <LoadingSkeleton className="h-4 w-full rounded" />
      <LoadingSkeleton className="h-4 w-11/12 rounded" />
      <LoadingSkeleton className="h-4 w-4/5 rounded" />
    </div>
  );
}
