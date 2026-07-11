/**
 * Per-dataset validation of published Zenodo metadata against Atlas citation contracts.
 *
 * Checks that descriptions and related identifiers use the short `/d/{id}` URL,
 * avoid loopback hosts, and keep the Zenodo DOI / title coherent with Atlas.
 */

import {
  buildAtlasDatasetCitationUrl,
  descriptionContainsLegacyBrowseExperimentUrl,
  descriptionContainsLoopbackAtlasUrl,
} from "~/server/zenodo/atlas-public-site-origin";
import { normalizeDoi } from "~/lib/doi";
import type { ZenodoDepositMetadata } from "~/server/zenodo/zenodo-client";

export interface ZenodoDatasetValidationIssue {
  code:
    | "missing_atlas_dataset_id"
    | "missing_d_url_in_description"
    | "loopback_url"
    | "legacy_browse_url"
    | "missing_related_atlas_url"
    | "doi_mismatch"
    | "empty_title"
    | "title_drift"
    | "wrong_upload_type";
  message: string;
}

export interface ValidateZenodoDatasetMetadataInput {
  atlasDatasetId: string | null | undefined;
  expectedDoi?: string | null;
  metadata: Pick<
    ZenodoDepositMetadata,
    "title" | "description" | "upload_type" | "related_identifiers"
  > & {
    doi?: string | null;
  };
}

/**
 * Validates one Zenodo deposit metadata payload for Atlas `/d/` citation parity.
 *
 * @param input - Atlas id, optional expected DOI, and Zenodo metadata fields.
 * @returns Ordered list of issues; empty when the deposit passes.
 */
export function validateZenodoDatasetMetadata(
  input: ValidateZenodoDatasetMetadataInput,
): ZenodoDatasetValidationIssue[] {
  const issues: ZenodoDatasetValidationIssue[] = [];
  const atlasId = input.atlasDatasetId?.trim().toLowerCase() ?? null;
  if (!atlasId) {
    issues.push({
      code: "missing_atlas_dataset_id",
      message: "Experiment has no atlas_dataset_id",
    });
  }

  const description = input.metadata.description ?? "";
  const title = input.metadata.title?.trim() ?? "";
  if (!title) {
    issues.push({
      code: "empty_title",
      message: "Zenodo title is empty",
    });
  }
  if (input.metadata.upload_type !== "dataset") {
    issues.push({
      code: "wrong_upload_type",
      message: `Expected upload_type=dataset, got ${String(input.metadata.upload_type)}`,
    });
  }
  if (descriptionContainsLoopbackAtlasUrl(description)) {
    issues.push({
      code: "loopback_url",
      message: "Description still contains a loopback Atlas URL",
    });
  }
  if (descriptionContainsLegacyBrowseExperimentUrl(description)) {
    issues.push({
      code: "legacy_browse_url",
      message: "Description still uses a legacy /browse?nexafsExperiment= URL",
    });
  }

  if (atlasId) {
    const expectedUrl = buildAtlasDatasetCitationUrl(atlasId);
    if (
      !description.includes(expectedUrl) &&
      !description.includes(`/d/${atlasId}`)
    ) {
      issues.push({
        code: "missing_d_url_in_description",
        message: `Description is missing Atlas citation URL ${expectedUrl}`,
      });
    }
    const related = input.metadata.related_identifiers ?? [];
    const hasAtlasRelated = related.some((entry) => {
      const id = entry.identifier?.trim() ?? "";
      return (
        id === expectedUrl ||
        id.endsWith(`/d/${atlasId}`) ||
        (entry.relation === "isIdenticalTo" && id.includes(`/d/${atlasId}`))
      );
    });
    if (!hasAtlasRelated) {
      issues.push({
        code: "missing_related_atlas_url",
        message: `related_identifiers lacks isIdenticalTo ${expectedUrl}`,
      });
    }
  }

  const expectedDoi = normalizeDoi(input.expectedDoi);
  const actualDoi = normalizeDoi(input.metadata.doi);
  if (expectedDoi && actualDoi && expectedDoi !== actualDoi) {
    issues.push({
      code: "doi_mismatch",
      message: `DOI mismatch: Atlas ${expectedDoi} vs Zenodo ${actualDoi}`,
    });
  }

  return issues;
}
