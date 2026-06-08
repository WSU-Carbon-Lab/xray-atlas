"use client";

import { useMemo, useState } from "react";
import { Tabs } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { Plus } from "lucide-react";
import {
  PopoverMenu,
  PopoverMenuContent,
} from "~/components/ui/popover-menu";
import type { DashboardPreviewAtlasEntry } from "~/lib/dashboard-processing-session";
import type { SpectrumPoint } from "~/components/plots/types";
import { geometryKeysForPoints } from "~/features/dashboard/plot-viewer/geometry-selection";
import {
  AtlasCatalogSearch,
  atlasEntryFromBrowseGroup,
} from "./atlas-experiment-picker";
import type { LcfTraceCandidate } from "./stxm-lcf-spectrum-source";
import type { NexafsBrowseGroup } from "~/components/browse/nexafs-browse-map-group";

export type LcfAddComponentPickerProps = {
  targetTraceKey: string | null;
  componentTraceKeys: readonly string[];
  candidates: readonly LcfTraceCandidate[];
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  geometryByExperimentId: Readonly<Record<string, readonly string[] | undefined>>;
  spectraByExperimentId: ReadonlyMap<string, SpectrumPoint[]>;
  onAddComponent: (traceKey: string) => void;
  onAtlasEntriesChange: (entries: DashboardPreviewAtlasEntry[]) => void;
  onGeometryByExperimentIdChange: (
    geometryByExperimentId: Record<string, string[]>,
  ) => void;
  isDisabled?: boolean;
};

type AddPickerTab = "beamtime" | "atlas";

function candidateIsAvailable(
  candidate: LcfTraceCandidate,
  targetTraceKey: string | null,
  componentTraceKeys: readonly string[],
): boolean {
  if (candidate.traceKey === targetTraceKey) {
    return false;
  }
  return !componentTraceKeys.includes(candidate.traceKey);
}

/**
 * Unified popover for adding LCF standard components from beamtime cache or Atlas catalog.
 */
export function LcfAddComponentPicker({
  targetTraceKey,
  componentTraceKeys,
  candidates,
  atlasEntries,
  geometryByExperimentId,
  spectraByExperimentId,
  onAddComponent,
  onAtlasEntriesChange,
  onGeometryByExperimentIdChange,
  isDisabled = false,
}: LcfAddComponentPickerProps) {
  const [activeTab, setActiveTab] = useState<AddPickerTab>("beamtime");

  const beamtimeCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          candidate.source === "beamtime" &&
          candidateIsAvailable(candidate, targetTraceKey, componentTraceKeys),
      ),
    [candidates, componentTraceKeys, targetTraceKey],
  );

  const atlasCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          candidate.source === "atlas" &&
          candidateIsAvailable(candidate, targetTraceKey, componentTraceKeys),
      ),
    [candidates, componentTraceKeys, targetTraceKey],
  );

  const addAtlasExperiment = (group: NexafsBrowseGroup) => {
    if (atlasEntries.some((entry) => entry.experimentId === group.experimentId)) {
      return;
    }
    const entry = atlasEntryFromBrowseGroup(group);
    const nextEntries = [...atlasEntries, entry];
    onAtlasEntriesChange(nextEntries);

    const points = spectraByExperimentId.get(group.experimentId) ?? [];
    const geometryKeys = geometryKeysForPoints(points);
    if (geometryKeys.length > 0) {
      onGeometryByExperimentIdChange({
        ...Object.fromEntries(
          Object.entries(geometryByExperimentId).map(([key, value]) => [
            key,
            [...(value ?? [])],
          ]),
        ),
        [group.experimentId]: geometryKeys,
      });
    }
  };

  const renderCandidateList = (
    rows: readonly LcfTraceCandidate[],
    emptyMessage: string,
    close: () => void,
  ) => {
    if (rows.length === 0) {
      return <p className="text-muted px-1 py-2 text-xs">{emptyMessage}</p>;
    }
    return (
      <ul className="max-h-48 space-y-0.5 overflow-y-auto">
        {rows.map((candidate) => (
          <li key={candidate.traceKey}>
            <button
              type="button"
              className="hover:bg-default/40 text-foreground w-full rounded-md px-2 py-1.5 text-left text-xs"
              onClick={() => {
                onAddComponent(candidate.traceKey);
                close();
              }}
            >
              <span className="block truncate">{candidate.label}</span>
              <span className="text-muted text-[10px] capitalize">
                {candidate.source}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <PopoverMenu
      placement="bottom-end"
      contentClassName="w-[min(22rem,calc(100vw-2rem))]"
      renderTrigger={({ triggerProps, isOpen }) => (
        <button
          type="button"
          {...triggerProps}
          disabled={isDisabled || triggerProps.disabled}
          aria-expanded={isOpen}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "inline-flex items-center gap-1",
            triggerProps.className,
          )}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add
        </button>
      )}
      renderContent={({ close, contentProps, contentStyle }) => (
        <PopoverMenuContent
          {...contentProps}
          style={contentStyle}
          className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3 shadow-lg"
        >
          <div>
            <p className="text-foreground text-sm font-medium">Add standard</p>
            <p className="text-muted text-xs">
              Pick a beamtime trace or Atlas experiment geometry for the fit.
            </p>
          </div>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => {
              if (key === "beamtime" || key === "atlas") {
                setActiveTab(key);
              }
            }}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Standard source">
                <Tabs.Tab id="beamtime">Beamtime</Tabs.Tab>
                <Tabs.Tab id="atlas">Atlas</Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="beamtime" className="pt-2">
              {renderCandidateList(
                beamtimeCandidates,
                targetTraceKey
                  ? "No unused beamtime traces. Reduce scans on Ingestion or Preview."
                  : "Select a target spectrum first.",
                close,
              )}
            </Tabs.Panel>
            <Tabs.Panel id="atlas" className="flex flex-col gap-2 pt-2">
              <AtlasCatalogSearch
                atlasEntries={atlasEntries}
                onAddExperiment={addAtlasExperiment}
                compact
                maxCatalogHeightClassName="max-h-32"
              />
              {atlasCandidates.length > 0 ? (
                <div>
                  <p className="text-muted mb-1 text-[10px] font-medium uppercase tracking-wide">
                    Atlas traces
                  </p>
                  {renderCandidateList(
                    atlasCandidates,
                    "Add an Atlas experiment above, then pick a geometry trace.",
                    close,
                  )}
                </div>
              ) : atlasEntries.length > 0 ? (
                <p className="text-muted text-xs">
                  Loading Atlas spectra or no geometries on the active channel yet.
                </p>
              ) : null}
            </Tabs.Panel>
          </Tabs>
        </PopoverMenuContent>
      )}
    />
  );
}
