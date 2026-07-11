/**
 * Public barrel for Atlas Zenodo dataset DOI minting helpers.
 */

export {
  buildAtlasDatasetCitationUrl,
  buildAtlasExperimentBrowseUrl,
  buildAtlasExperimentMoleculeUrl,
  descriptionContainsLegacyBrowseExperimentUrl,
  descriptionContainsLoopbackAtlasUrl,
  descriptionNeedsAtlasCanonicalUrlRepair,
  descriptionNeedsAtlasExperimentUrlRepair,
  getAtlasPublicSiteOrigin,
  isLoopbackHostname,
  normalizePublicSiteOrigin,
  rewriteLoopbackAtlasBrowseUrls,
} from "~/server/zenodo/atlas-public-site-origin";
export {
  buildZenodoDepositMetadata,
  formatZenodoCreatorName,
  loadZenodoMetadataSnapshot,
  normalizeZenodoOrcid,
  resolveZenodoCreatorFromContributor,
  sortZenodoCreatorsByCitationOrder,
  zenodoCreatorCitationSortKey,
  type ZenodoMetadataExperimentSnapshot,
} from "~/server/zenodo/build-zenodo-metadata";
export {
  mintExperimentDatasetDoi,
  type MintZenodoDatasetDoiOptions,
  type MintZenodoDatasetDoiResult,
  type MintZenodoDatasetDoiState,
} from "~/server/zenodo/mint-experiment-dataset-doi";
export {
  scheduleZenodoDepositSync,
  scheduleZenodoDepositSyncForSample,
  syncZenodoDepositForExperiment,
  type SyncZenodoDepositOptions,
  type ZenodoSyncMode,
} from "~/server/zenodo/sync-zenodo-deposit";
export {
  createZenodoClient,
  ZenodoApiError,
  ZENODO_BUCKET_UPLOAD_CONTENT_TYPE,
  type ZenodoClient,
  type ZenodoDepositMetadata,
  type ZenodoDeposition,
  type ZenodoDepositionFile,
} from "~/server/zenodo/zenodo-client";
export {
  validateZenodoDatasetMetadata,
  type ValidateZenodoDatasetMetadataInput,
  type ZenodoDatasetValidationIssue,
} from "~/server/zenodo/validate-zenodo-dataset-metadata";
export {
  isZenodoMintingEnabled,
  zenodoAccessToken,
  zenodoBaseUrl,
  zenodoCommunityId,
  ZENODO_PRODUCTION_COMMUNITY_ID,
} from "~/server/zenodo/zenodo-config";
