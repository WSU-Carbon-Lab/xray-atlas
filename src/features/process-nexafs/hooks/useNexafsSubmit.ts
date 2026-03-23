"use client";

import { useState, useCallback } from "react";
import { trpc } from "~/trpc/client";
import type { DatasetState } from "../types";
import { extractGeometryPairs } from "../utils";

export type SubmitStatus =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | undefined;

export function useNexafsSubmit(
  datasets: DatasetState[],
  options?: { onSuccess?: () => void },
) {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(undefined);
  const createNexafsMutation =
    trpc.experiments.createWithSpectrum.useMutation();

  const submit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      setSubmitStatus(undefined);

      if (datasets.length === 0) {
        setSubmitStatus({
          type: "error",
          message: "Please upload at least one dataset.",
        });
        return;
      }

      for (const dataset of datasets) {
        if (!dataset.moleculeId) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Please select a molecule.`,
          });
          return;
        }
        if (!dataset.instrumentId) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Please select an instrument.`,
          });
          return;
        }
        if (!dataset.edgeId) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Please select an absorption edge.`,
          });
          return;
        }
        if (dataset.spectrumPoints.length === 0) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": No spectrum data found.`,
          });
          return;
        }
        const hasThetaMapping = Boolean(dataset.columnMappings.theta);
        const hasPhiMapping = Boolean(dataset.columnMappings.phi);
        if (hasThetaMapping !== hasPhiMapping) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Provide both theta and phi column mappings, or leave both unset.`,
          });
          return;
        }
        if (!hasThetaMapping && (!dataset.fixedTheta || !dataset.fixedPhi)) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Provide theta and phi values for fixed geometry.`,
          });
          return;
        }
      }

      try {
        for (const dataset of datasets) {
          if (!dataset.moleculeId) return;

          const geometryInput =
            dataset.columnMappings.theta && dataset.columnMappings.phi
              ? {
                  mode: "csv" as const,
                  csvGeometries: extractGeometryPairs(dataset.spectrumPoints),
                }
              : {
                  mode: "fixed" as const,
                  fixed: {
                    theta: parseFloat(dataset.fixedTheta),
                    phi: parseFloat(dataset.fixedPhi),
                  },
                };

          let vendorPayload:
            | { existingVendorId: string }
            | { name: string; url?: string }
            | undefined;

          if (dataset.sampleInfo.vendorId) {
            vendorPayload = { existingVendorId: dataset.sampleInfo.vendorId };
          } else if (dataset.sampleInfo.newVendorName.trim()) {
            vendorPayload = {
              name: dataset.sampleInfo.newVendorName.trim(),
              url: dataset.sampleInfo.newVendorUrl.trim() || undefined,
            };
          }

          await createNexafsMutation.mutateAsync({
            sample: {
              moleculeId: dataset.moleculeId,
              identifier: crypto.randomUUID(),
              processMethod: dataset.sampleInfo.processMethod ?? undefined,
              substrate:
                dataset.sampleInfo.substrate.trim() === ""
                  ? undefined
                  : dataset.sampleInfo.substrate.trim(),
              solvent:
                dataset.sampleInfo.solvent.trim() === ""
                  ? undefined
                  : dataset.sampleInfo.solvent.trim(),
              thickness:
                typeof dataset.sampleInfo.thickness === "number" &&
                Number.isFinite(dataset.sampleInfo.thickness)
                  ? dataset.sampleInfo.thickness
                  : undefined,
              molecularWeight:
                typeof dataset.sampleInfo.molecularWeight === "number" &&
                Number.isFinite(dataset.sampleInfo.molecularWeight)
                  ? dataset.sampleInfo.molecularWeight
                  : undefined,
              preparationDate: dataset.sampleInfo.preparationDate
                ? new Date(dataset.sampleInfo.preparationDate).toISOString()
                : undefined,
              vendor: vendorPayload ?? {},
            },
            experiment: {
              instrumentId: dataset.instrumentId,
              edgeId: dataset.edgeId,
              experimentType: dataset.experimentType,
              measurementDate: dataset.measurementDate
                ? new Date(dataset.measurementDate).toISOString()
                : undefined,
              calibrationId: dataset.calibrationId || undefined,
              referenceStandard: dataset.referenceStandard.trim() || undefined,
              isStandard: dataset.isStandard,
            },
            geometry: geometryInput,
            spectrum: {
              points: dataset.spectrumPoints,
            },
            peaksets: dataset.peaks.length > 0 ? dataset.peaks : undefined,
          });
        }

        setSubmitStatus({
          type: "success",
          message: `Successfully uploaded ${datasets.length} dataset(s).`,
        });
        options?.onSuccess?.();
      } catch (error) {
        console.error("Failed to submit NEXAFS data", error);
        setSubmitStatus({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to submit NEXAFS data. Please try again.",
        });
      }
    },
    [datasets, options],
  );

  return {
    submit,
    submitStatus,
    setSubmitStatus,
    isPending: createNexafsMutation.isPending,
  };
}
