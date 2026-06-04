import { isValidOrcidUserId } from "~/lib/orcid";
import { formatOrcidExpandedSearchDisplayName } from "~/server/orcid/orcidExpandedSearch";

export type OrcidPublicPersonSummary = {
  orcid: string;
  displayName: string;
  affiliation: string | null;
};

type OrcidPersonJson = {
  name?: {
    "credit-name"?: { value?: string | null } | null;
    "given-names"?: { value?: string | null } | null;
    "family-name"?: { value?: string | null } | null;
  } | null;
  emails?: {
    email?: Array<{ email?: string | null }> | null;
  } | null;
  addresses?: {
    address?: Array<{
      "country"?: { value?: string | null } | null;
    }> | null;
  } | null;
};

/**
 * Parses ORCID public person JSON into a display summary for attribution pickers.
 */
export function parseOrcidPublicPersonSummary(
  orcid: string,
  body: unknown,
): OrcidPublicPersonSummary | null {
  if (!isValidOrcidUserId(orcid) || typeof body !== "object" || body === null) {
    return null;
  }
  const data = body as OrcidPersonJson;
  const name = data.name;
  const displayName = formatOrcidExpandedSearchDisplayName({
    "credit-name": name?.["credit-name"]?.value ?? null,
    "given-names": name?.["given-names"]?.value ?? null,
    "family-names": name?.["family-name"]?.value ?? null,
  });

  const country = data.addresses?.address?.[0]?.country?.value?.trim();
  const affiliation = country ?? null;

  return { orcid, displayName, affiliation };
}

/**
 * Loads display metadata for a bare ORCID iD from the ORCID public registry.
 *
 * @throws When the HTTP response is not successful.
 */
export async function fetchOrcidPublicPersonSummary(
  orcid: string,
): Promise<OrcidPublicPersonSummary | null> {
  if (!isValidOrcidUserId(orcid)) return null;

  const url = `https://pub.orcid.org/v3.0/${encodeURIComponent(orcid)}/person`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `ORCID person lookup failed (${response.status} ${response.statusText})`,
    );
  }

  const body: unknown = await response.json();
  return parseOrcidPublicPersonSummary(orcid, body);
}
