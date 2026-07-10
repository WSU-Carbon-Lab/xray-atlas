/**
 * Builds Zenodo deposition metadata for a NEXAFS experiment from the Atlas experiment graph.
 *
 * Titles use the formal shared builder {@link buildNexafsDatasetCitationTitle}
 * (`NEXAFS dataset: {molecule}, {edge}[, {type}], {instrument}[, {facility}]`) with no
 * informal `@` facility markers. Creators come from `experiment_contributors`
 * (ORCID + display name; leading `@` stripped). Source-paper DOIs become
 * `related_identifiers`. Community membership uses `ZENODO_COMMUNITY_ID` (production: `xrayatlas`).
 * Canonical Atlas deep links use {@link buildAtlasExperimentMoleculeUrl} (brand public
 * origin + `/molecules/{slug}?nexafsExperiment=`), never request-time `getBaseUrl` /
 * localhost / preview hosts.
 */

import type { PrismaClient } from "~/prisma/client";
import { buildNexafsDatasetCitationTitle } from "~/lib/dataset-citation";
import { normalizeDoi } from "~/lib/doi";
import {
  canonicalMoleculeSlugFromView,
  slugifyMoleculeSynonym,
} from "~/lib/molecule-slug";
import { buildAtlasExperimentMoleculeUrl } from "~/server/zenodo/atlas-public-site-origin";
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
  atlasExperimentUrl: string;
  creators: ZenodoCreator[];
  relatedIdentifiers: ZenodoRelatedIdentifier[];
}

/**
 * Formats a display name into Zenodo/DataCite `Family, Given` style when possible.
 *
 * @param displayName - User-facing name from Atlas (`user.name`) or ORCID fallback.
 * @returns Creator name string suitable for Zenodo `creators[].name`.
 */
export function formatZenodoCreatorName(displayName: string): string {
  const trimmed = displayName
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, " ");
  if (!trimmed) return "Unknown";
  if (trimmed.includes(",")) return trimmed;
  const parts = trimmed.split(" ");
  if (parts.length === 1) return trimmed;
  const family = parts[parts.length - 1]!;
  const given = parts.slice(0, -1).join(" ");
  return `${family}, ${given}`;
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
          user: { select: { name: true, id: true } },
        },
        orderBy: [{ role: "asc" }, { createdat: "asc" }],
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

  const creatorsByOrcid = new Map<string, ZenodoCreator>();
  for (const row of experiment.experimentcontributors) {
    const orcid =
      normalizeZenodoOrcid(row.orcidid) ??
      normalizeZenodoOrcid(row.user?.id);
    const nameTrimmed = row.user?.name?.trim() ?? "";
    const displayName =
      nameTrimmed.length > 0
        ? nameTrimmed
        : orcid
          ? `ORCID ${orcid}`
          : "Unknown contributor";
    const creator: ZenodoCreator = {
      name: formatZenodoCreatorName(displayName),
      ...(orcid ? { orcid } : {}),
    };
    const key = orcid ?? creator.name;
    if (!creatorsByOrcid.has(key)) {
      creatorsByOrcid.set(key, creator);
    }
  }

  const creators = [...creatorsByOrcid.values()];
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

  const atlasExperimentUrl = buildAtlasExperimentMoleculeUrl(
    experiment.id,
    moleculeSlug,
  );

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
    creators,
    relatedIdentifiers,
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
    notes: `Atlas experiment id: ${snapshot.experimentId}`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
