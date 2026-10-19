/**
 * Shared NEXAFS dataset creation used by `experiments.createWithSpectrum` and `POST /api/v1/datasets`.
 *
 * Validates the upload payload, resolves vendor, sample, geometry, attribution, and derived
 * spectrum columns, and persists the experiment, spectrum points, peaks, source publications,
 * a baseline `experiment_revisions` row, and a `dataset.create` audit event in one transaction.
 * It does not authenticate callers, enforce token scopes, or accept the contribution agreement;
 * the caller (a tRPC procedure or a route that builds a tRPC caller) owns those checks.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  Prisma,
  ExperimentType,
  ProcessMethod,
  type PrismaClient,
} from "~/prisma/client";
import { normalizeDoi } from "~/lib/doi";
import { orcidUserIdSchema } from "~/lib/orcid";
import { dataCiteContributorTypeSchema } from "~/lib/datacite-contributor-types";
import type { PublicationCitation } from "~/lib/publication-citation";
import { normalizeSampleSubstrate } from "~/lib/normalizeSampleSubstrate";
import { plotPeakToPeaksetWrite } from "~/lib/nexafs/peakset-kind";
import { spectrumGeometryKey } from "~/lib/nexafs/spectrum-geometry-key";
import {
  AZIMUTH_DEG_MAX_EXCLUSIVE,
  AZIMUTH_DEG_MIN,
  POLAR_DEG_MAX,
  POLAR_DEG_MIN,
} from "~/features/process-nexafs/utils/polarizationAngle";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";
import { emitAuditEvent } from "~/server/audit/emit-audit-event";
import { ensureAtlasDatasetId } from "~/server/nexafs/atlas-dataset-id";
import { resolvePublicationDoi } from "~/server/nexafs/lookupPublicationDoi";
import { syncExperimentSourcePublications } from "~/server/nexafs/syncExperimentSourcePaperDoi";
import {
  coalesceUploadedOrDerived,
  computeSpectrumDerivedScalarColumns,
} from "~/server/nexafs/computeSpectrumDerivedColumns";
import {
  buildChannelProvenance,
  buildQualityScores,
  buildValidationSummary,
  type NormalizationRanges,
  type NormalizationScope,
  type UploadedChannel,
} from "~/server/nexafs/normalizationMetadata";
import { canonicalJsonChecksum } from "~/server/nexafs/apply-versioned-change";
import { formatDatasetVersion } from "~/server/nexafs/dataset-versioning";
import { persistExperimentMetricsTables } from "~/server/nexafs/persistExperimentMetricsTables";
import {
  buildKkDeltaMetadata,
  deriveKkDeltaSourceOnCreate,
  kkDeltaMetadataToJson,
} from "~/server/nexafs/kkDeltaMetadata";
import { kkDeltaSubmitValidationErrors } from "~/server/nexafs/kkDeltaSubmitValidation";
import {
  formatConflictingDuplicateEnergyMessage,
  formatSpectrumPointsUniqueConstraintMessage,
  isSpectrumPointsEnergyUniqueViolation,
  prepareSpectrumPointsForUniqueEnergyInsert,
} from "~/server/nexafs/spectrumPointEnergyUniqueness";
import {
  assertValidCreateAttributions,
  buildContributorInsertRows,
  ensureUploaderOwnerAttribution,
  normalizeAttributionInputs,
  resolveKnownCollectorUserIds,
  type ExperimentAttributionInput,
} from "~/server/nexafs/experimentAttributions";

/** Version assigned to every newly created dataset (matches the column defaults). */
const INITIAL_DATASET_VERSION = { major: 1, minor: 0, patch: 0 } as const;

/** Zod schema for one polarization geometry: polar angle `theta` and azimuth `phi` in degrees. */
export const polarizationAngleSchema = z.object({
  theta: z.number().finite().min(POLAR_DEG_MIN).max(POLAR_DEG_MAX),
  phi: z.number().finite().min(AZIMUTH_DEG_MIN).lt(AZIMUTH_DEG_MAX_EXCLUSIVE),
});

