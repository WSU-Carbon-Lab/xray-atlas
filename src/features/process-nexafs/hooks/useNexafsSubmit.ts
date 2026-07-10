"use client";

import { useState, useCallback } from "react";
import { trpc } from "~/trpc/client";
import type { ToastType } from "@/components/ui/toast";
import { uploadQueuedAuxFiles } from "~/hooks/useAuxFileUpload";
import { sampleAuxFieldsHasData } from "~/components/forms/SampleAuxAccordion";
import type { DatasetState, PendingAuxFile } from "../types";
import { filterValidOrcidAttributions } from "~/lib/nexafs-attribution";
import {
  buildSpectrumPointsWithDerivedForUpload,
  extractGeometryPairs,
  resolveHenkeMergeDomainForUploadDataset,
} from "../utils";
import {
  parseStrictFiniteNumber,
  resolveUploadFixedPhi,
  uploadGeometryIsComplete,
} from "../utils/default-upload-phi";
import {
  applyKkDeltaToSpectrumPoints,
  DEFAULT_KK_MASS_DENSITY_G_CM3,
} from "~/features/kk-calc";

export type SubmitStatus = { type: "error"; message: string } | undefined;

export type DatasetPersistedIds = {
  experimentId: string;
  sampleId: string;
  remainingExperimentAuxFiles: PendingAuxFile[];
  remainingSampleAuxFiles: PendingAuxFile[];
};

