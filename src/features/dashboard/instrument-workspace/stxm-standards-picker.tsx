"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, Label, Spinner } from "@heroui/react";
import { Plus } from "lucide-react";
import { trpc } from "~/trpc/client";
import type { DashboardStandardOverlay } from "~/lib/dashboard-processing-session";
import type { StxmPlotStandardOverlay } from "./stxm-ingestion-plot-panel";

const STANDARD_COLORS = [
  "#dc2626",
  "#7c3aed",
  "#0d9488",
  "#ca8a04",
  "#db2777",
] as const;

type StxmStandardsPickerProps = {
  edgeLabel: string | null;
  overlays: DashboardStandardOverlay[];
  onOverlaysChange: (overlays: DashboardStandardOverlay[]) => void;
  onPlotStandardsChange: (standards: StxmPlotStandardOverlay[]) => void;
};

function edgeLabelToId(
  edgeLabel: string,
  edges: Array<{ id: string; targetatom: string; corestate: string }>,
): string | null {
  const normalized = edgeLabel.trim().toUpperCase();
  for (const edge of edges) {
    const label = `${edge.targetatom} ${edge.corestate}`.trim().toUpperCase();
    if (label === normalized) {
      return edge.id;
    }
  }
  return null;
}

/**
 * Loads Atlas reference spectra for the inferred edge and toggles plot overlays.
 */
export function StxmStandardsPicker({
  edgeLabel,
  overlays,
  onOverlaysChange,
  onPlotStandardsChange,
}: StxmStandardsPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const edgesQuery = trpc.experiments.listEdges.useQuery();
  const edgeId = useMemo(() => {
    if (!edgeLabel || !edgesQuery.data?.edges) {
      return null;
    }
    return edgeLabelToId(edgeLabel, edgesQuery.data.edges);
  }, [edgeLabel, edgesQuery.data?.edges]);

  const browseQuery = trpc.experiments.browseList.useQuery(
    { edgeId: edgeId ?? undefined, limit: 12, sortBy: "favorites" },
    { enabled: Boolean(edgeId) && pickerOpen },
  );

  const utils = trpc.useUtils();

  const loadStandardPoints = async (
    experimentId: string,
    label: string,
    color: string,
  ): Promise<StxmPlotStandardOverlay> => {
    const points = await utils.spectrumpoints.getByExperiment.fetch({
      experimentId,
      limit: 2000,
    });
    const byEnergy = new Map<number, number>();
    for (const point of points) {
      const energy = point.energyev;
      const od = point.od ?? point.massabsorption ?? point.rawabs;
      if (energy !== null && od !== null && Number.isFinite(od)) {
        byEnergy.set(energy, od);
      }
    }
    const energyEv = [...byEnergy.keys()].sort((a, b) => a - b);
    return {
      id: experimentId,
      label,
      energyEv,
      values: energyEv.map((energy) => byEnergy.get(energy) ?? 0),
      color,
      enabled: true,
    };
  };

  const refreshPlotStandards = async (next: DashboardStandardOverlay[]) => {
    const plotStandards: StxmPlotStandardOverlay[] = [];
    for (let index = 0; index < next.length; index += 1) {
      const overlay = next[index]!;
      if (!overlay.enabled) {
        plotStandards.push({
          id: overlay.experimentId,
          label: overlay.label,
          energyEv: [],
          values: [],
          color: STANDARD_COLORS[index % STANDARD_COLORS.length] ?? "#dc2626",
          enabled: false,
        });
        continue;
      }
      const color = STANDARD_COLORS[index % STANDARD_COLORS.length] ?? "#dc2626";
      plotStandards.push(
        await loadStandardPoints(overlay.experimentId, overlay.label, color),
      );
    }
    onPlotStandardsChange(plotStandards);
  };

  const addStandard = async (experimentId: string, label: string) => {
    if (overlays.some((row) => row.experimentId === experimentId)) {
      return;
    }
    const next: DashboardStandardOverlay[] = [
      ...overlays,
      { experimentId, label, enabled: true },
    ];
    onOverlaysChange(next);
    await refreshPlotStandards(next);
    setPickerOpen(false);
  };

  const toggleEnabled = async (experimentId: string, enabled: boolean) => {
    const next = overlays.map((row) =>
      row.experimentId === experimentId ? { ...row, enabled } : row,
    );
    onOverlaysChange(next);
    await refreshPlotStandards(next);
  };

  const removeStandard = async (experimentId: string) => {
    const next = overlays.filter((row) => row.experimentId !== experimentId);
    onOverlaysChange(next);
    await refreshPlotStandards(next);
  };

  return (
    <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-foreground text-sm font-medium">Reference standards</p>
          <p className="text-muted text-xs">
            {edgeLabel
              ? `Atlas spectra for ${edgeLabel}`
              : "Infer edge from scan energy to load standards"}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={!edgeId}
          onPress={() => setPickerOpen((open) => !open)}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add standard
        </Button>
      </div>

      {overlays.length > 0 ? (
        <ul className="space-y-1">
          {overlays.map((overlay) => (
            <li
              key={overlay.experimentId}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <Checkbox
                isSelected={overlay.enabled}
                onChange={(selected) =>
                  void toggleEnabled(overlay.experimentId, Boolean(selected))
                }
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Content>
                  <Label>{overlay.label}</Label>
                </Checkbox.Content>
              </Checkbox>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => void removeStandard(overlay.experimentId)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted text-xs">No reference overlays yet.</p>
      )}

      {pickerOpen ? (
        <div className="border-border max-h-48 space-y-1 overflow-y-auto rounded border p-2">
          {browseQuery.isLoading ? (
            <Spinner size="sm" />
          ) : null}
          {(browseQuery.data?.groups ?? []).map((group) => {
            const experimentId = group.experimentId;
            const edgeLabel = `${group.edge.targetatom} ${group.edge.corestate}`;
            const label = `${group.molecule.displayName} (${edgeLabel})`;
            return (
              <button
                key={experimentId}
                type="button"
                className="hover:bg-default/40 w-full rounded px-2 py-1 text-left text-xs"
                onClick={() => void addStandard(experimentId, label)}
              >
                {label}
              </button>
            );
          })}
          {!browseQuery.isLoading && (browseQuery.data?.groups.length ?? 0) === 0 ? (
            <p className="text-muted text-xs">No published datasets for this edge.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
