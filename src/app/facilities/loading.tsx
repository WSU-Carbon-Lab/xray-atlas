import type { ReactElement } from "react";
import { PageSkeleton } from "~/components/feedback/loading-state";

/**
 * Paints the facility segment fallback immediately, using the same page
 * skeleton the facility view shows while its catalog query loads.
 */
export default function FacilityLoading(): ReactElement {
  return <PageSkeleton />;
}
