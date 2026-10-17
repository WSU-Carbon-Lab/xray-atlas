import type { ReactElement } from "react";
import { BrowsePageLayout } from "~/components/browse/browse-page-layout";
import { BrowseTabs } from "~/components/layout/browse-tabs";
import {
  MoleculeGridSkeleton,
  SearchInputSkeleton,
} from "~/components/feedback/loading-state";

/**
 * Paints the molecules browse shell immediately: title, section tabs, search
 * placeholder, and compact molecule rows, while the page segment streams.
 */
export default function MoleculesBrowseLoading(): ReactElement {
  return (
    <BrowsePageLayout
      title="Browse Molecules"
      subtitle="Explore all molecules in the X-ray Atlas database."
    >
      <BrowseTabs />
      <div className="space-y-6" aria-busy aria-label="Loading molecules">
        <SearchInputSkeleton />
        <MoleculeGridSkeleton variant="compact" count={6} />
      </div>
    </BrowsePageLayout>
  );
}
