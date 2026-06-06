"use client";

import { useMemo, useState } from "react";
import {
  Accordion,
  Button,
  Checkbox,
  Label,
  ListBox,
  ScrollShadow,
  SearchField,
  Select,
  Spinner,
} from "@heroui/react";
import { ChevronDownIcon, PinIcon } from "lucide-react";
import type { NexafsBrowseGroup } from "~/components/browse/nexafs-browse-map-group";
import { trpc } from "~/trpc/client";
import { collectGeometryOptions } from "./geometry-keys";
import {
  PLOT_VIEWER_CHANNELS,
  type PlotViewerChannelId,
  type PlotViewerUrlState,
} from "./plot-viewer-url-state";
import {
  readPlotViewerPins,
  togglePlotViewerPin,
} from "./plot-viewer-pins";
import type { SpectrumPoint } from "~/components/plots/types";

type FacetCheckboxListProps = {
  title: string;
  items: Array<{ id: string; label: string; count?: number }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
};

function FacetCheckboxList({
  title,
  items,
  selectedIds,
  onToggle,
}: FacetCheckboxListProps) {
  if (items.length === 0) {
    return null;
  }
  const selected = new Set(selectedIds);
  return (
    <Accordion.Item id={title}>
      <Accordion.Heading>
        <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
          <span className="text-foreground min-w-0 flex-1 text-sm font-medium">
            {title}
          </span>
          <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
            <ChevronDownIcon className="h-4 w-4" aria-hidden />
          </Accordion.Indicator>
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <ul className="space-y-1.5 pb-2">
          {items.map((item) => (
            <li key={item.id}>
              <Checkbox
                isSelected={selected.has(item.id)}
                onChange={() => onToggle(item.id)}
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Content>
                  <Label className="text-sm">
                    {item.label}
                    {typeof item.count === "number" ? (
                      <span className="text-muted ms-1 tabular-nums">
                        ({item.count})
                      </span>
                    ) : null}
                  </Label>
                </Checkbox.Content>
              </Checkbox>
            </li>
          ))}
        </ul>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export type PlotViewerSelectionPanelProps = {
  state: PlotViewerUrlState;
  debouncedQuery: string;
  urlSynced: boolean;
  spectraByExperimentId: Map<string, SpectrumPoint[]>;
  onQueryChange: (query: string) => void;
  onChannelChange: (channel: PlotViewerChannelId) => void;
  onToggleDataset: (experimentId: string) => void;
  onToggleFacet: (
    field: keyof PlotViewerUrlState["facets"],
    id: string,
  ) => void;
  onToggleGeometryKey: (key: string) => void;
  onClearFacets: () => void;
};

function groupLabel(group: NexafsBrowseGroup): string {
  const edge = `${group.edge.targetatom} ${group.edge.corestate}`;
  return `${group.molecule.displayName} (${edge})`;
}

function facilityKey(name: string | null | undefined): string {
  return (name?.trim() ?? "Unknown facility").toLowerCase();
}

/**
 * Left-hand catalog picker: search, facets, dataset checkboxes, channel, and geometry filters.
 */
export function PlotViewerSelectionPanel({
  state,
  debouncedQuery,
  urlSynced,
  spectraByExperimentId,
  onQueryChange,
  onChannelChange,
  onToggleDataset,
  onToggleFacet,
  onToggleGeometryKey,
  onClearFacets,
}: PlotViewerSelectionPanelProps) {
  const [pins, setPins] = useState<string[]>(() => readPlotViewerPins());
  const facetCountsQuery = trpc.experiments.facetCounts.useQuery(undefined, {
    staleTime: 120_000,
  });

  const commonFilters = {
    moleculeIds:
      state.facets.mol.length > 0 ? state.facets.mol : undefined,
    edgeIds: state.facets.edge.length > 0 ? state.facets.edge : undefined,
    instrumentIds:
      state.facets.instrument.length > 0 ? state.facets.instrument : undefined,
  };

  const hasSearchQuery = debouncedQuery.length > 0;
  const browseSearchQuery = trpc.experiments.browseSearch.useQuery(
    {
      query: debouncedQuery,
      limit: 50,
      offset: 0,
      sortBy: "favorites",
      ...commonFilters,
    },
    { enabled: urlSynced && hasSearchQuery, staleTime: 30_000 },
  );
  const browseListQuery = trpc.experiments.browseList.useQuery(
    {
      limit: 50,
      offset: 0,
      sortBy: "favorites",
      ...commonFilters,
    },
    { enabled: urlSynced && !hasSearchQuery, staleTime: 30_000 },
  );

  const catalogGroups = useMemo(() => {
    const groups = hasSearchQuery
      ? (browseSearchQuery.data?.groups ?? [])
      : (browseListQuery.data?.groups ?? []);
    if (state.facets.facility.length === 0) {
      return groups;
    }
    const allowed = new Set(
      state.facets.facility.map((value) => value.toLowerCase()),
    );
    return groups.filter((group) =>
      allowed.has(facilityKey(group.instrument.facilityName)),
    );
  }, [
    browseListQuery.data?.groups,
    browseSearchQuery.data?.groups,
    hasSearchQuery,
    state.facets.facility,
  ]);

  const facilityOptions = useMemo(() => {
    const source = hasSearchQuery
      ? (browseSearchQuery.data?.groups ?? [])
      : (browseListQuery.data?.groups ?? []);
    const counts = new Map<string, { id: string; label: string; count: number }>();
    for (const group of source) {
      const label = group.instrument.facilityName?.trim() ?? "Unknown facility";
      const id = facilityKey(label);
      const existing = counts.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(id, { id, label, count: 1 });
      }
    }
    return [...counts.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [
    browseListQuery.data?.groups,
    browseSearchQuery.data?.groups,
    hasSearchQuery,
  ]);

  const geometryOptions = useMemo(() => {
    const merged: SpectrumPoint[] = [];
    for (const experimentId of state.datasets) {
      const points = spectraByExperimentId.get(experimentId);
      if (points) {
        merged.push(...points);
      }
    }
    return collectGeometryOptions(merged);
  }, [spectraByExperimentId, state.datasets]);

  const isCatalogLoading =
    !urlSynced ||
    (hasSearchQuery ? browseSearchQuery.isLoading : browseListQuery.isLoading);

  const selectedDatasets = new Set(state.datasets);
  const selectedGeometry = new Set(state.geometryKeys);

  return (
    <aside className="border-border bg-surface flex min-h-0 w-full min-w-[320px] max-w-[320px] shrink-0 flex-col rounded-lg border">
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-foreground text-sm font-semibold">Dataset picker</h2>
        <p className="text-muted mt-1 text-xs leading-snug">
          Search Atlas catalog datasets and overlay spectra on one plot.
        </p>
      </div>

      <ScrollShadow className="min-h-0 flex-1 px-4 py-3" hideScrollBar={false}>
        <div className="flex flex-col gap-4">
          <SearchField
            name="plot-viewer-search"
            value={state.query}
            onChange={onQueryChange}
            variant="secondary"
            className="w-full"
          >
            <SearchField.Group className="border-border bg-default/20 flex min-h-10 w-full flex-row items-center gap-2 rounded-lg border px-3">
              <SearchField.SearchIcon className="text-muted h-4 w-4 shrink-0" />
              <SearchField.Input
                placeholder="Search molecules, edges, instruments..."
                className="text-foreground placeholder:text-muted min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none outline-none"
                aria-label="Search catalog datasets"
              />
              {state.query ? (
                <SearchField.ClearButton className="text-muted h-5 w-5 shrink-0 rounded p-0.5" />
              ) : null}
            </SearchField.Group>
          </SearchField>

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted text-xs">Facets</p>
            <Button size="sm" variant="ghost" onPress={onClearFacets}>
              Clear
            </Button>
          </div>

          <Accordion allowsMultipleExpanded variant="surface" className="w-full">
            <FacetCheckboxList
              title="Molecule"
              items={facetCountsQuery.data?.molecules ?? []}
              selectedIds={state.facets.mol}
              onToggle={(id) => onToggleFacet("mol", id)}
            />
            <FacetCheckboxList
              title="Edge"
              items={facetCountsQuery.data?.edges ?? []}
              selectedIds={state.facets.edge}
              onToggle={(id) => onToggleFacet("edge", id)}
            />
            <FacetCheckboxList
              title="Instrument"
              items={facetCountsQuery.data?.instruments ?? []}
              selectedIds={state.facets.instrument}
              onToggle={(id) => onToggleFacet("instrument", id)}
            />
            <FacetCheckboxList
              title="Facility"
              items={facilityOptions}
              selectedIds={state.facets.facility}
              onToggle={(id) => onToggleFacet("facility", id)}
            />
          </Accordion>

          <div className="flex flex-col gap-2">
            <Label className="text-foreground text-sm font-medium">
              Y channel
            </Label>
            <Select
              selectedKey={state.channel}
              onSelectionChange={(key) => {
                if (typeof key === "string") {
                  onChannelChange(key as PlotViewerChannelId);
                }
              }}
              aria-label="Plot y channel"
            >
              <Select.Trigger className="border-border bg-field-background min-h-9 w-full rounded-lg border shadow-none">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {PLOT_VIEWER_CHANNELS.map((channel) => (
                    <ListBox.Item
                      key={channel.id}
                      id={channel.id}
                      textValue={channel.label}
                    >
                      {channel.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {geometryOptions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label className="text-foreground text-sm font-medium">
                Incident angles
              </Label>
              <ul className="space-y-1.5">
                {geometryOptions.map((option) => (
                  <li key={option.key}>
                    <Checkbox
                      isSelected={selectedGeometry.has(option.key)}
                      onChange={() => onToggleGeometryKey(option.key)}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label className="text-sm">{option.label}</Label>
                      </Checkbox.Content>
                    </Checkbox>
                  </li>
                ))}
              </ul>
              <p className="text-muted text-xs">
                Leave all unchecked to include every geometry for selected datasets.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-foreground text-sm font-medium">
                Selected ({state.datasets.length})
              </Label>
            </div>
            {state.datasets.length === 0 ? (
              <p className="text-muted text-xs">No datasets selected yet.</p>
            ) : (
              <ul className="space-y-1">
                {state.datasets.map((experimentId) => {
                  const group = catalogGroups.find(
                    (row) => row.experimentId === experimentId,
                  );
                  const label = group ? groupLabel(group) : experimentId;
                  return (
                    <li
                      key={experimentId}
                      className="border-border bg-default/20 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                    >
                      <span className="text-foreground min-w-0 truncate">
                        {label}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => onToggleDataset(experimentId)}
                      >
                        Remove
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-foreground text-sm font-medium">
                Catalog datasets
              </Label>
              {isCatalogLoading ? <Spinner size="sm" /> : null}
            </div>
            {catalogGroups.length === 0 && !isCatalogLoading ? (
              <p className="text-muted text-xs">No datasets match the current filters.</p>
            ) : (
              <ul className="space-y-1">
                {catalogGroups.map((group) => {
                  const experimentId = group.experimentId;
                  const pinned = pins.includes(experimentId);
                  return (
                    <li
                      key={experimentId}
                      className="border-border hover:bg-default/30 flex items-start gap-2 rounded-md border px-2 py-2"
                    >
                      <Checkbox
                        isSelected={selectedDatasets.has(experimentId)}
                        onChange={() => onToggleDataset(experimentId)}
                        className="mt-0.5"
                      >
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <Checkbox.Content>
                          <Label className="text-sm leading-snug">
                            {groupLabel(group)}
                          </Label>
                          <span className="text-muted block text-xs">
                            {group.instrument.name}
                            {group.instrument.facilityName
                              ? ` · ${group.instrument.facilityName}`
                              : ""}
                            {" · "}
                            {group.polarizationCount} geometr
                            {group.polarizationCount === 1 ? "y" : "ies"}
                          </span>
                        </Checkbox.Content>
                      </Checkbox>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={
                          pinned
                            ? "Unpin dataset for this session"
                            : "Pin dataset for this session"
                        }
                        onPress={() => {
                          setPins(togglePlotViewerPin(experimentId));
                        }}
                      >
                        <PinIcon
                          className={`h-3.5 w-3.5 ${pinned ? "text-accent" : "text-muted"}`}
                          aria-hidden
                        />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </ScrollShadow>
    </aside>
  );
}
