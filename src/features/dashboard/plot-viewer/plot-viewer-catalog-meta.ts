import type { NexafsBrowseGroup } from "~/components/browse/nexafs-browse-map-group";
import { abbreviateInstrumentName } from "./abbreviate-instrument-name";
import type { PlotViewerCatalogMeta } from "./plot-viewer-styled-traces";

/**
 * Shortens an experiment UUID for compact fallback labels when browse metadata is unavailable.
 */
export function shortPlotViewerExperimentId(experimentId: string): string {
  const trimmed = experimentId.trim();
  if (trimmed.length <= 8) {
    return trimmed;
  }
  return trimmed.slice(0, 8);
}

/**
 * Builds the experiment accordion label: molecule, edge, and abbreviated instrument.
 */
export function plotViewerExperimentGroupLabel(group: NexafsBrowseGroup): string {
  const edge = `${group.edge.targetatom} ${group.edge.corestate}`;
  const instrument = abbreviateInstrumentName(group.instrument.name);
  return `${group.molecule.displayName} · ${edge} · ${instrument}`;
}

/**
 * Maps a NEXAFS browse group into plot-viewer catalog metadata for descriptors and style rows.
 */
export function catalogMetaFromBrowseGroup(
  group: NexafsBrowseGroup,
): PlotViewerCatalogMeta {
  return {
    experimentId: group.experimentId,
    moleculeName: group.molecule.displayName,
    edgeLabel: `${group.edge.targetatom} ${group.edge.corestate}`,
    instrumentName: abbreviateInstrumentName(group.instrument.name),
    facilityName: group.instrument.facilityName?.trim() ?? "Unknown facility",
  };
}

/**
 * Supplies minimal catalog metadata when browse rows cannot be resolved for a selected experiment.
 */
export function catalogMetaFallback(experimentId: string): PlotViewerCatalogMeta {
  const shortId = shortPlotViewerExperimentId(experimentId);
  return {
    experimentId,
    moleculeName: shortId,
    edgeLabel: "",
    instrumentName: "",
    facilityName: "",
  };
}

/**
 * Formats experiment style accordion text from catalog metadata, omitting empty segments.
 */
export function plotViewerExperimentLabelFromMeta(
  meta: PlotViewerCatalogMeta | undefined,
  experimentId: string,
): string {
  if (!meta) {
    return shortPlotViewerExperimentId(experimentId);
  }
  const parts = [meta.moleculeName, meta.edgeLabel, meta.instrumentName].filter(
    (part) => part.trim().length > 0,
  );
  if (parts.length === 0) {
    return shortPlotViewerExperimentId(experimentId);
  }
  return parts.join(" · ");
}

/**
 * Indexes browse groups by experiment id; later rows overwrite earlier duplicates.
 */
export function buildPlotViewerGroupByExperimentId(
  groups: readonly NexafsBrowseGroup[],
): Map<string, NexafsBrowseGroup> {
  const map = new Map<string, NexafsBrowseGroup>();
  for (const group of groups) {
    map.set(group.experimentId, group);
  }
  return map;
}
