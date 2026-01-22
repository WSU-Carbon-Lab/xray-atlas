import { useState, useCallback } from "react";
import type { DatasetState, CSVColumnMappings } from "~/app/contribute/nexafs/types";

export type BatchOperationType =
  | "apply-molecule"
  | "apply-instrument"
  | "apply-edge"
  | "apply-column-mapping";

export interface BatchOperation {
  type: BatchOperationType;
  datasetIds: string[];
  value: string | CSVColumnMappings;
}

export function useBatchOperations(
  datasets: DatasetState[],
  onUpdateDatasets: (
    updates: Array<{ id: string; updates: Partial<DatasetState> }>,
  ) => void,
) {
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleSelection = useCallback((datasetId: string) => {
    setSelectedDatasetIds((prev) => {
      const next = new Set(prev);
      if (next.has(datasetId)) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedDatasetIds(new Set(datasets.map((d) => d.id)));
  }, [datasets]);

  const clearSelection = useCallback(() => {
    setSelectedDatasetIds(new Set());
  }, []);

  const applyMolecule = useCallback(
    (moleculeId: string) => {
      const updates = Array.from(selectedDatasetIds).map((id) => ({
        id,
        updates: { moleculeId } as Partial<DatasetState>,
      }));
      onUpdateDatasets(updates);
      clearSelection();
    },
    [selectedDatasetIds, onUpdateDatasets, clearSelection],
  );

  const applyInstrument = useCallback(
    (instrumentId: string) => {
      const updates = Array.from(selectedDatasetIds).map((id) => ({
        id,
        updates: { instrumentId } as Partial<DatasetState>,
      }));
      onUpdateDatasets(updates);
      clearSelection();
    },
    [selectedDatasetIds, onUpdateDatasets, clearSelection],
  );

  const applyEdge = useCallback(
    (edgeId: string) => {
      const updates = Array.from(selectedDatasetIds).map((id) => ({
        id,
        updates: { edgeId } as Partial<DatasetState>,
      }));
      onUpdateDatasets(updates);
      clearSelection();
    },
    [selectedDatasetIds, onUpdateDatasets, clearSelection],
  );

  const applyColumnMapping = useCallback(
    (mappings: CSVColumnMappings) => {
      const updates = Array.from(selectedDatasetIds).map((id) => ({
        id,
        updates: { columnMappings: mappings } as Partial<DatasetState>,
      }));
      onUpdateDatasets(updates);
      clearSelection();
    },
    [selectedDatasetIds, onUpdateDatasets, clearSelection],
  );

  return {
    selectedDatasetIds,
    toggleSelection,
    selectAll,
    clearSelection,
    applyMolecule,
    applyInstrument,
    applyEdge,
    applyColumnMapping,
    hasSelection: selectedDatasetIds.size > 0,
    selectionCount: selectedDatasetIds.size,
  };
}
