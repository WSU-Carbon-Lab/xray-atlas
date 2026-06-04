"use client";

/**
 * Element-to-edge picker rendered as an 18-column IUPAC periodic table grid
 * inside a dialog.
 *
 * Selection semantics:
 * - Plain click: toggles all edges for the element.
 * - Cmd/Ctrl click: adds the element's edges without clearing other selections.
 * - Shift click: selects a contiguous atomic-number range from the last plain-
 *   clicked element (anchor) to the clicked element, inclusive of all in-catalog
 *   elements in that range.
 *
 * An element is interactive when the catalog has at least one experiment linked
 * to an edge for that element. Elements without catalog edges are muted and
 * non-interactive. When `edgeCatalogStats` data is available the active state
 * reflects DB truth; while it loads the component falls back to the `edges`
 * prop so the modal opens immediately without a blank table.
 *
 * Below the periodic table an energy density chart shows the distribution of
 * spectrum-point photon energies in the catalog, with vertical markers at each
 * edge's representative energy and an accent band over the selected span.
 */

import { useRef, useMemo, useCallback } from "react";
import { Button } from "@heroui/react";
import { SimpleDialog } from "~/components/ui/dialog";
import { PERIODIC_ELEMENTS } from "./periodic-table-data";
import { trpc } from "~/trpc/client";
import {
  EdgeEnergyDensityChart,
  EdgeEnergyDensityChartSkeleton,
} from "./edge-energy-density-chart";

export type EdgeOption = {
  id: string;
  targetatom: string;
  corestate: string;
};

export interface PeriodicEdgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** All edges available in the catalog, used for UUID → element mapping. */
  edges: EdgeOption[];
  /** Currently selected edge UUIDs. */
  selectedEdgeIds: string[];
  /** Called with the updated edge id list whenever selection changes. */
  onChange: (ids: string[]) => void;
}

type SelectionState = "none" | "partial" | "all";

/**
 * Returns the selection state for an element given its edge UUIDs and the
 * current selection set.
 */
function elementSelectionState(
  elementEdgeIds: string[],
  selectedSet: Set<string>,
): SelectionState {
  if (elementEdgeIds.length === 0) return "none";
  const selectedCount = elementEdgeIds.filter((id) => selectedSet.has(id)).length;
  if (selectedCount === 0) return "none";
  if (selectedCount === elementEdgeIds.length) return "all";
  return "partial";
}

/**
 * Multi-select periodic table modal for NEXAFS edge filtering.
 *
 * Renders an 18-column CSS grid with IUPAC element placement. Active elements
 * (those with at least one experiment in the catalog) are highlighted and
 * interactive. Below the grid, an energy density chart shows the photon energy
 * distribution across all catalogued spectra.
 *
 * @param isOpen - Controls modal visibility; also gates the catalog stats query.
 * @param onClose - Called when the user dismisses the modal.
 * @param edges - All available edges from `experiments.listEdges`; used for
 *   UUID-to-element resolution and selection logic fallback while stats load.
 * @param selectedEdgeIds - Currently active edge UUID list.
 * @param onChange - Callback receiving the new edge UUID list after interaction.
 */
