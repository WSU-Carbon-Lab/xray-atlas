"use client";

export {
  AtlasCatalogSearch,
  AtlasExperimentPicker,
  atlasEntryFromBrowseGroup,
  type AtlasCatalogSearchProps,
  type AtlasExperimentPickerProps,
} from "./atlas-experiment-picker";

import {
  AtlasExperimentPicker,
  type AtlasExperimentPickerProps,
} from "./atlas-experiment-picker";

export type StxmPreviewAtlasSectionProps = AtlasExperimentPickerProps;

/**
 * Preview compare sidebar wrapper around {@link AtlasExperimentPicker}.
 */
export function StxmPreviewAtlasSection(props: StxmPreviewAtlasSectionProps) {
  return <AtlasExperimentPicker {...props} />;
}
