import { isValidOrcidUserId } from "~/lib/orcid";

export type OrcidExpandedSearchHit = {
  orcid: string;
  displayName: string;
  affiliation: string | null;
};

type OrcidExpandedSearchJson = {
  "expanded-result"?: Array<{
    "orcid-id"?: string;
    "given-names"?: string | null;
    "family-names"?: string | null;
    "credit-name"?: string | null;
    "institution-name"?: string[] | null;
  }>;
};

/**
 * Builds a reader-facing display name from ORCID expanded-search name fields.
 */
export function formatOrcidExpandedSearchDisplayName(row: {
  "credit-name"?: string | null;
  "given-names"?: string | null;
  "family-names"?: string | null;
}): string {
  const credit = row["credit-name"]?.trim();
  if (credit) return credit;
  const given = row["given-names"]?.trim() ?? "";
  const family = row["family-names"]?.trim() ?? "";
  const combined = `${given} ${family}`.trim();
  return combined || "Researcher";
}

/**
 * Parses ORCID public expanded-search JSON into validated bare ORCID hits.
 */
export function parseOrcidExpandedSearchResponse(
  body: unknown,
  maxResults: number,
): OrcidExpandedSearchHit[] {
  if (typeof body !== "object" || body === null) {
    return [];
  }
  const data = body as OrcidExpandedSearchJson;
  const rows = data["expanded-result"];
  if (!Array.isArray(rows)) {
    return [];
  }
  const hits: OrcidExpandedSearchHit[] = [];
  for (const row of rows) {
    if (hits.length >= maxResults) break;
    const orcid = row["orcid-id"]?.trim();
    if (!orcid || !isValidOrcidUserId(orcid)) continue;
    const institutions = row["institution-name"];
    const affiliation =
      Array.isArray(institutions) && institutions.length > 0
        ? (institutions[0]?.trim() ?? null)
        : null;
    hits.push({
      orcid,
      displayName: formatOrcidExpandedSearchDisplayName(row),
      affiliation,
    });
  }
  return hits;
}

/**
 * Queries the ORCID public expanded-search API for a free-text name string.
 *
 * @param query - Non-empty researcher name or keyword string.
 * @param maxResults - Maximum hits to return after validation.
 * @returns Parsed hits, or an empty list when the registry returns no matches.
 * @throws When the HTTP response is not successful or JSON cannot be read.
 */
export async function fetchOrcidExpandedSearchByName(
  query: string,
  maxResults: number,
): Promise<OrcidExpandedSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL("https://pub.orcid.org/v3.0/expanded-search/");
  url.searchParams.set("q", q);
  url.searchParams.set("rows", String(Math.min(Math.max(maxResults, 1), 25)));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(
      `ORCID expanded-search failed (${response.status} ${response.statusText})`,
    );
  }

  const body: unknown = await response.json();
  return parseOrcidExpandedSearchResponse(body, maxResults);
}
