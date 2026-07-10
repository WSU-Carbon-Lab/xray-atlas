/**
 * Builds Zenodo deposition metadata for a NEXAFS experiment from the Atlas experiment graph.
 *
 * Titles use the formal shared builder {@link buildNexafsDatasetCitationTitle}
 * (`NEXAFS dataset: {molecule}, {edge}[, {type}], {instrument}[, {facility}]`) with no
 * informal `@` facility markers. Creators come from `experiment_contributors`
 * (ORCID + display name when attribution display preferences allow; leading `@`
 * stripped), ordered as lead experimentalist (`ProjectLeader`), curator/uploader
 * (`DataCurator`), other roles, then PI (`Supervisor`) last. Source-paper DOIs become
 * `related_identifiers`. Community membership uses `ZENODO_COMMUNITY_ID` (production: `xrayatlas`).
 * Canonical Atlas citation links use {@link buildAtlasDatasetCitationUrl}
 * (`/d/{atlasDatasetId}`), never request-time `getBaseUrl` / localhost / preview hosts.
 */

import type { PrismaClient } from "~/prisma/client";
import {
  resolveCitationCreatorLabelFromPreferences,
  type AttributionDisplayPreferences,
} from "~/lib/dataset-attribution-claim";
import {
  buildDatasetBibTeXNote,
  buildNexafsDatasetCitationTitle,
  formatDatasetCitationSampleSummary,
  type DatasetCitationSampleInfo,
} from "~/lib/dataset-citation";
import { normalizeDoi } from "~/lib/doi";
import { contributorCitationSortKey } from "~/lib/datacite-contributor-types";
import {
  canonicalMoleculeSlugFromView,
  slugifyMoleculeSynonym,
} from "~/lib/molecule-slug";
import { PROCESS_METHOD_OPTIONS } from "~/features/process-nexafs/constants";
import { buildAtlasDatasetCitationUrl } from "~/server/zenodo/atlas-public-site-origin";
import { ensureAtlasDatasetId } from "~/server/nexafs/atlas-dataset-id";
import { loadContributorUserContextByOrcid } from "~/server/nexafs/datasetAttributionClaiming";
import { zenodoCommunityId } from "~/server/zenodo/zenodo-config";
import type {
  ZenodoCreator,
  ZenodoDepositMetadata,
  ZenodoRelatedIdentifier,
} from "~/server/zenodo/zenodo-client";

export interface ZenodoMetadataExperimentSnapshot {
  experimentId: string;
  canonicalSlug: string | null;
  moleculeDisplayName: string;
  moleculeIupacName: string;
  moleculeSlug: string;
  chemicalFormula: string;
  edgeTargetAtom: string;
  edgeCoreState: string;
  instrumentName: string;
  facilityName: string | null;
  experimentTypeLabel: string | null;
  /** Short public citation URL (`/d/{atlasDatasetId}`). */
  atlasExperimentUrl: string;
  /** Opaque Atlas dataset id used in `/d/{id}`. */
  atlasDatasetId: string;
  creators: ZenodoCreator[];
  relatedIdentifiers: ZenodoRelatedIdentifier[];
  /** Core sample preparation fields for description / notes (may be empty). */
  sample: DatasetCitationSampleInfo;
}

/**
 * Formats a display name into Zenodo/DataCite `Family, Given` style when possible.
 *
 * @param displayName - User-facing name from Atlas (`user.name`) or ORCID fallback.
 * @returns Creator name string suitable for Zenodo `creators[].name`.
 */
export function formatZenodoCreatorName(displayName: string): string {
  const trimmed = displayName.trim().replace(/^@+/, "").replace(/\s+/g, " ");
  if (!trimmed) return "Unknown";
  if (trimmed.includes(",")) return trimmed;
  const parts = trimmed.split(" ");
  if (parts.length === 1) return trimmed;
  const family = parts[parts.length - 1]!;
  const given = parts.slice(0, -1).join(" ");
  return `${family}, ${given}`;
}

/**
 * Builds one Zenodo creator from an experiment contributor claim row.
 *
 * Uses attribution display preferences for the claim state: name when the user
 * opted into `name_only` / `name_and_avatar` and a profile name exists; otherwise
 * ORCID-labeled so Zenodo stays anonymous for users who keep `orcid_only`.
 *
 * @param input - ORCID, claim status, optional Atlas profile name, and preferences.
 * @returns Zenodo creator object (name + optional ORCID).
 */
