import type { ReactElement } from "react";
import { BrowsePageLayout } from "~/components/browse/browse-page-layout";
import { BrowseTabs } from "~/components/layout/browse-tabs";
import {
  NexafsExperimentCompactSkeleton,
  SearchInputSkeleton,
} from "~/components/feedback/loading-state";

/**
 * Paints the NEXAFS browse shell immediately: title, section tabs, search
 * placeholder, and compact experiment rows, while the page segment streams.
 */
export default function NexafsBrowseLoading(): ReactElement {
  return (
    <BrowsePageLayout
      title="Browse NEXAFS experiments"
      subtitle="Filter by molecule, edge, instrument, acquisition, verification, or search the catalog."
    >
      <BrowseTabs />
      <div
        className="space-y-6"
        aria-busy
        aria-label="Loading NEXAFS experiments"
      >
        <SearchInputSkeleton />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <NexafsExperimentCompactSkeleton key={index} />
          ))}
        </div>
      </div>
    </BrowsePageLayout>
  );
}
