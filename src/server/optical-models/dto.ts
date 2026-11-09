/**
 * Wire shapes and row mappers for optical models.
 *
 * Owns the plain objects returned by the model router and REST routes, and the Prisma include
 * shapes that feed them. Stored JSON is parsed leniently on read: a stored normalization or tensor
 * manifest that fails its schema reads as `null` instead of failing the request. Does not decide
 * visibility.
 */

import { z } from "zod";
import type { Prisma } from "~/prisma/client";
import {
  normalizationSpecSchema,
  tensorManifestSchema,
  type ModelVisibility,
  type NormalizationSpec,
  type TensorManifest,
} from "~/lib/optical-models/schemas";
import { formatDatasetVersion } from "~/server/nexafs/dataset-versioning";

/** Review state of a model on one dataset. */
export type ReviewStateDto = "unreviewed" | "approved" | "rejected";

/** Prisma include for list rows. */
export const modelSummaryInclude = {
  forkedFromVersion: {
    select: {
      versionNumber: true,
      model: { select: { id: true, tag: true } },
    },
  },
  versions: {
    where: { status: "published" },
    orderBy: { versionNumber: "desc" },
    take: 1,
    select: { versionNumber: true },
  },
  reviews: true,
} satisfies Prisma.OpticalModelInclude;

/** A model row loaded with {@link modelSummaryInclude}. */
export type ModelSummaryRow = Prisma.OpticalModelGetPayload<{
  include: typeof modelSummaryInclude;
}>;

/** One model in a list. */
export interface OpticalModelSummary {
  tag: string;
  title: string;
  ownerOrcid: string;
  visibility: ModelVisibility;
  /** Highest published version number, or `null` when nothing is published. */
  latestVersion: number | null;
  /** Review state on the dataset in the request, or `null` outside dataset-scoped lists. */
  reviewState: ReviewStateDto | null;
  isDefault: boolean;
  forkedFrom: { tag: string; versionNumber: number } | null;
}

/**
 * List row for a model.
 *
 * `isDefault` is true when the model is the default for `experimentId`, or for any dataset when
 * `experimentId` is `null`. `forkedFrom` is omitted (`null`) when the parent version is unnumbered
 * or the parent model is not in `visibleParentModelIds`, so a hidden parent's tag never leaks.
 *
 * @param row - Model loaded with {@link modelSummaryInclude}.
 * @param experimentId - Dataset the list is scoped to, or `null`.
 * @param visibleParentModelIds - Ids of parent models the viewer can see.
 * @returns The summary DTO.
 */
export function toModelSummary(
  row: ModelSummaryRow,
  experimentId: string | null,
  visibleParentModelIds: ReadonlySet<string>,
): OpticalModelSummary {
  const parent = row.forkedFromVersion;
  const review = experimentId
    ? row.reviews.find((entry) => entry.experimentId === experimentId)
    : undefined;
  return {
    tag: row.tag,
    title: row.title,
    ownerOrcid: row.ownerOrcid,
    visibility: row.visibility,
    latestVersion: row.versions[0]?.versionNumber ?? null,
    reviewState: experimentId ? (review?.state ?? "unreviewed") : null,
    isDefault:
      experimentId !== null
        ? row.defaultForExperimentId === experimentId
        : row.defaultForExperimentId !== null,
    forkedFrom:
      parent &&
      parent.versionNumber !== null &&
      visibleParentModelIds.has(parent.model.id)
        ? { tag: parent.model.tag, versionNumber: parent.versionNumber }
        : null,
  };
}

/** Prisma include for one version with everything the detail view shows. */
export const versionDetailInclude = {
  datasets: {
    include: { experiment: { select: { atlasdatasetid: true } } },
  },
  peaks: { orderBy: { ordinal: "asc" } },
  tensor: true,
} satisfies Prisma.OpticalModelVersionInclude;

/** A version row loaded with {@link versionDetailInclude}. */
export type VersionDetailRow = Prisma.OpticalModelVersionGetPayload<{
  include: typeof versionDetailInclude;
}>;

/** One peak as returned to clients. */
export interface OpticalModelPeakDto {
  ordinal: number;
  centerEv: number;
  kind: string;
  transition: string | null;
  amplitude: number | null;
  width: number | null;
  shape: string | null;
  centerErr: number | null;
  amplitudeErr: number | null;
  widthErr: number | null;
  experimentId: string | null;
  polarizationId: string | null;
  params: Prisma.JsonValue | null;
  fitProvenance: Prisma.JsonValue | null;
}