export function resolveZenodoCreatorFromContributor(input: {
  orcidId: string;
  claimStatus: string | null | undefined;
  userName?: string | null;
  userId?: string | null;
  displayPreferences?: AttributionDisplayPreferences | null;
  roleSlugs?: readonly string[];
}): ZenodoCreator {
  const orcid =
    normalizeZenodoOrcid(input.orcidId) ?? normalizeZenodoOrcid(input.userId);
  const label = resolveCitationCreatorLabelFromPreferences({
    orcid: orcid ?? input.orcidId,
    claimStatus: input.claimStatus,
    userName: input.userName,
    displayPreferences: input.displayPreferences,
    roleSlugs: input.roleSlugs,
  });
  const isOrcidLabel = label.startsWith("ORCID ");
  if (!isOrcidLabel) {
    return {
      name: formatZenodoCreatorName(label),
      ...(orcid ? { orcid } : {}),
    };
  }
  return {
    name: orcid ? `ORCID ${orcid}` : label,
    ...(orcid ? { orcid } : {}),
  };
}

/**
 * Citation sort key for Zenodo / BibTeX author order.
 *
 * Delegates to {@link contributorCitationSortKey}.
 */
export function zenodoCreatorCitationSortKey(roles: readonly string[]): number {
  return contributorCitationSortKey(roles);
}

/**
 * Sorts Zenodo creators by {@link contributorCitationSortKey} using accumulated roles.
 *
 * Stable for equal keys via `firstSeenIndex`.
 *
 * @param entries - Creators with the contributor roles that produced them.
 * @returns Creators in citation order.
 */
export function sortZenodoCreatorsByCitationOrder(
  entries: ReadonlyArray<{
    creator: ZenodoCreator;
    roles: readonly string[];
    firstSeenIndex: number;
  }>,
): ZenodoCreator[] {
  return [...entries]
    .sort((a, b) => {
      const keyDelta =
        contributorCitationSortKey(a.roles) -
        contributorCitationSortKey(b.roles);
      if (keyDelta !== 0) return keyDelta;
      return a.firstSeenIndex - b.firstSeenIndex;
    })
    .map((entry) => entry.creator);
}

/**
 * Normalizes an ORCID iD for Zenodo creator metadata (bare `0000-0000-0000-0000` form).
 *
 * @param orcid - Raw ORCID from `experiment_contributors.orcid_id` or user id.
 * @returns Bare ORCID string, or `undefined` when empty/invalid length.
 */
export function normalizeZenodoOrcid(
  orcid: string | null | undefined,
): string | undefined {
  if (!orcid) return undefined;
  const stripped = orcid
    .trim()
    .replace(/^https?:\/\/orcid\.org\//i, "")
    .replace(/^orcid:/i, "");
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(stripped)) {
    return undefined;
  }
  return stripped.toUpperCase().replace(/X$/, "X");
}

const EXPERIMENT_TYPE_LABELS = {
  TOTAL_ELECTRON_YIELD: "TEY",
  PARTIAL_ELECTRON_YIELD: "PEY",
  FLUORESCENT_YIELD: "FY",
  TRANSMISSION: "TRANS",
} as const;

type ExperimentTypeKey = keyof typeof EXPERIMENT_TYPE_LABELS;

function experimentTypeLabel(
  experimentType: string | null | undefined,
): string | null {
  if (!experimentType) return null;
  if (experimentType in EXPERIMENT_TYPE_LABELS) {
    return EXPERIMENT_TYPE_LABELS[experimentType as ExperimentTypeKey];
  }
  return experimentType;
}

function processMethodLabel(
  processMethod: string | null | undefined,
): string | null {
  if (!processMethod) return null;
  const trimmed = processMethod.trim();
  if (!trimmed) return null;
  const match = PROCESS_METHOD_OPTIONS.find(
    (option) => option.value === trimmed,
  );
  return match?.label ?? trimmed;
}

function nonEmptyTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (trimmed == null || trimmed.length === 0) return null;
  return trimmed;
}

/**
 * Loads experiment, molecule, instrument, contributors, and source publications for Zenodo metadata.
 *
 * @param db - Prisma client.
 * @param experimentId - Atlas experiment UUID.
 * @returns Snapshot used by {@link buildZenodoDepositMetadata}, or `null` when the experiment is missing.
 */
