/**
 * Resolution of the optional `version` (M.m.p) query parameter on dataset read routes.
 *
 * Replay of historical versions is not implemented: a requested version equal to the dataset's
 * current version is served as usual and echoed in response metadata; any other version is
 * rejected with 422. This module does not read spectrum data.
 */

import { db } from "~/server/db";
import {
  formatDatasetVersion,
  parseDatasetVersion,
} from "~/server/nexafs/dataset-versioning";
import { V1HttpError } from "~/app/api/v1/_lib/write-api";

/** Version metadata echoed in a response that honored `?version=`. */
export interface ServedDatasetVersion {
  /** The `M.m.p` string the caller asked for. */
  requested: string;
  /** The version actually served; equals `requested` because replay is unsupported. */
  served: string;
}

/**
 * Validates `?version=` against a single dataset's current version.
 *
 * @param params - Request URL search params.
 * @param selector - Dataset selector from the same request (`datasetId` UUID or `atlasDatasetId`).
 * @returns Version metadata, or `null` when the request has no `version` parameter.
 * @throws {V1HttpError} 422 when `version` is malformed, no single dataset is selected, or the
 *   version is not the current one; 404 when the dataset does not exist.
 */
export async function resolveRequestedDatasetVersion(
  params: URLSearchParams,
  selector: Readonly<{ datasetId?: string; atlasDatasetId?: string }>,
): Promise<ServedDatasetVersion | null> {
  const raw = params.get("version");
  if (raw === null) {
    return null;
  }
  let requested: string;
  try {
    requested = formatDatasetVersion(parseDatasetVersion(raw.trim()));
  } catch {
    throw new V1HttpError(
      422,
      "UNPROCESSABLE_ENTITY",
      "version must have the form M.m.p (for example 1.2.0).",
    );
  }
  if (!selector.datasetId && !selector.atlasDatasetId) {
    throw new V1HttpError(
      422,
      "UNPROCESSABLE_ENTITY",
      "version requires datasetId or atlasDatasetId.",
    );
  }
  const row = await db.experiments.findFirst({
    where: selector.datasetId
      ? { id: selector.datasetId }
      : { atlasdatasetid: selector.atlasDatasetId },
    select: {
      datasetVersionMajor: true,
      datasetVersionMinor: true,
      datasetVersionPatch: true,
    },
  });
  if (!row) {
    throw new V1HttpError(404, "NOT_FOUND", "Dataset not found");
  }
  const current = formatDatasetVersion({
    major: row.datasetVersionMajor,
    minor: row.datasetVersionMinor,
    patch: row.datasetVersionPatch,
  });
  if (current !== requested) {
    throw new V1HttpError(
      422,
      "UNPROCESSABLE_ENTITY",
      `historical version replay is not available yet (requested ${requested}, current ${current}).`,
    );
  }
  return { requested, served: current };
}
