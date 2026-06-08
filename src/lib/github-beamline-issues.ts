/**
 * GitHub issue URL builders for beamline claim and dashboard instrument connector requests.
 *
 * Templates live under `.github/ISSUE_TEMPLATE/` in the X-ray Atlas repository.
 */

/** Canonical GitHub `owner/repo` slug for issue links. */
export const XRAY_ATLAS_GITHUB_REPO = "WSU-Carbon-Lab/xray-atlas" as const;

/** Issue form template filename for beamline claim requests. */
export const BEAMLINE_CLAIM_ISSUE_TEMPLATE = "beamline-claim.yml" as const;

/** Issue form template filename for dashboard instrument connector requests. */
export const INSTRUMENT_CONNECTOR_REQUEST_ISSUE_TEMPLATE =
  "instrument-connector-request.yml" as const;

/** Optional field values passed as GitHub issue form query parameters. */
export type BeamlineGitHubIssuePrefill = {
  /** Facility name as stored in Atlas. */
  facilityName?: string;
  /** Instrument name as stored in Atlas. */
  instrumentName?: string;
  /** Preferred dashboard workspace slug under `/dashboard/instruments/[slug]`. */
  preferredSlug?: string;
  /** Primary spectroscopy technique (STXM, NEXAFS, etc.). */
  technique?: string;
};

/**
 * Builds a GitHub new-issue URL for the beamline claim template, optionally prefilling
 * facility and instrument fields that match form `id` values in `beamline-claim.yml`.
 */
export function buildBeamlineClaimIssueUrl(
  prefill: BeamlineGitHubIssuePrefill = {},
): string {
  return buildGitHubIssueFormUrl(BEAMLINE_CLAIM_ISSUE_TEMPLATE, {
    facility: prefill.facilityName,
    instrument_name: prefill.instrumentName,
  });
}

/**
 * Builds a GitHub new-issue URL for the instrument connector request template, optionally
 * prefilling facility, instrument, technique, and preferred slug form fields.
 */
export function buildInstrumentConnectorRequestIssueUrl(
  prefill: BeamlineGitHubIssuePrefill = {},
): string {
  return buildGitHubIssueFormUrl(INSTRUMENT_CONNECTOR_REQUEST_ISSUE_TEMPLATE, {
    facility: prefill.facilityName,
    instrument_name: prefill.instrumentName,
    preferred_slug: prefill.preferredSlug,
    technique: prefill.technique,
  });
}

function buildGitHubIssueFormUrl(
  template: string,
  fields: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams({ template });
  for (const [fieldId, value] of Object.entries(fields)) {
    const trimmed = value?.trim();
    if (trimmed) {
      params.set(fieldId, trimmed);
    }
  }
  return `https://github.com/${XRAY_ATLAS_GITHUB_REPO}/issues/new?${params.toString()}`;
}