export function useNexafsSubmit(
  datasets: DatasetState[],
  options?: {
    onSuccess?: () => void;
    onDatasetPersisted?: (datasetId: string, ids: DatasetPersistedIds) => void;
    requestKkConsent?: () => Promise<boolean>;
    showToast?: (message: string, type?: ToastType) => void;
  },
) {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(undefined);
  const utils = trpc.useUtils();
  const createNexafsMutation =
    trpc.experiments.createWithSpectrum.useMutation();
  const sampleAuxUpsertMutation = trpc.sampleAux.upsert.useMutation();

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

      const datasetsToSubmit = datasets.filter(
        (dataset) => !dataset.persistedExperimentId,
      );
      if (datasetsToSubmit.length === 0) {
        setSubmitStatus({
          type: "error",
          message:
            "Every open dataset is already submitted. Clear the form or add a new dataset tab.",
        });
        return;
      }

      for (const dataset of datasetsToSubmit) {
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
        const attributionRows = filterValidOrcidAttributions(
          dataset.attributions,
        );
        const uploaderCount = attributionRows.filter(
          (row) => row.role === "DataCurator",
        ).length;
        if (uploaderCount !== 1) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Add exactly one data curator (uploader) in Researcher attribution.`,
          });
          return;
        }
        const hasThetaMapping = Boolean(dataset.columnMappings.theta);
        const hasPhiMapping = Boolean(dataset.columnMappings.phi);
        if (hasPhiMapping && !hasThetaMapping) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Map a theta column when phi is mapped, or use fixed geometry.`,
          });
          return;
        }
        if (
          !uploadGeometryIsComplete({
            hasThetaColumn: hasThetaMapping,
            hasPhiColumn: hasPhiMapping,
            fixedTheta: dataset.fixedTheta,
            fixedPhi: dataset.fixedPhi,
          })
        ) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Provide theta geometry (phi defaults to 0 when omitted).`,
          });
          return;
        }
      }

      const needsKk = datasetsToSubmit.some((d) => d.computeKkDeltaOnSubmit);
      if (needsKk) {
        if (!options?.requestKkConsent) {
          setSubmitStatus({
            type: "error",
            message:
              "Browser Kramers–Kronig consent is not available; reload the contribute page or disable the KK option.",
          });
          return;
        }
        const ok = await options.requestKkConsent();
        if (!ok) {
          setSubmitStatus({
            type: "error",
            message:
              "Browser Kramers–Kronig calculation was not authorized for this session.",
          });
          return;
        }
      }

      try {
        for (const dataset of datasetsToSubmit) {
          if (!dataset.moleculeId) return;

          const attributionRows = filterValidOrcidAttributions(
            dataset.attributions,
          );

          const hasThetaMapping = Boolean(dataset.columnMappings.theta);
          const hasPhiMapping = Boolean(dataset.columnMappings.phi);
          const geometryInput =
            hasThetaMapping || hasPhiMapping
              ? {
                  mode: "csv" as const,
                  csvGeometries: extractGeometryPairs(dataset.spectrumPoints),
                }
              : {
                  mode: "fixed" as const,
                  fixed: {
                    theta: parseStrictFiniteNumber(dataset.fixedTheta)!,
                    phi: parseStrictFiniteNumber(
                      resolveUploadFixedPhi(dataset.fixedPhi, hasPhiMapping)!,
                    )!,
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

          let spectrumPoints = buildSpectrumPointsWithDerivedForUpload(dataset);
          if (dataset.computeKkDeltaOnSubmit) {
            const hasBeta = spectrumPoints.every(
              (p) => typeof p.beta === "number" && Number.isFinite(p.beta),
            );
            if (!hasBeta) {
              setSubmitStatus({
                type: "error",
                message: `Dataset "${dataset.fileName}": Kramers–Kronig requires finite beta on every row. Derive beta via normalization or map a beta column before enabling KK.`,
              });
              return;
            }
            try {
              const mol = await utils.client.molecules.getById.query({
                id: dataset.moleculeId,
              });
              const formula = mol.chemicalFormula?.trim();
              if (!formula) {
                setSubmitStatus({
                  type: "error",
                  message: `Dataset "${dataset.fileName}": Kramers–Kronig requires a chemical formula on the selected molecule.`,
                });
                return;
              }
              spectrumPoints = applyKkDeltaToSpectrumPoints(spectrumPoints, {
                stoichiometryFormula: formula,
                massDensityGPerCm3: DEFAULT_KK_MASS_DENSITY_G_CM3,
                henkeMergeDomain: resolveHenkeMergeDomainForUploadDataset(
                  dataset,
                  formula,
                ),
              });
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : "Kramers–Kronig failed.";
              setSubmitStatus({
                type: "error",
                message: `${dataset.fileName}: ${msg}`,
              });
              return;
            }
          }

          const createResult = await createNexafsMutation.mutateAsync({
            sample: {
              moleculeId: dataset.moleculeId,
              identifier: crypto.randomUUID(),
              processMethod: dataset.sampleInfo.processMethod ?? undefined,
              substrate:
                dataset.sampleInfo.substrate.trim() === ""
                  ? undefined
                  : dataset.sampleInfo.substrate.trim(),
              patterningLayer:
                dataset.sampleInfo.patterningLayer.trim() === ""
                  ? undefined
                  : dataset.sampleInfo.patterningLayer.trim(),
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
              vendor: vendorPayload ?? {},
            },
            experiment: {
              instrumentId: dataset.instrumentId,
              edgeId: dataset.edgeId,
              experimentType: dataset.experimentType,
              calibrationId: dataset.calibrationId || undefined,
              referenceStandard: dataset.referenceStandard.trim() || undefined,
              isStandard: dataset.isStandard,
              normalization: {
                scope: dataset.normalizationScope,
                ranges:
                  dataset.normalizationScope === "none"
                    ? null
                    : {
                        pre: dataset.normalizationRegions.pre,
                        post: dataset.normalizationRegions.post,
                      },
              },
              validationOverride:
                dataset.validationOverride.bypass ||
                dataset.validationOverride.reason.trim().length > 0
                  ? {
                      bypass: dataset.validationOverride.bypass,
                      reason:
                        dataset.validationOverride.reason.trim() || undefined,
                    }
                  : undefined,
              uploadedChannels: [
                "rawabs",
                ...(dataset.columnMappings.od ? (["od"] as const) : []),
                ...(dataset.columnMappings.massabsorption
                  ? (["massabsorption"] as const)
                  : []),
                ...(dataset.columnMappings.beta ? (["beta"] as const) : []),
              ],
              computeKkDeltaOnSubmit: dataset.computeKkDeltaOnSubmit
                ? true
                : undefined,
            },
            geometry: geometryInput,
            spectrum: {
              points: spectrumPoints,
            },
            peaksets: dataset.peaks.length > 0 ? dataset.peaks : undefined,
            attributions:
              attributionRows.length > 0
                ? attributionRows.map((row) => ({
                    orcid: row.orcid,
                    role: row.role,
                  }))
                : undefined,
            sourcePaperDois: dataset.sourcePaperPublications.map(
              (publication) => publication.doi,
            ),
          });

          const sampleId = createResult.sample.id;
          const experimentId = createResult.experiments[0]?.experiment.id;
          if (!experimentId) {
            throw new Error(
              `Dataset "${dataset.fileName}": Experiment was not created.`,
            );
          }

          if (sampleAuxFieldsHasData(dataset.sampleAux)) {
            try {
              await sampleAuxUpsertMutation.mutateAsync({
                sampleId,
                data: dataset.sampleAux,
              });
            } catch (auxError) {
              console.error(
                "Failed to save extended sample metadata",
                auxError,
              );
              options?.showToast?.(
                `Dataset "${dataset.fileName}" was created, but extended sample preparation could not be saved. Edit the sample later from your dataset.`,
                "warning",
              );
            }
          }

          const auxWarnings: string[] = [];
          let remainingExperimentAuxFiles = dataset.pendingExperimentAuxFiles;
          let remainingSampleAuxFiles = dataset.pendingSampleAuxFiles;

          if (dataset.pendingExperimentAuxFiles.length > 0) {
            const experimentUpload = await uploadQueuedAuxFiles(utils, {
              scope: "experiment",
              subjectId: experimentId,
              files: dataset.pendingExperimentAuxFiles,
            });
            if (experimentUpload.failed.length > 0) {
              const failedKeys = new Set(
                experimentUpload.failed.map((entry) => entry.clientKey),
              );
              remainingExperimentAuxFiles =
                dataset.pendingExperimentAuxFiles.filter((entry) =>
                  failedKeys.has(entry.clientKey),
                );
              auxWarnings.push(
                `${experimentUpload.failed.length} experiment file(s) failed to upload and remain queued here for retry.`,
              );
            } else {
              remainingExperimentAuxFiles = [];
            }
          }

          if (dataset.pendingSampleAuxFiles.length > 0) {
            const sampleUpload = await uploadQueuedAuxFiles(utils, {
              scope: "sample",
              subjectId: sampleId,
              files: dataset.pendingSampleAuxFiles,
            });
            if (sampleUpload.failed.length > 0) {
              const failedKeys = new Set(
                sampleUpload.failed.map((entry) => entry.clientKey),
              );
              remainingSampleAuxFiles = dataset.pendingSampleAuxFiles.filter(
                (entry) => failedKeys.has(entry.clientKey),
              );
              auxWarnings.push(
                `${sampleUpload.failed.length} sample file(s) failed to upload and remain queued here for retry.`,
              );
            } else {
              remainingSampleAuxFiles = [];
            }
          }

          for (const warning of auxWarnings) {
            options?.showToast?.(`${dataset.fileName}: ${warning}`, "warning");
          }

          options?.onDatasetPersisted?.(dataset.id, {
            experimentId,
            sampleId,
            remainingExperimentAuxFiles,
            remainingSampleAuxFiles,
          });
        }

        setSubmitStatus(undefined);
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
    [createNexafsMutation, datasets, options, sampleAuxUpsertMutation, utils],
  );

  return {
    submit,
    submitStatus,
    setSubmitStatus,
    isPending: createNexafsMutation.isPending,
  };
}