export async function loadZenodoMetadataSnapshot(
  db: PrismaClient,
  experimentId: string,
): Promise<ZenodoMetadataExperimentSnapshot | null> {
  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      id: true,
      canonicalslug: true,
      experimenttype: true,
      edges: { select: { targetatom: true, corestate: true } },
      instruments: {
        select: {
          name: true,
          facilities: { select: { name: true } },
        },
      },
      samples: {
        select: {
          processmethod: true,
          substrate: true,
          patterninglayer: true,
          solvent: true,
          thickness: true,
          molecularweight: true,
          vendors: { select: { name: true } },
          molecules: {
            select: {
              iupacname: true,
              chemicalformula: true,
              moleculesynonyms: {
                select: { synonym: true, slug: true, order: true },
                orderBy: [{ order: "asc" }, { synonym: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
      experimentcontributors: {
        select: {
          orcidid: true,
          role: true,
          claimstatus: true,
          user: { select: { name: true, id: true } },
        },
        orderBy: [{ createdat: "asc" }, { role: "asc" }],
      },
      experimentpublications: {
        where: { role: "source" },
        select: {
          publications: { select: { doi: true } },
        },
      },
    },
  });

  if (!experiment) return null;

  const molecule = experiment.samples.molecules;
  const primarySynonym = molecule.moleculesynonyms[0];
  const synonym = primarySynonym?.synonym?.trim();
  const moleculeDisplayName =
    synonym && synonym.length > 0 ? synonym : molecule.iupacname;
  const storedSlug = primarySynonym?.slug?.trim();
  const moleculeSlug =
    storedSlug && storedSlug.length > 0
      ? storedSlug
      : canonicalMoleculeSlugFromView({
          name: moleculeDisplayName,
          iupacName: molecule.iupacname,
        }) || slugifyMoleculeSynonym(moleculeDisplayName);

  const creatorsByKey = new Map<
    string,
    {
      creator: ZenodoCreator;
      roles: string[];
      firstSeenIndex: number;
      claimAccepted: boolean;
    }
  >();
  const userContextByOrcid = await loadContributorUserContextByOrcid(
    db,
    experiment.experimentcontributors.map((row) => row.orcidid),
  );
  let seenIndex = 0;
  for (const row of experiment.experimentcontributors) {
    const userContext = userContextByOrcid.get(row.orcidid);
    const creator = resolveZenodoCreatorFromContributor({
      orcidId: row.orcidid,
      claimStatus: row.claimstatus,
      userName: row.user?.name,
      userId: row.user?.id,
      displayPreferences: userContext?.displayPreferences,
      roleSlugs: userContext?.roleSlugs,
    });
    const key = creator.orcid ?? creator.name;
    const existing = creatorsByKey.get(key);
    const accepted = row.claimstatus === "accepted";
    if (!existing) {
      creatorsByKey.set(key, {
        creator,
        roles: [row.role],
        firstSeenIndex: seenIndex,
        claimAccepted: accepted,
      });
      seenIndex += 1;
      continue;
    }
    existing.roles.push(row.role);
    const existingIsOrcid = existing.creator.name.startsWith("ORCID ");
    const nextIsNamed = !creator.name.startsWith("ORCID ");
    if ((accepted && !existing.claimAccepted) || (existingIsOrcid && nextIsNamed)) {
      existing.creator = creator;
      existing.claimAccepted = existing.claimAccepted || accepted;
    }
  }

  const creators = sortZenodoCreatorsByCitationOrder([
    ...creatorsByKey.values(),
  ]);
  if (creators.length === 0) {
    creators.push({ name: "X-ray Atlas contributors" });
  }

  const relatedIdentifiers: ZenodoRelatedIdentifier[] = [];
  const seenDois = new Set<string>();
  for (const entry of experiment.experimentpublications) {
    const normalized = normalizeDoi(entry.publications.doi);
    if (!normalized || seenDois.has(normalized)) continue;
    seenDois.add(normalized);
    relatedIdentifiers.push({
      identifier: normalized,
      relation: "isSupplementTo",
      scheme: "doi",
    });
  }

  const atlasDatasetId = await ensureAtlasDatasetId(db, experiment.id);
  const atlasExperimentUrl = buildAtlasDatasetCitationUrl(atlasDatasetId);
  relatedIdentifiers.push({
    identifier: atlasExperimentUrl,
    relation: "isIdenticalTo",
    scheme: "url",
    resource_type: "dataset",
  });

  const sample: DatasetCitationSampleInfo = {
    processMethod: processMethodLabel(experiment.samples.processmethod),
    substrate: nonEmptyTrimmed(experiment.samples.substrate),
    patterningLayer: nonEmptyTrimmed(experiment.samples.patterninglayer),
    solvent: nonEmptyTrimmed(experiment.samples.solvent),
    thicknessNm:
      experiment.samples.thickness != null &&
      Number.isFinite(experiment.samples.thickness)
        ? experiment.samples.thickness
        : null,
    molecularWeightGPerMol:
      experiment.samples.molecularweight != null &&
      Number.isFinite(experiment.samples.molecularweight)
        ? experiment.samples.molecularweight
        : null,
    vendorName: nonEmptyTrimmed(experiment.samples.vendors?.name),
  };

  return {
    experimentId: experiment.id,
    canonicalSlug: experiment.canonicalslug,
    moleculeDisplayName,
    moleculeIupacName: molecule.iupacname,
    moleculeSlug,
    chemicalFormula: molecule.chemicalformula,
    edgeTargetAtom: experiment.edges.targetatom,
    edgeCoreState: experiment.edges.corestate,
    instrumentName: experiment.instruments.name,
    facilityName: experiment.instruments.facilities?.name ?? null,
    experimentTypeLabel: experimentTypeLabel(experiment.experimenttype),
    atlasExperimentUrl,
    atlasDatasetId,
    creators,
    relatedIdentifiers,
    sample,
  };
}

/**
 * Builds the Zenodo `metadata` object for a NEXAFS dataset deposition.
 *
 * @param snapshot - Experiment graph snapshot from {@link loadZenodoMetadataSnapshot}.
 * @param options - Optional community id override (defaults to env / `xrayatlas`).
 * @returns Zenodo deposit metadata with open CC-BY-4.0 license and community membership.
 */
export function buildZenodoDepositMetadata(
  snapshot: ZenodoMetadataExperimentSnapshot,
  options?: { communityId?: string },
): ZenodoDepositMetadata {
  const communityId = options?.communityId ?? zenodoCommunityId();
  const edgeLabel = `${snapshot.edgeTargetAtom}(${snapshot.edgeCoreState})`;
  const title = buildNexafsDatasetCitationTitle({
    moleculeDisplayName: snapshot.moleculeDisplayName,
    edgeLabel,
    instrumentName: snapshot.instrumentName,
    facilityName: snapshot.facilityName,
    experimentTypeLabel: snapshot.experimentTypeLabel,
  });
  const instrumentClause = snapshot.facilityName
    ? `${snapshot.instrumentName}, ${snapshot.facilityName}`
    : snapshot.instrumentName;

  const sampleSummary = formatDatasetCitationSampleSummary(snapshot.sample);
  const description = [
    `<p>Near-edge X-ray absorption fine structure (NEXAFS) spectrum dataset for <strong>${escapeHtml(snapshot.moleculeDisplayName)}</strong>`,
    snapshot.chemicalFormula
      ? ` (${escapeHtml(snapshot.chemicalFormula)})`
      : "",
    ` at the ${escapeHtml(edgeLabel)} edge`,
    snapshot.experimentTypeLabel
      ? ` measured in ${escapeHtml(snapshot.experimentTypeLabel)} mode`
      : "",
    ` on ${escapeHtml(instrumentClause)}.</p>`,
    sampleSummary ? `<p>${escapeHtml(sampleSummary)}.</p>` : "",
    `<p>Canonical record on X-ray Atlas: <a href="${escapeHtml(snapshot.atlasExperimentUrl)}">${escapeHtml(snapshot.atlasExperimentUrl)}</a>.</p>`,
    `<p>Archive contents match the Atlas all-data download (spectrum CSV for all polarizations plus committed experiment and sample auxiliary files). Spectrum export is capped at 10,000 points per experiment, matching the browse download path.</p>`,
  ].join("");

  const keywords = [
    "NEXAFS",
    "X-ray absorption spectroscopy",
    snapshot.edgeTargetAtom,
    snapshot.moleculeDisplayName,
  ];
  if (snapshot.experimentTypeLabel) {
    keywords.push(snapshot.experimentTypeLabel);
  }

  const noteParts = [
    buildDatasetBibTeXNote({
      edgeLabel: `${snapshot.edgeTargetAtom} ${snapshot.edgeCoreState}`,
      instrumentName: snapshot.instrumentName,
      facilityName: snapshot.facilityName,
      experimentTypeLabel: snapshot.experimentTypeLabel,
      sample: snapshot.sample,
      datasetDoi: null,
      atlasCitationUrl: snapshot.atlasExperimentUrl,
    }),
    `Atlas dataset id: ${snapshot.atlasDatasetId}`,
    `Atlas experiment id: ${snapshot.experimentId}`,
  ];

  return {
    title,
    description,
    upload_type: "dataset",
    access_right: "open",
    license: "cc-by-4.0",
    creators: snapshot.creators,
    communities: [{ identifier: communityId }],
    related_identifiers:
      snapshot.relatedIdentifiers.length > 0
        ? snapshot.relatedIdentifiers
        : undefined,
    keywords,
    notes: noteParts.join(". "),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
