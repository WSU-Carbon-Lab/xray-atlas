import { Suspense } from "react";
import { Spinner } from "@heroui/react";
import { DashboardPlotViewerPage } from "~/features/dashboard/plot-viewer/dashboard-plot-viewer-page";

export const metadata = {
  title: "Compare spectra",
};

function PlotViewerFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export default function DashboardPlotPage() {
  return (
    <Suspense fallback={<PlotViewerFallback />}>
      <DashboardPlotViewerPage />
    </Suspense>
  );
}