/** Zod schema for a source-publication DOI; normalizes to canonical form or rejects as "Invalid DOI". */
export const sourcePaperDoiInputSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .transform((value, ctx) => {
    const normalized = normalizeDoi(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid DOI",
      });
      return z.NEVER;
    }
    return normalized;
  });

/** Zod schema for an attribution role: a DataCite contributor type or the DB roles `owner` / `collector`. */
export const experimentAttributionRoleSchema = z.union([
  dataCiteContributorTypeSchema,
  z.literal("owner"),
  z.literal("collector"),
]);

const unifiedNormalizationRangesSchema = z.object({
  pre: z.tuple([z.number(), z.number()]).nullable(),
  post: z.tuple([z.number(), z.number()]).nullable(),
  bandMode: z.enum(["both", "pre", "post"]).optional(),
});

const perChannelNormalizationRangesSchema = z.object({
  od: unifiedNormalizationRangesSchema,
  massabsorption: unifiedNormalizationRangesSchema,
  beta: unifiedNormalizationRangesSchema,
});

const normalizationRangesInputSchema = z.union([
  unifiedNormalizationRangesSchema,
  perChannelNormalizationRangesSchema,
]);

/** Zod schema for the normalization scope and pre/post-edge energy windows (eV). */
export const normalizationSchema = z.object({
  scope: z.enum(["none", "unified", "per_channel"]),
  ranges: normalizationRangesInputSchema.nullable(),
});

const emptyDerivedScalars = (): {
  od: Array<number | null>;
  massabsorption: Array<number | null>;
  beta: Array<number | null>;
} => ({ od: [], massabsorption: [], beta: [] });

function spectrumRowsHaveUploadedDerivedScalars(
  points: ReadonlyArray<{
    od?: number;
    massabsorption?: number;
    beta?: number;
  }>,
): boolean {
  if (points.length === 0) return false;
  return points.every(
    (p) =>
      typeof p.od === "number" &&
      Number.isFinite(p.od) &&
      typeof p.massabsorption === "number" &&
      Number.isFinite(p.massabsorption) &&
      typeof p.beta === "number" &&
      Number.isFinite(p.beta),
  );
}

function geometryGroupsHaveClientDerivedScalar(
  groups: ReadonlyArray<{
    points: ReadonlyArray<{
      od?: number;
      massabsorption?: number;
      beta?: number;
    }>;
  }>,
  channel: "od" | "massabsorption" | "beta",
): boolean {
  return groups.some((group) => {
    if (group.points.length === 0) {
      return false;
    }
    return group.points.every((point) => {
      const value = point[channel];
      return typeof value === "number" && Number.isFinite(value);
    });
  });
}

/**
 * Zod schema of the dataset creation payload: sample, experiment, geometry, spectrum points,
 * optional peaks, attributions, collectors, and source-publication DOIs.
 */
