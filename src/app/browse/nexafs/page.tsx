"use client";

import { Suspense } from "react";
import { BrowsePageLayout } from "@/components/browse/browse-page-layout";
import { BrowseTabs } from "@/components/layout/browse-tabs";
import { NexafsBrowseExperimentSection } from "@/components/browse/nexafs-browse-experiment-section";

export default function NexafsBrowsePage() {
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
      />
    </Suspense>
  );
}
