import { useMemo } from "react";
import type { DatasetState } from "../types";
import {
  classifyColumnFillStatus,
  datasetHasResolvablePrimary,
} from "../utils/channelCompleteness";

export type DatasetStatus =
  | "complete"
  | "incomplete"
  | "error"
  | "processing";

export interface DatasetStatusInfo {
  status: DatasetStatus;
  missingFields: string[];
  errors: string[];
}

export function useDatasetStatus(dataset: DatasetState): DatasetStatusInfo {
  return useMemo(() => {
    const missingFields: string[] = [];
    const errors: string[] = [];

    if (!dataset.moleculeId) {
      missingFields.push("Molecule");
    }
    if (!dataset.instrumentId) {
      missingFields.push("Instrument");
    }
    if (!dataset.edgeId) {
      missingFields.push("Edge");
    }

    const fillStatus = classifyColumnFillStatus(
      dataset.csvRawData,
      dataset.columnMappings,
    );
    const hasPrimary = datasetHasResolvablePrimary({
      mappings: dataset.columnMappings,
      fillStatus,
      primaryRepresentation: dataset.primaryRepresentation,
      primaryRepresentationLocked: dataset.primaryRepresentationLocked,
      primaryInferenceNeedsChoice: dataset.primaryInferenceNeedsChoice,
    });

    if (!hasPrimary) {
      if (
        dataset.primaryInferenceNeedsChoice &&
        !dataset.primaryRepresentationLocked
      ) {
        errors.push(
          "Confirm the primary signal column in column mapping before submitting.",
        );
      } else {
        missingFields.push("Column Mapping");
      }
    }

    if (dataset.spectrumPoints.length === 0 && !dataset.spectrumError) {
      missingFields.push("Spectrum Data");
    }

    if (dataset.spectrumError) {
      errors.push(dataset.spectrumError);
    }

    const hasThetaMapping = Boolean(dataset.columnMappings.theta);
    const hasPhiMapping = Boolean(dataset.columnMappings.phi);
    if (hasThetaMapping !== hasPhiMapping) {
      errors.push("Theta and Phi must both be mapped or both use fixed values");
    }
    if (!hasThetaMapping && (!dataset.fixedTheta || !dataset.fixedPhi)) {
      missingFields.push("Geometry (Theta/Phi)");
    }

    let status: DatasetStatus = "incomplete";
    if (errors.length > 0) {
      status = "error";
    } else if (missingFields.length === 0) {
      status = "complete";
    }

    return {
      status,
      missingFields,
      errors,
    };
  }, [dataset]);
}
