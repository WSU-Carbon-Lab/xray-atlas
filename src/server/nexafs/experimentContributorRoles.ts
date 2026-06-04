/**
 * Maps `experiment_contributors.role` (DataCite contributorType) to roadmap required-role slugs
 * until the polymorphic `Contribution` table ships.
 */

import type { DataCiteContributorType } from "~/lib/datacite-contributor-types";

/** ORCID iD used as the sole uploader for legacy datasets after the attribution reset migration. */
export const ATLAS_LEGACY_UPLOADER_ORCID = "0000-0002-6371-2123";

/** Future `RequiredRoleSlug` values planned for the polymorphic contribution model. */
export type DataCiteRequiredRoleSlug =
  | "uploaded_by"
  | "collected_by"
  | "processed_by";

export type { DataCiteContributorType };

export type ExperimentContributorRoleMapping = {
  contributorType: DataCiteContributorType;
  requiredRoleSlug?: DataCiteRequiredRoleSlug;
  requiredAtUpload: boolean;
};

/**
 * DataCite contributor types with roadmap required-role metadata for export and validation.
 */
export const DATACITE_CONTRIBUTOR_ROLE_EXPORT: Partial<
  Record<DataCiteContributorType, ExperimentContributorRoleMapping>
> = {
  DataCurator: {
    contributorType: "DataCurator",
    requiredRoleSlug: "uploaded_by",
    requiredAtUpload: true,
  },
  DataCollector: {
    contributorType: "DataCollector",
    requiredRoleSlug: "collected_by",
    requiredAtUpload: false,
  },
};
