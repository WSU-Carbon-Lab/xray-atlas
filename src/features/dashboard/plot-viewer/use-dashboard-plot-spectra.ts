"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SpectrumPoint } from "~/components/plots/types";
import { mapDbSpectrumRowsToPoints } from "~/features/process-nexafs/utils/mapDbSpectrumRowsToPoints";
import { trpc } from "~/trpc/client";
import type { DashboardPlotDatasetInput } from "./build-dashboard-plot-model";
import { fetchWithConcurrency } from "./fetch-with-concurrency";
import {
  PLOT_VIEWER_SPECTRUM_DEBOUNCE_MS,
  PLOT_VIEWER_SPECTRUM_FETCH_CONCURRENCY,
  PLOT_VIEWER_SPECTRUM_GC_MS,
  PLOT_VIEWER_SPECTRUM_ROW_LIMIT,
  PLOT_VIEWER_SPECTRUM_STALE_MS,
} from "./plot-viewer-spectra-config";

export type DashboardPlotCatalogSelection = {
  experimentId: string;
  label: string;
  chemicalFormula: string | null;
};

export type UseDashboardPlotSpectraOptions = {
  /**
   * When false, skips network fetches while still returning empty datasets for current selections.
   * Use to defer Atlas spectrum loads until the user opens a compare surface.
   */
  enabled?: boolean;
  /**
   * Debounce window for selection-driven refetches. Defaults to {@link PLOT_VIEWER_SPECTRUM_DEBOUNCE_MS}.
   */
  debounceMs?: number;
  /**
   * Per-experiment geometry keys (`theta:phi` or `fixed`). When set for an experiment, the lean
   * spectrum procedure filters polarizations server-side. Omit or leave empty to load all geometries
   * (required before plot-viewer geometry reconciliation).
   */
  geometryKeysByExperimentId?: Readonly<
    Record<string, readonly string[] | undefined>
  >;
};

function selectionSignature(
  selections: readonly DashboardPlotCatalogSelection[],
  geometryKeysByExperimentId: Readonly<
    Record<string, readonly string[] | undefined>
  > | undefined,
): string {
  return selections
    .map((row) => {
      const geometry = geometryKeysByExperimentId?.[row.experimentId];
      const geometryPart =
        geometry && geometry.length > 0 ? geometry.join(",") : "*";
      return `${row.experimentId}:${geometryPart}`;
    })
    .join("|");
}

/**
 * Fetches lean persisted spectrum rows for selected catalog experiments with debouncing,
 * bounded concurrency, and React Query caching to limit Supabase egress during compare.
 */
export function useDashboardPlotSpectra(
  selections: readonly DashboardPlotCatalogSelection[],
  options?: UseDashboardPlotSpectraOptions,
): {
  datasets: DashboardPlotDatasetInput[];
  spectraByExperimentId: Map<string, SpectrumPoint[]>;
  isLoading: boolean;
  loadingExperimentIds: ReadonlySet<string>;
  errorMessage: string | null;
} {
  const enabled = options?.enabled ?? selections.length > 0;
  const debounceMs = options?.debounceMs ?? PLOT_VIEWER_SPECTRUM_DEBOUNCE_MS;
  const geometryKeysByExperimentId = options?.geometryKeysByExperimentId;

  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;
  const geometryRef = useRef(geometryKeysByExperimentId);
  geometryRef.current = geometryKeysByExperimentId;

  const [debouncedSignature, setDebouncedSignature] = useState(() =>
    selectionSignature(selections, geometryKeysByExperimentId),
  );
  const liveSignature = useMemo(
    () => selectionSignature(selections, geometryKeysByExperimentId),
    [geometryKeysByExperimentId, selections],
  );

  useEffect(() => {
    if (!enabled) {
      setDebouncedSignature(liveSignature);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSignature(liveSignature);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [debounceMs, enabled, liveSignature]);

  const [spectraByExperimentId, setSpectraByExperimentId] = useState<
    Map<string, SpectrumPoint[]>
  >(new Map());
  const [loadingExperimentIds, setLoadingExperimentIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentSelections = selectionsRef.current;
    const currentGeometry = geometryRef.current;

    if (!enabled || currentSelections.length === 0) {
      setSpectraByExperimentId(new Map());
      setLoadingExperimentIds(new Set());
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    const targetIds = new Set(
      currentSelections.map((selection) => selection.experimentId),
    );
    setSpectraByExperimentId((previous) => {
      const next = new Map<string, SpectrumPoint[]>();
      for (const [experimentId, points] of previous) {
        if (targetIds.has(experimentId)) {
          next.set(experimentId, points);
        }
      }
      return next;
    });
    setLoadingExperimentIds(targetIds);
    setIsLoading(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const entries = await fetchWithConcurrency(
          currentSelections,
          PLOT_VIEWER_SPECTRUM_FETCH_CONCURRENCY,
          async (selection) => {
            const geometryKeys = currentGeometry?.[selection.experimentId];
            const input = {
              experimentId: selection.experimentId,
              limit: PLOT_VIEWER_SPECTRUM_ROW_LIMIT,
              offset: 0,
              geometryKeys:
                geometryKeys && geometryKeys.length > 0
                  ? [...geometryKeys]
                  : undefined,
            };
            const rows = await queryClient.fetchQuery({
              queryKey: [
                ["spectrumpoints", "getByExperimentForPlot"],
                { input, type: "query" as const },
              ],
              queryFn: () =>
                utils.spectrumpoints.getByExperimentForPlot.fetch(input),
              staleTime: PLOT_VIEWER_SPECTRUM_STALE_MS,
              gcTime: PLOT_VIEWER_SPECTRUM_GC_MS,
            });
            return [
              selection.experimentId,
              mapDbSpectrumRowsToPoints(rows),
            ] as const;
          },
        );

        if (!cancelled) {
          setSpectraByExperimentId((previous) => {
            const next = new Map(previous);
            for (const [experimentId, points] of entries) {
              next.set(experimentId, points);
            }
            return next;
          });
          setLoadingExperimentIds(new Set());
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingExperimentIds(new Set());
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load spectra",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSignature, enabled, queryClient, utils.spectrumpoints.getByExperimentForPlot]);

  const datasets = useMemo((): DashboardPlotDatasetInput[] => {
    return selections.map((selection) => ({
      experimentId: selection.experimentId,
      label: selection.label,
      chemicalFormula: selection.chemicalFormula,
      spectrumPoints:
        spectraByExperimentId.get(selection.experimentId) ?? [],
    }));
  }, [selections, spectraByExperimentId]);

  return {
    datasets,
    spectraByExperimentId,
    isLoading,
    loadingExperimentIds,
    errorMessage,
  };
}
