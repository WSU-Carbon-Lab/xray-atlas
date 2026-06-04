import { Suspense } from "react";
import { Spinner } from "@heroui/react";
import { Als5322WorkspacePage } from "~/features/dashboard/instrument-workspace/als-5322-workspace-page";

export const metadata = {
  title: "ALS 5.3.2.2 STXM workspace",
};

function WorkspaceFallback() {
  return (
    <div className="flex justify-center py-16">
      <Spinner size="lg" />
    </div>
  );
}

export default function Als5322InstrumentPage() {
  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <Als5322WorkspacePage />
    </Suspense>
  );
}
