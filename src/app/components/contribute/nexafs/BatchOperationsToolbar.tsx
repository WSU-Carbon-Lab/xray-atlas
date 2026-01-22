"use client";

import { Chip } from "@heroui/react";
import type { DatasetState } from "~/app/contribute/nexafs/types";

interface BatchOperationsToolbarProps {
  datasets?: DatasetState[];
}

export function BatchOperationsToolbar({
  datasets = [],
}: BatchOperationsToolbarProps) {

  const statusCounts = { complete: 0, incomplete: 0, error: 0 };
  datasets.forEach((dataset) => {
    const hasMolecule = !!dataset.moleculeId;
    const hasInstrument = !!dataset.instrumentId;
    const hasEdge = !!dataset.edgeId;
    const hasMapping =
      !!dataset.columnMappings.energy && !!dataset.columnMappings.absorption;
    const hasData = dataset.spectrumPoints.length > 0;
    const hasError = !!dataset.spectrumError;

    if (hasError) {
      statusCounts.error++;
    } else if (hasMolecule && hasInstrument && hasEdge && hasMapping && hasData) {
      statusCounts.complete++;
    } else {
      statusCounts.incomplete++;
    }
  });
  const { complete: completeCount, incomplete: incompleteCount, error: errorCount } = statusCounts;

  if (datasets.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {datasets.length} dataset{datasets.length > 1 ? "s" : ""}
      </span>
      <div className="flex gap-2">
        <Chip
          size="sm"
          variant="flat"
          color="success"
          classNames={{ base: "h-6 px-2", content: "text-xs" }}
        >
          {completeCount} Complete
        </Chip>
        <Chip
          size="sm"
          variant="flat"
          color="warning"
          classNames={{ base: "h-6 px-2", content: "text-xs" }}
        >
          {incompleteCount} Incomplete
        </Chip>
        {errorCount > 0 && (
          <Chip
            size="sm"
            variant="flat"
            color="danger"
            classNames={{ base: "h-6 px-2", content: "text-xs" }}
          >
            {errorCount} Error
          </Chip>
        )}
      </div>
    </div>
  );
}