/** One dataset link of a version. */
export interface OpticalModelDatasetDto {
  experimentId: string;
  atlasDatasetId: string | null;
  /** Dataset version the link pins, for example `1.0.2`. */
  pinned: string;
  role: string;
}

/** One author of a model version. */
export interface OpticalModelAuthorDto {
  orcid: string;
  name: string | null;
  role: "owner" | "coauthor";
  signed: boolean;
}

/** One version of a model. */
export interface OpticalModelVersionDto {
  /** `null` for a draft. */
  versionNumber: number | null;
  status: "draft" | "published";
  normalization: NormalizationSpec | null;
  peaks: OpticalModelPeakDto[];
  datasets: OpticalModelDatasetDto[];
  tensor: {
    sha256: string;
    byteSize: number;
    manifest: TensorManifest | null;
  } | null;
  authors: OpticalModelAuthorDto[];
  checksum: string | null;
  publishedAt: string | null;
}

/** A model with one selected version. */
export interface OpticalModelDetail extends OpticalModelSummary {
  description: string | null;
  version: OpticalModelVersionDto;
  /** Published version numbers, ascending. */
  versions: number[];
  /** Whether the viewer owns the model and a draft exists. Always false for other viewers. */
  hasDraft: boolean;
}

const authorSnapshotSchema = z.array(
  z.object({
    orcid: z.string(),
    name: z.string().nullable(),
    role: z.enum(["owner", "coauthor"]),
    signed: z.boolean(),
  }),
);

/**
 * Authors of a version as returned to clients.
 *
 * Published versions use their stored snapshot; a snapshot that fails to parse reads as empty.
 * Drafts use the live author rows.
 *
 * @param version - Version row (needs `status` and `authorsSnapshot`).
 * @param liveAuthors - Current author rows of the model with the user's name.
 * @returns The author DTOs.
 */
export function authorsForVersion(
  version: {
    status: "draft" | "published";
    authorsSnapshot: Prisma.JsonValue | null;
  },
  liveAuthors: {
    orcid: string;
    role: "owner" | "coauthor";
    signature: "pending" | "signed";
    user: { name: string | null } | null;
  }[],
): OpticalModelAuthorDto[] {
  if (version.status === "published") {
    const parsed = authorSnapshotSchema.safeParse(version.authorsSnapshot);
    return parsed.success ? parsed.data : [];
  }
  return liveAuthors.map((author) => ({
    orcid: author.orcid,
    name: author.user?.name ?? null,
    role: author.role,
    signed: author.signature === "signed",
  }));
}

/**
 * Version DTO for a version row.
 *
 * @param row - Version loaded with {@link versionDetailInclude}.
 * @param authors - Authors from {@link authorsForVersion}.
 * @returns The version DTO.
 */
export function toVersionDto(
  row: VersionDetailRow,
  authors: OpticalModelAuthorDto[],
): OpticalModelVersionDto {
  const normalization = normalizationSpecSchema.safeParse(row.normalization);
  return {
    versionNumber: row.versionNumber,
    status: row.status,
    normalization: normalization.success ? normalization.data : null,
    peaks: row.peaks.map((peak) => ({
      ordinal: peak.ordinal,
      centerEv: peak.centerEv,
      kind: peak.kind,
      transition: peak.transition,
      amplitude: peak.amplitude,
      width: peak.width,
      shape: peak.shape,
      centerErr: peak.centerErr,
      amplitudeErr: peak.amplitudeErr,
      widthErr: peak.widthErr,
      experimentId: peak.experimentId,
      polarizationId: peak.polarizationId,
      params: peak.params,
      fitProvenance: peak.fitProvenance,
    })),
    datasets: row.datasets.map((dataset) => ({
      experimentId: dataset.experimentId,
      atlasDatasetId: dataset.experiment.atlasdatasetid,
      pinned: formatDatasetVersion({
        major: dataset.pinnedMajor,
        minor: dataset.pinnedMinor,
        patch: dataset.pinnedPatch,
      }),
      role: dataset.role,
    })),
    tensor: row.tensor
      ? {
          sha256: row.tensor.sha256,
          byteSize: row.tensor.byteSize,
          manifest: (() => {
            const parsed = tensorManifestSchema.safeParse(row.tensor.manifest);
            return parsed.success ? parsed.data : null;
          })(),
        }
      : null,
    authors,
    checksum: row.checksum,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}
