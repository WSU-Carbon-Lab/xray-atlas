import type { ReactElement } from "react";
import { BeamDumpErrorPage } from "~/components/feedback/beam-dump-error-page";
import { lookupCachedFacilityBySlug } from "~/server/cache/facility-public-cache";
import { FacilityDetailView } from "./facility-detail-view";

const FACILITY_MISSING_SUBCOPY =
  "The facility you're looking for doesn't exist or its URL slug is ambiguous.";

const FACILITY_AMBIGUOUS_SUBCOPY =
  "Multiple facilities share this URL slug. Open the facility from browse or use its UUID.";

/**
 * Renders the public facility document from the 60 second catalog cache.
 *
 * Missing and ambiguous slugs render the facility beam-dump. Stewards stay on
 * the client view.
 */
export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<ReactElement> {
  const { slug } = await params;
  const lookup = await lookupCachedFacilityBySlug(slug);

  if (lookup.kind !== "found") {
    return (
      <BeamDumpErrorPage
        variant="not-found"
        statusLabel="Facility not found"
        headline="Oh no, the beam dumped"
        subcopy={
          lookup.kind === "ambiguous"
            ? FACILITY_AMBIGUOUS_SUBCOPY
            : FACILITY_MISSING_SUBCOPY
        }
        issueTitle="404: facility not found"
      />
    );
  }

  return (
    <FacilityDetailView
      key={lookup.facility.id}
      slug={slug}
      initialFacility={lookup.facility}
    />
  );
}
