"use client";

import { Suspense, type ReactElement } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { BrowsePageLayout } from "~/components/browse/browse-page-layout";
import { BrowseTabs } from "~/components/layout/browse-tabs";
import { NexafsBrowseExperimentSection } from "~/components/browse/nexafs-browse-experiment-section";
import type { AppRouter } from "~/server/api/root";

type NexafsBrowseInitialList =
  inferRouterOutputs<AppRouter>["experiments"]["browseList"];

interface NexafsBrowsePageClientProps {
  initialBrowseList?: NexafsBrowseInitialList;
}

/**
 * Client shell for `/browse/nexafs`.
 *
 * Keeps the existing suspense fallback, filters, URL keys, and experiment
 * cards. `initialBrowseList` seeds `experiments.browseList` for the default
 * quality page (limit 12, offset 0, no filters) so those rows are in the
 * server HTML and stay fresh for 30 seconds.
 *
 * @param props.initialBrowseList - Cached default catalog page, including favorite overlay. Omitted for filtered URLs and failed reads.
 * @returns The browse page body.
 */
export function NexafsBrowsePageClient({
  initialBrowseList,
}: NexafsBrowsePageClientProps): ReactElement {
  return (
    <Suspense
      fallback={
        <BrowsePageLayout title="Browse NEXAFS experiments" subtitle="Loading…">
          <BrowseTabs />
        </BrowsePageLayout>
      }
    >
      <NexafsBrowseExperimentSection
        variant="fullPage"
        basePath="/browse/nexafs"
        contributeNexafsHref="/contribute/nexafs"
        showMoleculeFilter
        initialBrowseList={initialBrowseList}
      />
    </Suspense>
  );
}
