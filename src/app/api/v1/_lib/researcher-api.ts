import type { Prisma } from "~/prisma/client";
import { z } from "zod";
import { normalizeAtlasDatasetId } from "~/lib/atlas-dataset-id";
import { normalizeDoi } from "~/lib/doi";

export { normalizeDoi } from "~/lib/doi";

const truthyBoolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const optionalUuid = z.string().uuid().optional();
const optionalNonEmpty = z.string().trim().min(1).max(512).optional();
const optionalAtlasDatasetId = z
  .string()
  .trim()
  .optional()
  .transform((value, context) => {
    if (value === undefined) {
      return undefined;
    }
    const stripped = value.replace(/^\/?d\//i, "");
    const id = normalizeAtlasDatasetId(stripped);
    if (!id) {
      context.addIssue({
        code: "custom",
        message:
          "atlasDatasetId must be an 8-character Atlas dataset id, or d/{id}.",
      });
      return z.NEVER;
    }
    return id;
  });

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Parses and validates catalog query parameters for `GET /api/v1/molecules`.
 *
 * @param params - URL search params from a request URL.
 * @returns Parsed molecule catalog query contract with pagination and filter defaults.
 * @throws `ZodError` when any query parameter violates the public API contract.
 */
export function parseMoleculeCatalogQuery(params: URLSearchParams) {
  return z
    .object({
      q: z.string().trim().max(256).optional(),
      hasCas: truthyBoolean.optional(),
      synonymsCountMax: z.coerce.number().int().min(0).max(1000).optional(),
      synonymsLimit: z.coerce.number().int().min(1).max(20).default(5),
    })
    .merge(paginationSchema)
    .parse(Object.fromEntries(params));
}

/**
 * Parses and validates dataset summary query parameters for `GET /api/v1/datasets`.
 *
 * @param params - URL search params from a request URL.
 * @returns Parsed filter and pagination contract for dataset discovery.
 * @throws `ZodError` when parameters are malformed or outside documented ranges.
 */
export function parseDatasetSummaryQuery(params: URLSearchParams) {
  const parsed = z
    .object({
      moleculeId: optionalUuid,
      edgeId: optionalUuid,
      atlasDatasetId: optionalAtlasDatasetId,
      doi: optionalNonEmpty,
    })
    .merge(paginationSchema)
    .parse(Object.fromEntries(params));

  return {
    ...parsed,
    doi: normalizeDoi(parsed.doi),
  };
}

/**
 * Parses and validates DOI-first discovery query parameters for `GET /api/v1/datasets/discover`.
 *
 * @param params - URL search params from a request URL.
 * @returns Parsed query with required DOI and optional molecule/edge scoping.
 * @throws `ZodError` when DOI is missing or query parameters are invalid.
 */
export function parseDoiDiscoveryQuery(params: URLSearchParams) {
  const parsed = z
    .object({
      doi: z
        .string({
          required_error: "DOI is required.",
          invalid_type_error: "DOI is required.",
        })
        .trim()
        .min(1, "DOI is required.")
        .max(512),
      moleculeId: optionalUuid,
      edgeId: optionalUuid,
    })
    .parse(Object.fromEntries(params));

  return {
    ...parsed,
    doi: normalizeDoi(parsed.doi),
  };
}

/**
 * Parses and validates export query parameters for `GET /api/v1/datasets/export`.
 *
 * @param params - URL search params from a request URL.
 * @returns Parsed export contract with optional filters and output format.
 * @throws `ZodError` when the request does not satisfy endpoint parameter constraints.
 */
/**
 * Parses `GET /api/v1/datasets/preview`.
 *
 * Requires `datasetId` or `atlasDatasetId`. `rows` is how many leading
 * energy samples to keep for each polarization pair.
 *
 * @param params - URL search params from a request URL.
 * @returns The dataset selector and the per-polarization sample count.
 * @throws {ZodError} when neither id is present or `rows` is outside 5 to 10.
 */
export function parseDatasetPreviewQuery(params: URLSearchParams) {
  return z
    .object({
      datasetId: optionalUuid,
      atlasDatasetId: optionalAtlasDatasetId,
      rows: z.coerce.number().int().min(5).max(10).default(8),
    })
    .superRefine((value, context) => {
      if (!value.datasetId && !value.atlasDatasetId) {
        context.addIssue({
          code: "custom",
          message: "Provide datasetId or atlasDatasetId.",
          path: ["datasetId"],
        });
      }
    })
    .parse(Object.fromEntries(params));
}

export function parseDatasetExportQuery(params: URLSearchParams) {
  const parsed = z
    .object({
      moleculeId: optionalUuid,
      edgeId: optionalUuid,
      datasetId: optionalUuid,
      atlasDatasetId: optionalAtlasDatasetId,
      doi: optionalNonEmpty,
      format: z.enum(["json", "csv"]).default("json"),
      limit: z.coerce.number().int().min(1).max(100000).default(10000),
    })
    .parse(Object.fromEntries(params));

  return {
    ...parsed,
    doi: normalizeDoi(parsed.doi),
  };
}

/**
 * Builds the Prisma `where` contract for filtering experiments by molecule, edge, and DOI.
 *
 * @param filters - Normalized filter object including optional `moleculeId`, `edgeId`, and canonical `doi`.
 * @returns Prisma-compatible `experiments` where input for shared route handler filtering.
 */
export function buildExperimentWhere(
  filters: Readonly<{
    moleculeId?: string;
    edgeId?: string;
    datasetId?: string;
    atlasDatasetId?: string;
    doi?: string | null;
  }>,
): Prisma.experimentsWhereInput {
  const where: Prisma.experimentsWhereInput = {};

  if (filters.datasetId) {
    where.id = filters.datasetId;
  }

  if (filters.atlasDatasetId) {
    where.atlasdatasetid = filters.atlasDatasetId;
  }

  if (filters.moleculeId) {
    where.samples = {
      moleculeid: filters.moleculeId,
    };
  }

  if (filters.edgeId) {
    where.edgeid = filters.edgeId;
  }

  if (filters.doi) {
    where.experimentpublications = {
      some: {
        publications: {
          doi: filters.doi,
        },
      },
    };
  }

  return where;
}

/**
 * Returns the canonical edge label used in API payloads.
 *
 * @param targetAtom - Element symbol or atom label (for example `C`).
 * @param coreState - Core-state descriptor (for example `K`).
 * @returns Canonical display label in the form `<targetAtom>(<coreState>)`.
 */
export function formatEdgeLabel(targetAtom: string, coreState: string): string {
  return `${targetAtom}(${coreState})`;
}
