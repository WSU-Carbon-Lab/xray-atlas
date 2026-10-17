import { Suspense, type ReactElement } from "react";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import {
  MoleculeDetailPageClient,
  MoleculeNexafsBrowseFallback,
  MoleculeNexafsBrowseGate,
} from "./molecule-detail-page-client";
import { MoleculeNexafsDatasetSection } from "./molecule-nexafs-dataset-section";
import {
  moleculeRouteNeedsCanonicalRedirect,
  resolveMoleculeByRouteId,
} from "./molecule-detail-request";

interface MoleculeDetailSearchParams {
  q?: string | string[];
  page?: string | string[];
  edge?: string | string[];
  mol?: string | string[];
  instrument?: string | string[];
  contributor?: string | string[];
  experimentType?: string | string[];
  verified?: string | string[];
  verificationSource?: string | string[];
  nexafsExperiment?: string | string[];
}

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function isActiveFlag(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function isDefaultMoleculeNexafsRequest(
  searchParams: MoleculeDetailSearchParams,
): boolean {
  const query = firstSearchParam(searchParams.q)?.trim() ?? "";
  const pageRaw = firstSearchParam(searchParams.page);
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const verificationSource = firstSearchParam(searchParams.verificationSource);
  const facetKeys = [
    searchParams.edge,
    searchParams.mol,
    searchParams.instrument,
    searchParams.contributor,
    searchParams.experimentType,
    searchParams.nexafsExperiment,
  ];
  const hasFacet = facetKeys.some((value) => {
    const text = firstSearchParam(value)?.trim() ?? "";
    return text.length > 0;
  });
  const verifiedOnly =
    isActiveFlag(firstSearchParam(searchParams.verified)) ||
    (verificationSource !== undefined &&
      verificationSource.length > 0 &&
      verificationSource !== "either");
  return (
    query.length === 0 &&
    !hasFacet &&
    !verifiedOnly &&
    (!Number.isFinite(page) || page <= 1)
  );
}

/**
 * Renders the molecule NEXAFS section for `/molecules/[id]`.
 *
 * Reuses `resolveMoleculeByRouteId` so this render does not issue a second
 * `getBySlug` or `getById`. Returns the client shell without awaiting the
 * browse list. On the canonical slug with no browse filters, the list loads
 * inside `Suspense` from `MoleculeNexafsDatasetSection`. Collision, missing,
 * and non-canonical params return nothing because the layout renders the
 * collision card, `notFound`, or the canonical redirect. `mergePair` does not
 * suppress the seed. `nexafsExperiment` does, and the client query fills it.
 *
 * @param props.params Route segment `id` (slug or UUID).
 * @param props.searchParams Shareable NEXAFS query keys, including `nexafsExperiment` and `mergePair`.
 * @returns The client section, or `null` when the layout owns the response.
 */
export default async function MoleculeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<MoleculeDetailSearchParams>;
}): Promise<ReactElement | null> {
  const [{ id: routeId }, query] = await Promise.all([params, searchParams]);

  let resolved: Awaited<ReturnType<typeof resolveMoleculeByRouteId>>;
  try {
    resolved = await resolveMoleculeByRouteId(routeId);
  } catch {
    return null;
  }
  if (resolved.status !== "found") {
    return null;
  }
  const molecule = resolved.molecule;
  if (
    moleculeRouteNeedsCanonicalRedirect(
      routeId,
      canonicalMoleculeSlugFromView(molecule),
    )
  ) {
    return null;
  }

  const datasetList = isDefaultMoleculeNexafsRequest(query) ? (
    <Suspense fallback={<MoleculeNexafsBrowseFallback />}>
      <MoleculeNexafsDatasetSection moleculeId={molecule.id} />
    </Suspense>
  ) : (
    <MoleculeNexafsBrowseGate />
  );

  return <MoleculeDetailPageClient>{datasetList}</MoleculeDetailPageClient>;
}
