"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SpectrumPoint } from "~/components/plots/types";
import { mapDbSpectrumRowsToPoints } from "~/features/process-nexafs/utils/mapDbSpectrumRowsToPoints";
import { trpc } from "~/trpc/client";
import type { DashboardPlotDatasetInput } from "./build-dashboard-plot-model";

export type DashboardPlotCatalogSelection = {
  experimentId: string;
  label: string;
  chemicalFormula: string | null;
};

/**
 * Fetches persisted spectrum points for each selected catalog experiment.
 */
export function useDashboardPlotSpectra(
  selections: readonly DashboardPlotCatalogSelection[],
): {
  datasets: DashboardPlotDatasetInput[];
  spectraByExperimentId: Map<string, SpectrumPoint[]>;
  isLoading: boolean;
  errorMessage: string | null;
} {
  const utils = trpc.useUtils();
  const selectionKey = selections.map((row) => row.experimentId).join("|");
  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;
  const [spectraByExperimentId, setSpectraByExperimentId] = useState<
    Map<string, SpectrumPoint[]>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentSelections = selectionsRef.current;
    if (currentSelections.length === 0) {
      setSpectraByExperimentId(new Map());
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    void (async () => {
      try {
        const entries = await Promise.all(
          currentSelections.map(async (selection) => {
            const rows = await utils.spectrumpoints.getByExperiment.fetch({
              experimentId: selection.experimentId,
              limit: 10000,
            });
            return [
              selection.experimentId,
              mapDbSpectrumRowsToPoints(rows),
            ] as const;
          }),
        );
        if (!cancelled) {
          setSpectraByExperimentId(new Map(entries));
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
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
  }, [selectionKey, utils.spectrumpoints.getByExperiment]);

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
    errorMessage,
  };
}
