import { useMemo } from "react";
import type { DatasetState } from "../types";
import { uploadGeometryIsComplete } from "../utils/default-upload-phi";

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
    if (!dataset.columnMappings.energy || !dataset.columnMappings.absorption) {
      missingFields.push("Column Mapping");
    }
    if (dataset.spectrumPoints.length === 0 && !dataset.spectrumError) {
      missingFields.push("Spectrum Data");
    }

    if (dataset.spectrumError) {
      errors.push(dataset.spectrumError);
    }

    const hasThetaMapping = Boolean(dataset.columnMappings.theta);
    const hasPhiMapping = Boolean(dataset.columnMappings.phi);
    if (hasPhiMapping && !hasThetaMapping) {
      errors.push("Map a theta column when phi is mapped, or use fixed geometry");
    }
    if (
      !uploadGeometryIsComplete({
        hasThetaColumn: hasThetaMapping,
        hasPhiColumn: hasPhiMapping,
        fixedTheta: dataset.fixedTheta,
        fixedPhi: dataset.fixedPhi,
      })
    ) {
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
