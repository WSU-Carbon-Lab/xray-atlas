import { useMemo } from "react";
import type { DatasetState } from "../types";
import { uploadGeometryIsComplete } from "../utils/default-upload-phi";
import { hasSpectrumEnergyConflicts } from "~/lib/nexafs/spectrumPointEnergyUniqueness";
import {
  edgeLabelFromAtomCore,
  evaluateEdgeEnergyConsistency,
  spectrumEnergyExtent,
} from "~/lib/nexafs/edge-energy-bands";

export type DatasetStatus = "complete" | "incomplete" | "error" | "processing";

export interface DatasetStatusInfo {
  status: DatasetStatus;
  missingFields: string[];
  errors: string[];
}

type EdgeOptionRef = {
  id: string;
  targetatom: string;
  corestate: string;
};

/**
 * Derives contribute dataset completeness and blocking errors, including
 * absorption-edge vs spectrum energy-band mismatches when `edgeOptions` resolve
 * the selected edge id.
 *
 * @param dataset - Active upload dataset state.
 * @param edgeOptions - Catalog edges used to resolve `dataset.edgeId` to a label.
 */
export function useDatasetStatus(
  dataset: DatasetState,
  edgeOptions: readonly EdgeOptionRef[] = [],
): DatasetStatusInfo {
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

    if (hasSpectrumEnergyConflicts(dataset.spectrumPoints)) {
      errors.push(
        "Duplicate photon energies with conflicting values. Resolve before submit.",
      );
    }

    if (dataset.edgeId && dataset.spectrumPoints.length > 0) {
      const selectedEdge = edgeOptions.find((edge) => edge.id === dataset.edgeId);
      if (selectedEdge) {
        const extent = spectrumEnergyExtent(dataset.spectrumPoints);
        if (extent) {
          const consistency = evaluateEdgeEnergyConsistency({
            edgeLabel: edgeLabelFromAtomCore(
              selectedEdge.targetatom,
              selectedEdge.corestate,
            ),
            minEv: extent.minEv,
            maxEv: extent.maxEv,
          });
          if (!consistency.ok) {
            errors.push(consistency.message);
          }
        }
      }
    }

    const hasThetaMapping = Boolean(dataset.columnMappings.theta);
    const hasPhiMapping = Boolean(dataset.columnMappings.phi);
    if (hasPhiMapping && !hasThetaMapping) {
      errors.push(
        "Map a theta column when phi is mapped, or use fixed geometry",
      );
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
  }, [dataset, edgeOptions]);
}
