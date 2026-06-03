import type { Prisma } from "~/prisma/client";
import { z } from "zod";
import { normalizeDoi } from "~/lib/doi";

export { normalizeDoi } from "~/lib/doi";

const truthyBoolean = z.enum(["true", "false"]).transform((value) => value === "true");

const optionalUuid = z.string().uuid().optional();
const optionalNonEmpty = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .optional();

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
      doi: z.string().trim().min(1).max(512),
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
export function parseDatasetExportQuery(params: URLSearchParams) {
  const parsed = z
    .object({
      moleculeId: optionalUuid,
      edgeId: optionalUuid,
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
    doi?: string | null;
  }>,
): Prisma.experimentsWhereInput {
  const where: Prisma.experimentsWhereInput = {};

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
