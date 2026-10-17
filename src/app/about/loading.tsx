import type { ReactElement } from "react";
import { LoadingSkeleton } from "~/components/feedback/loading-state";

/**
 * Paints a section placeholder for the about segment, including developers and
 * roadmap, while that segment streams.
 */
export default function AboutLoading(): ReactElement {
  return (
    <div
      className="container mx-auto px-4 py-12"
      aria-busy
      aria-label="Loading about"
    >
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="space-y-4">
          <LoadingSkeleton className="mx-auto h-12 w-2/3 max-w-lg rounded" />
          <LoadingSkeleton className="mx-auto h-5 w-full max-w-3xl rounded" />
          <LoadingSkeleton className="mx-auto h-5 w-5/6 max-w-2xl rounded" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LoadingSkeleton className="h-28 rounded-xl" />
          <LoadingSkeleton className="h-28 rounded-xl" />
          <LoadingSkeleton className="h-28 rounded-xl" />
          <LoadingSkeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