export const createWithSpectrumInputSchema = z.object({
  sample: z.object({
    moleculeId: z.string().uuid(),
    identifier: z.string().optional(),
    processMethod: z.nativeEnum(ProcessMethod).optional(),
    substrate: z.string().optional(),
    patterningLayer: z.string().optional(),
    solvent: z.string().optional(),
    thickness: z.number().optional(),
    molecularWeight: z.number().optional(),
    vendor: z.object({
      existingVendorId: z.string().uuid().optional(),
      name: z.string().optional(),
      url: z.string().url().optional(),
    }),
  }),
  experiment: z.object({
    instrumentId: z.string(),
    edgeId: z.string().uuid(),
    experimentType: z.nativeEnum(ExperimentType),
    calibrationId: z.string().uuid().optional(),
    referenceStandard: z.string().optional(),
    isStandard: z.boolean().optional(),
    normalization: normalizationSchema.optional(),
    uploadedChannels: z
      .array(z.enum(["rawabs", "od", "massabsorption", "beta"]))
      .optional(),
    computeKkDeltaOnSubmit: z.boolean().optional(),
    validationOverride: z
      .object({
        bypass: z.boolean(),
        reason: z.string().trim().min(1).optional(),
      })
      .optional(),
  }),
  geometry: z
    .object({
      mode: z.enum(["fixed", "csv"]),
      fixed: polarizationAngleSchema.optional(),
      csvGeometries: z.array(polarizationAngleSchema).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.mode === "fixed" && !value.fixed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fixed geometry requires theta and phi values",
        });
      }
      if (
        value.mode === "csv" &&
        (!value.csvGeometries || value.csvGeometries.length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CSV geometry mode requires at least one geometry entry",
        });
      }
    }),
  spectrum: z.object({
    points: z
      .array(
        z.object({
          energy: z.number(),
          absorption: z.number(),
          theta: z.number().min(POLAR_DEG_MIN).max(POLAR_DEG_MAX).optional(),
          phi: z
            .number()
            .min(AZIMUTH_DEG_MIN)
            .lt(AZIMUTH_DEG_MAX_EXCLUSIVE)
            .optional(),
          i0: z.number().optional(),
          od: z.number().optional(),
          rawabsError: z.number().optional(),
          odError: z.number().optional(),
          massabsorption: z.number().optional(),
          massabsorptionError: z.number().optional(),
          beta: z.number().optional(),
          betaError: z.number().optional(),
          delta: z.number().finite().optional(),
          deltaError: z.number().optional(),
        }),
      )
      .min(1, "Spectrum CSV must contain at least one row"),
  }),
  peaksets: z
    .array(
      z.object({
        energy: z.number(),
        intensity: z.number().optional(),
        bond: z.string().optional(),
        transition: z.string().optional(),
        peakKind: z.string().nullable().optional(),
      }),
    )
    .max(500)
    .optional(),
  collectedByUserIds: z.array(orcidUserIdSchema).max(100).optional(),
  collectedByOrcidIds: z.array(orcidUserIdSchema).max(100).optional(),
  attributions: z
    .array(
      z.object({
        orcid: orcidUserIdSchema,
        role: experimentAttributionRoleSchema,
      }),
    )
    .max(100)
    .optional(),
  sourcePaperDoi: sourcePaperDoiInputSchema.optional(),
  sourcePaperDois: z.array(sourcePaperDoiInputSchema).max(20).optional(),
});

/** Validated dataset creation payload (parsed output of {@link createWithSpectrumInputSchema}). */
export type CreateWithSpectrumInput = z.infer<
  typeof createWithSpectrumInputSchema
>;

/** Database handle and acting user for {@link createExperimentWithSpectrum}. */
export interface CreateExperimentContext {
  db: PrismaClient;
  /** ORCID iD of the uploader; becomes owner, curator, and default collector. */
  userId: string;
}

/**
 * Persists a dataset and returns the created sample and experiment rows, with the
 * point count per experiment. Shape is the contract of `experiments.createWithSpectrum`.
 *
 * @param ctx - Prisma client and acting user ORCID iD.
 * @param input - Validated creation payload.
 * @returns The sample row and one entry per created experiment.
 * @throws {TRPCError} BAD_REQUEST for invalid payload content, FORBIDDEN when collection is
 *   attributed to another user without a privileged role, CONFLICT when the sample identifier
 *   belongs to a different molecule.
 */