export function PeriodicEdgeModal({
  isOpen,
  onClose,
  edges,
  selectedEdgeIds,
  onChange,
}: PeriodicEdgeModalProps) {
  const anchorZRef = useRef<number | null>(null);
  const selectedSet = useMemo(() => new Set(selectedEdgeIds), [selectedEdgeIds]);

  const catalogStatsQuery = trpc.experiments.edgeCatalogStats.useQuery(
    undefined,
    { enabled: isOpen, staleTime: 120000 },
  );

  const elementEdgesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const edge of edges) {
      const sym = edge.targetatom.trim();
      const existing = map.get(sym) ?? [];
      existing.push(edge.id);
      map.set(sym, existing);
    }
    return map;
  }, [edges]);

  /**
   * Set of uppercase element symbols that have at least one experiment linked.
   * Uses catalog stats when available for DB-accurate results; falls back to
   * the edges prop while the query is loading.
   */
  const catalogSymbols = useMemo(() => {
    const catalogData = catalogStatsQuery.data;
    if (catalogData) {
      return new Set(
        catalogData.edgesInCatalog.map((e) =>
          e.targetatom.trim().toUpperCase(),
        ),
      );
    }
    return new Set(
      [...elementEdgesMap.keys()].map((s) => s.toUpperCase()),
    );
  }, [catalogStatsQuery.data, elementEdgesMap]);

  const catalogElements = useMemo(
    () =>
      PERIODIC_ELEMENTS.filter((el) =>
        catalogSymbols.has(el.symbol.toUpperCase()),
      ).sort((a, b) => a.z - b.z),
    [catalogSymbols],
  );

  const getEdgesForSymbol = useCallback(
    (symbol: string): string[] => {
      return (
        elementEdgesMap.get(symbol) ??
        elementEdgesMap.get(symbol.toLowerCase()) ??
        elementEdgesMap.get(symbol.toUpperCase()) ??
        []
      );
    },
    [elementEdgesMap],
  );

  const handleElementClick = useCallback(
    (z: number, symbol: string, additive: boolean, shiftExtend: boolean) => {
      const edgeIds = getEdgesForSymbol(symbol);
      if (edgeIds.length === 0) return;

      if (shiftExtend && anchorZRef.current !== null) {
        const lo = Math.min(anchorZRef.current, z);
        const hi = Math.max(anchorZRef.current, z);
        const rangeEdgeIds = catalogElements
          .filter((el) => el.z >= lo && el.z <= hi)
          .flatMap((el) => getEdgesForSymbol(el.symbol));
        const next = new Set(selectedSet);
        for (const id of rangeEdgeIds) next.add(id);
        onChange([...next]);
        return;
      }

      anchorZRef.current = z;
      const elementSet = new Set(edgeIds);
      const allSelected = edgeIds.every((id) => selectedSet.has(id));

      if (additive) {
        const next = new Set(selectedSet);
        if (allSelected) {
          for (const id of elementSet) next.delete(id);
        } else {
          for (const id of elementSet) next.add(id);
        }
        onChange([...next]);
        return;
      }

      if (allSelected) {
        const next = new Set(selectedSet);
        for (const id of elementSet) next.delete(id);
        onChange([...next]);
      } else {
        const next = new Set(selectedSet);
        for (const id of elementSet) next.add(id);
        onChange([...next]);
      }
    },
    [catalogElements, getEdgesForSymbol, selectedSet, onChange],
  );

  const selectedEdgeObjects = useMemo(
    () => edges.filter((e) => selectedSet.has(e.id)),
    [edges, selectedSet],
  );

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Select absorption edges"
      maxWidth="max-w-5xl"
    >
      <p className="text-muted mb-3 text-xs">
        Highlighted elements have edges in the catalog. Click to toggle; Shift-click to
        range-select; Cmd/Ctrl-click to add.
      </p>

      <div
        role="group"
        aria-label="Periodic table element selector"
        className="relative"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(18, minmax(0, 1fr))",
          gap: "3px",
        }}
      >
        {PERIODIC_ELEMENTS.map((el) => {
          const edgeIds = getEdgesForSymbol(el.symbol);
          const active = catalogSymbols.has(el.symbol.toUpperCase());
          const selectableEdgeIds = active ? edgeIds : [];
          const state = elementSelectionState(selectableEdgeIds, selectedSet);

          return (
            <button
              key={el.symbol}
              type="button"
              disabled={!active}
              aria-pressed={state !== "none"}
              aria-label={`${el.name}, Z=${el.z}${active ? `, ${edgeIds.length} edge${edgeIds.length !== 1 ? "s" : ""}` : ", not in catalog"}`}
              style={{
                gridColumn: el.col,
                gridRow: el.row,
              }}
              onClick={(e) => {
                if (!active) return;
                handleElementClick(
                  el.z,
                  el.symbol,
                  e.metaKey || e.ctrlKey,
                  e.shiftKey,
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!active) return;
                  handleElementClick(el.z, el.symbol, false, false);
                }
              }}
              className={[
                "relative flex flex-col items-center justify-center rounded px-0.5 py-1 text-center transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
                active
                  ? state === "all"
                    ? "bg-accent text-accent-foreground"
                    : state === "partial"
                      ? "bg-accent/40 text-foreground"
                      : "bg-default text-foreground hover:bg-accent/20 cursor-pointer"
                  : "bg-default/30 text-muted opacity-40 cursor-not-allowed",
              ].join(" ")}
            >
              <span className="text-[10px] leading-none tabular-nums text-current/60">
                {el.z}
              </span>
              <span className="mt-0.5 text-xs font-semibold leading-none">
                {el.symbol}
              </span>
            </button>
          );
        })}
      </div>

      {/* Energy density chart */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
          Catalog photon energy coverage
        </p>
        {catalogStatsQuery.data ? (
          <EdgeEnergyDensityChart
            edgesInCatalog={catalogStatsQuery.data.edgesInCatalog}
            energyHistogram={catalogStatsQuery.data.energyHistogram}
            selectedEdgeIds={selectedEdgeIds}
          />
        ) : (
          <EdgeEnergyDensityChartSkeleton />
        )}
      </div>

      {selectedEdgeObjects.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
            Selected edges ({selectedEdgeObjects.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedEdgeObjects.map((e) => (
              <span
                key={e.id}
                className="bg-accent/10 text-accent border-accent/30 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
              >
                {e.targetatom} {e.corestate}
                <button
                  type="button"
                  aria-label={`Remove ${e.targetatom} ${e.corestate}`}
                  onClick={() => {
                    const next = new Set(selectedSet);
                    next.delete(e.id);
                    onChange([...next]);
                  }}
                  className="hover:text-foreground ml-0.5 rounded"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onChange([])}
          isDisabled={selectedEdgeIds.length === 0}
        >
          Clear edges
        </Button>
        <Button size="sm" variant="primary" onPress={onClose}>
          Done
        </Button>
      </div>
    </SimpleDialog>
  );
}