export async function createExperimentWithSpectrumDetailed(
  ctx: CreateExperimentContext,
  input: CreateWithSpectrumInput,
) {
  const {
    sample: sampleInput,
    experiment: experimentInput,
    geometry: geometryInput,
    spectrum: spectrumInput,
    collectedByUserIds,
    collectedByOrcidIds,
    attributions: attributionsInput,
    sourcePaperDoi: sourcePaperDoiInput,
    sourcePaperDois: sourcePaperDoisInput,
  } = input;

  const sourceDoiCandidates = [
    ...(sourcePaperDoisInput ?? []),
    ...(sourcePaperDoiInput ? [sourcePaperDoiInput] : []),
  ];
  const uniqueSourceDois = [
    ...new Set(
      sourceDoiCandidates
        .map((value) => normalizeDoi(value))
        .filter((value): value is string => value != null),
    ),
  ];

  const sourcePaperCitations: PublicationCitation[] = [];
  for (const doi of uniqueSourceDois) {
    const citation = await resolvePublicationDoi(doi);
    if (!citation) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Source publication DOI was not found in Crossref or DataCite. Check the identifier or try again later.",
      });
    }
    sourcePaperCitations.push(citation);
  }
  const normalizationScope: NormalizationScope =
    experimentInput.normalization?.scope ?? "none";
  const normalizationRanges: NormalizationRanges =
    experimentInput.normalization?.ranges ?? null;
  const uploadedChannels = Array.from(
    new Set<UploadedChannel>([
      ...(experimentInput.uploadedChannels ?? []),
      "rawabs",
    ]),
  );
  const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
  const requestedCollectedBy = [
    ...new Set(
      (collectedByUserIds ?? []).filter(
        (id) => orcidUserIdSchema.safeParse(id).success,
      ),
    ),
  ];
  const requestedCollectedByOrcid = [
    ...new Set(
      (collectedByOrcidIds ?? []).filter(
        (id) => orcidUserIdSchema.safeParse(id).success,
      ),
    ),
  ];
  if (
    !isPrivilegedUser &&
    requestedCollectedBy.some((userId) => userId !== ctx.userId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only attribute collection to your own user account",
    });
  }

  const moleculeRow = await ctx.db.molecules.findUnique({
    where: { id: sampleInput.moleculeId },
    select: { chemicalformula: true },
  });
  const chemicalFormula = moleculeRow?.chemicalformula ?? null;

  type SpectrumPoint = (typeof spectrumInput.points)[number];

  interface GeometryGroup {
    theta: number;
    phi: number;
    points: SpectrumPoint[];
  }

  const geometryGroups: GeometryGroup[] = [];

  if (geometryInput.mode === "fixed") {
    const fixedGeometry = geometryInput.fixed!;
    geometryGroups.push({
      theta: fixedGeometry.theta,
      phi: fixedGeometry.phi,
      points: spectrumInput.points.map((point) => ({
        ...point,
        theta: fixedGeometry.theta,
        phi: fixedGeometry.phi,
      })),
    });
  } else {
    const groupedByGeometry = new Map<string, GeometryGroup>();

    for (const point of spectrumInput.points) {
      if (point.theta === undefined || point.phi === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Spectrum CSV must include theta and phi columns when using CSV geometry mode.",
        });
      }

      const key = spectrumGeometryKey(point.theta, point.phi);
      if (!groupedByGeometry.has(key)) {
        groupedByGeometry.set(key, {
          theta: point.theta,
          phi: point.phi,
          points: [],
        });
      }

      groupedByGeometry.get(key)!.points.push(point);
    }

    if (groupedByGeometry.size === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No spectrum points with geometry information were found.",
      });
    }

    geometryGroups.push(...groupedByGeometry.values());
  }

  for (const group of geometryGroups) {
    const uniqueness = prepareSpectrumPointsForUniqueEnergyInsert(group.points);
    if (!uniqueness.ok) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: formatConflictingDuplicateEnergyMessage(
          { theta: group.theta, phi: group.phi },
          uniqueness.conflictingEnergies,
        ),
      });
    }
    group.points = uniqueness.points;
  }

  const derivedByGroup: Array<
    Awaited<ReturnType<typeof computeSpectrumDerivedScalarColumns>>
  > = [];

  for (const group of geometryGroups) {
    if (spectrumRowsHaveUploadedDerivedScalars(group.points)) {
      derivedByGroup.push(emptyDerivedScalars());
    } else {
      derivedByGroup.push(
        await computeSpectrumDerivedScalarColumns(
          group.points,
          chemicalFormula,
        ),
      );
    }
  }

  const transactionResult = await ctx.db.$transaction(
    async (tx) => {
      const kind =
        experimentInput.experimentType != null
          ? await tx.nexafsexperimentkinds.findUnique({
              where: { experimenttype: experimentInput.experimentType },
              select: { id: true },
            })
          : null;
      let normalizedCollectedBy =
        requestedCollectedBy.length > 0
          ? requestedCollectedBy
          : ctx.userId != null
            ? [ctx.userId]
            : [];
      if (normalizedCollectedBy.length > 0) {
        const existingUsers = await tx.user.findMany({
          where: { id: { in: normalizedCollectedBy } },
          select: { id: true },
        });
        const existingUserIds = new Set(existingUsers.map((user) => user.id));
        const hasAttributionPayload =
          attributionsInput != null && attributionsInput.length > 0;
        if (existingUsers.length !== normalizedCollectedBy.length) {
          if (hasAttributionPayload) {
            normalizedCollectedBy = normalizedCollectedBy.filter((userId) =>
              existingUserIds.has(userId),
            );
          } else {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "One or more collected-by users do not exist",
            });
          }
        }
      }
      const normalizedCollectorOrcidIds = [
        ...new Set([...normalizedCollectedBy, ...requestedCollectedByOrcid]),
      ];

      let attributionRows: ExperimentAttributionInput[] =
        attributionsInput != null && attributionsInput.length > 0
          ? normalizeAttributionInputs(attributionsInput)
          : [];
      if (attributionRows.length === 0) {
        if (ctx.userId) {
          attributionRows.push({ orcid: ctx.userId, role: "DataCurator" });
        }
        for (const collectorOrcid of normalizedCollectorOrcidIds) {
          if (ctx.userId && collectorOrcid === ctx.userId) {
            continue;
          }
          attributionRows.push({
            orcid: collectorOrcid,
            role: "DataCollector",
          });
        }
      }
      attributionRows = ensureUploaderOwnerAttribution(
        attributionRows,
        ctx.userId,
      );
      assertValidCreateAttributions(attributionRows);
      const contributorInsertRows = await buildContributorInsertRows(
        tx,
        attributionRows,
        ctx.userId,
      );
      const collectedByFromAttributions = await resolveKnownCollectorUserIds(
        tx,
        attributionRows,
      );
      const normalizedCollectedByForExperiment =
        collectedByFromAttributions.length > 0
          ? collectedByFromAttributions
          : normalizedCollectedBy;

      // Resolve vendor
      let vendorId: string | null = sampleInput.vendor.existingVendorId ?? null;
      const vendorNameTrimmed = sampleInput.vendor.name?.trim();

      if (!vendorId && vendorNameTrimmed) {
        const existingVendor = await tx.vendors.findUnique({
          where: { name: vendorNameTrimmed },
        });

        if (existingVendor) {
          vendorId = existingVendor.id;
        } else {
          const newVendor = await tx.vendors.create({
            data: {
              name: vendorNameTrimmed,
              url: sampleInput.vendor.url?.trim() ?? null,
            },
          });
          vendorId = newVendor.id;
        }
      }

      if (!vendorId && !vendorNameTrimmed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Please select an existing vendor or provide a new vendor name.",
        });
      }

      // Generate identifier if not provided, or ensure it's unique if provided
      let sampleIdentifier = sampleInput.identifier?.trim();

      if (!sampleIdentifier) {
        // Generate a unique identifier if not provided
        // Format: SAMPLE-{timestamp}-{random}
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        sampleIdentifier = `SAMPLE-${timestamp}-${random}`;

        // Ensure uniqueness (very unlikely but check anyway)
        let counter = 0;
        while (counter < 10) {
          const existingSample = await tx.samples.findUnique({
            where: { identifier: sampleIdentifier },
          });

          if (!existingSample) break;

          // Regenerate if collision
          const newRandom = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
          sampleIdentifier = `SAMPLE-${timestamp}-${newRandom}`;
          counter++;
        }
      }

      // Check if sample with this identifier already exists
      let sample = await tx.samples.findUnique({
        where: { identifier: sampleIdentifier },
      });

      if (!sample) {
        // Create new sample if it doesn't exist
        sample = await tx.samples.create({
          data: {
            moleculeid: sampleInput.moleculeId,
            identifier: sampleIdentifier,
            processmethod: sampleInput.processMethod ?? null,
            substrate: normalizeSampleSubstrate(sampleInput.substrate),
            patterninglayer: sampleInput.patterningLayer?.trim() ?? null,
            solvent: sampleInput.solvent?.trim() ?? null,
            thickness: sampleInput.thickness ?? null,
            molecularweight: sampleInput.molecularWeight ?? null,
            vendorid: vendorId,
          },
        });
      } else {
        if (sample.moleculeid !== sampleInput.moleculeId) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "A sample with this identifier already exists for a different molecule.",
          });
        }
      }

      const polarizationIdByGeometry = new Map<string, string>();

      const getOrCreatePolarizationId = async (theta: number, phi: number) => {
        const key = spectrumGeometryKey(theta, phi);
        const cached = polarizationIdByGeometry.get(key);
        if (cached) return cached;

        const existingPolarization = await tx.polarizations.findFirst({
          where: {
            polardeg: new Prisma.Decimal(theta),
            azimuthdeg: new Prisma.Decimal(phi),
          },
          select: { id: true },
        });

        if (existingPolarization) {
          polarizationIdByGeometry.set(key, existingPolarization.id);
          return existingPolarization.id;
        }

        const createdPolarization = await tx.polarizations.create({
          data: {
            polardeg: new Prisma.Decimal(theta),
            azimuthdeg: new Prisma.Decimal(phi),
          },
          select: { id: true },
        });
        polarizationIdByGeometry.set(key, createdPolarization.id);
        return createdPolarization.id;
      };

      const firstGeometry = geometryGroups[0];
      if (!firstGeometry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No geometry groups were resolved from the uploaded spectrum.",
        });
      }

      const defaultPolarizationId = await getOrCreatePolarizationId(
        firstGeometry.theta,
        firstGeometry.phi,
      );

      const experimentId = crypto.randomUUID();
      const validationSummary = buildValidationSummary({
        points: spectrumInput.points,
        ranges: normalizationRanges,
        scope: normalizationScope,
        override: {
          bypass: experimentInput.validationOverride?.bypass ?? false,
          reason: experimentInput.validationOverride?.reason,
        },
      });
      const qualityScores = buildQualityScores({
        points: spectrumInput.points,
        ranges: normalizationRanges,
        scope: normalizationScope,
        doiPresent: sourcePaperCitations.length > 0,
      });
      const hasDerivedValues = {
        od:
          derivedByGroup.some((group) =>
            group.od.some((value) => value != null),
          ) ||
          (!uploadedChannels.includes("od") &&
            geometryGroupsHaveClientDerivedScalar(geometryGroups, "od")),
        massabsorption:
          derivedByGroup.some((group) =>
            group.massabsorption.some((value) => value != null),
          ) ||
          (!uploadedChannels.includes("massabsorption") &&
            geometryGroupsHaveClientDerivedScalar(
              geometryGroups,
              "massabsorption",
            )),
        beta:
          derivedByGroup.some((group) =>
            group.beta.some((value) => value != null),
          ) ||
          (!uploadedChannels.includes("beta") &&
            geometryGroupsHaveClientDerivedScalar(geometryGroups, "beta")),
      };
      const channelProvenance = buildChannelProvenance({
        uploadedChannels,
        hasDerivedValues,
      });

      let spectrumHasDelta = false;
      for (const group of geometryGroups) {
        for (const point of group.points) {
          const deltaVal = coalesceUploadedOrDerived(point.delta, null);
          if (deltaVal != null && Number.isFinite(deltaVal)) {
            spectrumHasDelta = true;
            break;
          }
        }
        if (spectrumHasDelta) {
          break;
        }
      }

      const kkSubmitValidationErrors = kkDeltaSubmitValidationErrors(
        experimentInput.computeKkDeltaOnSubmit,
        spectrumInput.points,
      );
      if (kkSubmitValidationErrors.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: kkSubmitValidationErrors[0]!,
        });
      }

      const kkDeltaSourceOnCreate = deriveKkDeltaSourceOnCreate({
        spectrumHasFiniteDelta: spectrumHasDelta,
        computeKkDeltaOnSubmit: experimentInput.computeKkDeltaOnSubmit,
      });
      const kkDeltaMetadataOnCreate =
        kkDeltaSourceOnCreate != null
          ? buildKkDeltaMetadata({
              source: kkDeltaSourceOnCreate,
              calculatedByUserId: ctx.userId,
            })
          : null;

      const experiment = await tx.experiments.create({
        data: {
          id: experimentId,
          sampleid: sample.id,
          instrumentid: experimentInput.instrumentId,
          edgeid: experimentInput.edgeId,
          polarizationid: defaultPolarizationId,
          calibrationid: experimentInput.calibrationId ?? null,
          isstandard: experimentInput.isStandard ?? false,
          referencestandard: experimentInput.referenceStandard ?? null,
          createdby: ctx.userId ?? undefined,
          experimenttype: experimentInput.experimentType,
          nexafsexperimentkindid: kind?.id ?? null,
          collectedbyuserids: normalizedCollectedByForExperiment,
          normalizationscope: normalizationScope,
          normalizationranges:
            normalizationRanges as unknown as Prisma.InputJsonValue,
          uploadedchannels:
            uploadedChannels as unknown as Prisma.InputJsonValue,
          channelprovenance:
            channelProvenance as unknown as Prisma.InputJsonValue,
          kkdeltametadata:
            kkDeltaMetadataOnCreate != null
              ? kkDeltaMetadataToJson(kkDeltaMetadataOnCreate)
              : undefined,
          validationsummary:
            validationSummary as unknown as Prisma.InputJsonValue,
          qualityscores: qualityScores as unknown as Prisma.InputJsonValue,
        },
        include: {
          samples: true,
          edges: true,
          instruments: true,
        },
      });

      await ensureAtlasDatasetId(tx, experiment.id);

      const baselineParameters = {
        normalizationRanges:
          normalizationRanges as unknown as Prisma.InputJsonValue,
        channelProvenance:
          channelProvenance as unknown as Prisma.InputJsonValue,
        uploadedChannels: uploadedChannels as unknown as Prisma.InputJsonValue,
        kkDeltaMetadata:
          kkDeltaMetadataOnCreate != null
            ? kkDeltaMetadataToJson(kkDeltaMetadataOnCreate)
            : null,
      } as Prisma.InputJsonObject;
      await tx.experimentRevision.create({
        data: {
          experimentId: experiment.id,
          versionMajor: INITIAL_DATASET_VERSION.major,
          versionMinor: INITIAL_DATASET_VERSION.minor,
          versionPatch: INITIAL_DATASET_VERSION.patch,
          actorUserId: null,
          changeKind: "baseline",
          parameters: baselineParameters,
          derivedChecksum: canonicalJsonChecksum({
            normalizationscope: normalizationScope,
            normalizationranges:
              normalizationRanges as unknown as Prisma.InputJsonValue,
            uploadedchannels:
              uploadedChannels as unknown as Prisma.InputJsonValue,
            channelprovenance:
              channelProvenance as unknown as Prisma.InputJsonValue,
            validationsummary:
              validationSummary as unknown as Prisma.InputJsonValue,
            qualityscores: qualityScores as unknown as Prisma.InputJsonValue,
          }),
        },
      });
      await emitAuditEvent({
        eventType: "dataset.create",
        eventScope: `experiment:${experiment.id}`,
        actorUserId: ctx.userId,
        payload: {
          experimentId: experiment.id,
          version: formatDatasetVersion(INITIAL_DATASET_VERSION),
          moleculeId: sampleInput.moleculeId,
          instrumentId: experimentInput.instrumentId,
          edgeId: experimentInput.edgeId,
          experimentType: experimentInput.experimentType,
        },
        db: tx,
      });

      if (contributorInsertRows.length > 0) {
        await tx.experimentcontributors.createMany({
          data: contributorInsertRows.map((row) => ({
            experimentid: experiment.id,
            orcidid: row.orcidid,
            userid: row.userid,
            role: row.role,
            claimstatus: row.claimstatus,
            isclaimed: row.isclaimed,
            ispublicprofilevisible: row.ispublicprofilevisible,
            claimedat: row.claimedat,
            detachedat: row.detachedat,
          })),
          skipDuplicates: true,
        });
      }

      let spectrumPointsCreated = 0;
      for (
        let groupIndex = 0;
        groupIndex < geometryGroups.length;
        groupIndex += 1
      ) {
        const group = geometryGroups[groupIndex]!;
        const derived = derivedByGroup[groupIndex]!;
        const polarizationId = await getOrCreatePolarizationId(
          group.theta,
          group.phi,
        );

        const spectrumData = group.points.map((point, i) => ({
          experimentid: experiment.id,
          polarizationid: polarizationId,
          energyev: point.energy,
          rawabs: point.absorption,
          od: coalesceUploadedOrDerived(point.od, derived.od[i] ?? null),
          rawabserr: coalesceUploadedOrDerived(point.rawabsError, null),
          oderr: coalesceUploadedOrDerived(point.odError, null),
          massabsorption: coalesceUploadedOrDerived(
            point.massabsorption,
            derived.massabsorption[i] ?? null,
          ),
          massabsorptionerr: coalesceUploadedOrDerived(
            point.massabsorptionError,
            null,
          ),
          beta: coalesceUploadedOrDerived(point.beta, derived.beta[i] ?? null),
          betaerr: coalesceUploadedOrDerived(point.betaError, null),
          delta: coalesceUploadedOrDerived(point.delta, null),
          deltaerr: coalesceUploadedOrDerived(point.deltaError, null),
          i0: coalesceUploadedOrDerived(point.i0, null),
        }));

        if (spectrumData.length > 0) {
          try {
            const created = await tx.spectrumpoints.createMany({
              data: spectrumData,
            });
            spectrumPointsCreated += created.count;
          } catch (error) {
            if (isSpectrumPointsEnergyUniqueViolation(error)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: formatSpectrumPointsUniqueConstraintMessage(),
              });
            }
            throw error;
          }
        }
      }

      if (input.peaksets && input.peaksets.length > 0) {
        const peaksetsData = input.peaksets.map((peak) => {
          const mapped = plotPeakToPeaksetWrite(peak);
          return {
            experimentid: experiment.id,
            energyev: mapped.energyev,
            intensity: mapped.intensity,
            bond: mapped.bond,
            transition: mapped.transition,
          };
        });
        await tx.peaksets.createMany({ data: peaksetsData });
      }

      if (sourcePaperCitations.length > 0) {
        await syncExperimentSourcePublications(
          tx,
          experiment.id,
          sourcePaperCitations,
        );
      }

      return {
        sample,
        experiments: [
          {
            experiment,
            spectrumPointsCreated,
          },
        ],
      };
    },
    { timeout: 60000 },
  );

  for (const entry of transactionResult.experiments) {
    await persistExperimentMetricsTables(ctx.db, entry.experiment.id);
  }

  return transactionResult;
}

/**
 * Creates a NEXAFS dataset at version 1.0.0 with a baseline revision and a `dataset.create`
 * audit event.
 *
 * @param ctx - Prisma client and acting user ORCID iD.
 * @param input - Validated creation payload.
 * @returns The new experiment id and the initial version label.
 * @throws {TRPCError} as {@link createExperimentWithSpectrumDetailed}.
 */
export async function createExperimentWithSpectrum(
  ctx: CreateExperimentContext,
  input: CreateWithSpectrumInput,
): Promise<{ experimentId: string; version: "1.0.0" }> {
  const result = await createExperimentWithSpectrumDetailed(ctx, input);
  const created = result.experiments[0];
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Dataset creation produced no experiment.",
    });
  }
  return { experimentId: created.experiment.id, version: "1.0.0" };
}
