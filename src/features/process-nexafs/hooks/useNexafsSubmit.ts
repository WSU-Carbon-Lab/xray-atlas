"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import type { ToastType } from "~/components/ui/toast";
import { uploadQueuedAuxFiles } from "~/hooks/useAuxFileUpload";
import { sampleAuxFieldsHasData } from "~/components/forms/SampleAuxAccordion";
import type { DatasetState, PendingAuxFile } from "../types";
import {
  applySimilarityContinuePatch,
  type SimilarityContinuePatch,
} from "../utils/similarity-continue-patch";
import {
  ensureSessionDataCuratorAttribution,
  isUploaderContributorRole,
  type SessionUploaderAttributionIdentity,
} from "~/lib/nexafs-attribution";
import {
  buildSpectrumPointsWithDerivedForUpload,
  extractGeometryPairs,
  resolveHenkeMergeDomainForUploadDataset,
} from "../utils";
import {
  parseStrictFiniteNumber,
  resolveUploadFixedPhi,
  applyDefaultUploadPhiToPoints,
  uploadGeometryIsComplete,
} from "../utils/default-upload-phi";
import { describeInvalidPolarizationGeometry } from "../utils/polarizationAngle";
import { hasSpectrumEnergyConflicts } from "~/lib/nexafs/spectrumPointEnergyUniqueness";
import {
  datasetSimilarityPercent,
  DATASET_SIMILARITY_WARN_THRESHOLD,
  similaritiesAboveThreshold,
  type DatasetSimilarityMatch,
} from "~/lib/nexafs/dataset-similarity";
import {
  edgeLabelFromAtomCore,
  evaluateEdgeEnergyConsistency,
  spectrumEnergyExtent,
} from "~/lib/nexafs/edge-energy-bands";
import { plotPeakToPeaksetWrite } from "~/lib/nexafs/peakset-kind";
import {
  applyKkDeltaToSpectrumPoints,
  DEFAULT_KK_MASS_DENSITY_G_CM3,
} from "~/features/kk-calc";
import {
  isPasskeyClientCancelled,
  isSessionAalRequiredError,
  PASSKEY_ENROLL_BEFORE_CONTRIBUTE_MESSAGE,
  PASSKEY_STEP_UP_CONTRIBUTE_CANCELLED_MESSAGE,
  runPasskeyClientAuth,
} from "~/lib/passkey-client-auth";

export type SubmitStatus = { type: "error"; message: string } | undefined;

export type DatasetPersistedIds = {
  experimentId: string;
  sampleId: string;
  remainingExperimentAuxFiles: PendingAuxFile[];
  remainingSampleAuxFiles: PendingAuxFile[];
};

type EdgeOptionRef = {
  id: string;
  targetatom: string;
  corestate: string;
};

type InstrumentOptionRef = {
  id: string;
  name: string;
  facilityName?: string;
};

/**
 * Arguments for the advisory similarity confirmation gate before contribute submit.
 */
export type SimilarityConfirmRequest = {
  dataset: DatasetState;
  match: DatasetSimilarityMatch;
  /** Other Atlas matches at or above the warn threshold (same molecule). */
  siblingMatches?: readonly DatasetSimilarityMatch[];
  /** 0-based index of this upload within the submit batch. */
  batchIndex: number;
  /** Total datasets in the submit batch (including those without a match). */
  batchTotal: number;
  /** File names for every dataset in the submit batch, same order as submit. */
  batchFileNames: readonly string[];
  edgeOptions?: readonly EdgeOptionRef[];
  instrumentOptions?: readonly InstrumentOptionRef[];
};

/** Result of the similarity compare dialog (continue with optional field patch, or cancel). */
export type SimilarityConfirmOutcome =
  | { confirmed: false }
  | { confirmed: true; patch: SimilarityContinuePatch };

export function useNexafsSubmit(
  datasets: DatasetState[],
  options?: {
    onSuccess?: () => void;
    onDatasetPersisted?: (datasetId: string, ids: DatasetPersistedIds) => void;
    requestKkConsent?: () => Promise<boolean>;
    /**
     * Opens the rich similarity comparison UI; resolve `confirmed: true` with an
     * optional field patch to continue submit, or `confirmed: false` to abort.
     * When omitted, similarity matches are skipped (advisory).
     */
    requestSimilarityConfirm?: (
      request: SimilarityConfirmRequest,
    ) => Promise<SimilarityConfirmOutcome>;
    showToast?: (message: string, type?: ToastType) => void;
    onEnergyConflicts?: (datasetId: string) => void;
    edgeOptions?: readonly EdgeOptionRef[];
    instrumentOptions?: readonly InstrumentOptionRef[];
  },
) {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(undefined);
  const [isConfirmingPasskey, setIsConfirmingPasskey] = useState(false);
  const { data: session } = useSession();
  const sessionUploader = useMemo((): SessionUploaderAttributionIdentity | null => {
    if (!session?.user?.id) {
      return null;
    }
    return {
      orcid: session.user.id,
      displayName: session.user.name ?? null,
      imageUrl: session.user.image,
    };
  }, [session?.user?.id, session?.user?.image, session?.user?.name]);
  const utils = trpc.useUtils();
  const createNexafsMutation =
    trpc.experiments.createWithSpectrum.useMutation();
  const sampleAuxUpsertMutation = trpc.sampleAux.upsert.useMutation();
  const confirmPasskeySessionStepUp =
    trpc.users.confirmPasskeySessionStepUp.useMutation();

  const ensureSubmitPasskey = useCallback(async (): Promise<boolean> => {
    const assurance = await utils.users.getSessionWriteAssurance.fetch();
    if (assurance.satisfied) {
      return true;
    }
    if (!assurance.enrolled) {
      setSubmitStatus({
        type: "error",
        message: PASSKEY_ENROLL_BEFORE_CONTRIBUTE_MESSAGE,
      });
      return false;
    }

    setIsConfirmingPasskey(true);
    try {
      const result = await runPasskeyClientAuth({
        action: "sign-in",
        callbackUrl: window.location.href,
        errorFallback: "Passkey confirmation failed. Please try again.",
        incompleteFallback: "Passkey confirmation did not complete",
      });

      if (!result.ok) {
        const message =
          result.errorMessage ?? "Passkey confirmation failed. Please try again.";
        if (
          isPasskeyClientCancelled(new Error(message)) ||
          message.toLowerCase().includes("interrupted") ||
          message.toLowerCase().includes("denied")
        ) {
          setSubmitStatus({
            type: "error",
            message: PASSKEY_STEP_UP_CONTRIBUTE_CANCELLED_MESSAGE,
          });
          return false;
        }
        setSubmitStatus({ type: "error", message });
        return false;
      }

      const stepUp = await confirmPasskeySessionStepUp.mutateAsync();
      await utils.users.getSessionWriteAssurance.invalidate();
      if (!stepUp.evaluation.satisfied) {
        setSubmitStatus({
          type: "error",
          message:
            "Passkey confirmation did not elevate this session. Try again, or register a passkey first.",
        });
        return false;
      }
      return true;
    } catch (error) {
      if (isPasskeyClientCancelled(error)) {
        setSubmitStatus({
          type: "error",
          message: PASSKEY_STEP_UP_CONTRIBUTE_CANCELLED_MESSAGE,
        });
        return false;
      }
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Passkey confirmation failed. Please try again.",
      });
      return false;
    } finally {
      setIsConfirmingPasskey(false);
    }
  }, [confirmPasskeySessionStepUp, utils.users.getSessionWriteAssurance]);

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
        const selectedEdge = options?.edgeOptions?.find(
          (edge) => edge.id === dataset.edgeId,
        );
        if (selectedEdge && dataset.spectrumPoints.length > 0) {
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
              const confirmed = window.confirm(
                `${consistency.message} Submit with this edge anyway?`,
              );
              if (!confirmed) {
                setSubmitStatus({
                  type: "error",
                  message: `Dataset "${dataset.fileName}": ${consistency.message}`,
                });
                return;
              }
            }
          }
        }
        if (dataset.spectrumPoints.length === 0) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": No spectrum data found.`,
          });
          return;
        }
        if (hasSpectrumEnergyConflicts(dataset.spectrumPoints)) {
          options?.onEnergyConflicts?.(dataset.id);
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Duplicate photon energies with conflicting values. Resolve the row conflicts before submitting.`,
          });
          return;
        }
        const attributionRows = ensureSessionDataCuratorAttribution(
          dataset.attributions,
          sessionUploader,
        );
        const uploaderCount = attributionRows.filter((row) =>
          isUploaderContributorRole(row.role),
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

      let datasetsForSubmit = [...datasetsToSubmit];
      const batchTotal = datasetsForSubmit.length;
      const batchFileNames = datasetsForSubmit.map((row) => row.fileName);

      for (let index = 0; index < datasetsForSubmit.length; index++) {
        const dataset = datasetsForSubmit[index]!;
        if (!dataset.moleculeId || dataset.spectrumPoints.length === 0) {
          continue;
        }
        const extent = spectrumEnergyExtent(dataset.spectrumPoints);
        if (!extent) {
          continue;
        }
        try {
          const similar = await utils.experiments.findSimilarForContributor.fetch(
            {
              moleculeId: dataset.moleculeId,
              minEv: extent.minEv,
              maxEv: extent.maxEv,
              limit: 8,
            },
          );
          const ranked = similaritiesAboveThreshold(
            similar.matches,
            DATASET_SIMILARITY_WARN_THRESHOLD,
          );
          const best = ranked[0] ?? null;
          if (best && options?.requestSimilarityConfirm) {
            const percent = datasetSimilarityPercent(best.score);
            options.showToast?.(
              `Similarity check ${index + 1} of ${batchTotal}: ${dataset.fileName}`,
              "info",
            );
            const outcome = await options.requestSimilarityConfirm({
              dataset,
              match: best,
              siblingMatches: ranked.slice(1),
              batchIndex: index,
              batchTotal,
              batchFileNames,
              edgeOptions: options.edgeOptions,
              instrumentOptions: options.instrumentOptions,
            });
            if (!outcome.confirmed) {
              setSubmitStatus({
                type: "error",
                message: `Dataset "${dataset.fileName}" (${index + 1} of ${batchTotal}): Submit cancelled — similar existing dataset (score ${percent}).`,
              });
              return;
            }
            datasetsForSubmit[index] = applySimilarityContinuePatch(
              dataset,
              outcome.patch,
            );
          }
        } catch {
          // Similarity is advisory; do not block submit when the lookup fails.
        }
      }

      const needsKk = datasetsForSubmit.some((d) => d.computeKkDeltaOnSubmit);
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
        if (!(await ensureSubmitPasskey())) {
          return;
        }

        let didRetryPasskey = false;
        for (const dataset of datasetsForSubmit) {
          if (!dataset.moleculeId) return;

          const attributionRows = ensureSessionDataCuratorAttribution(
            dataset.attributions,
            sessionUploader,
          );

          const hasThetaMapping = Boolean(dataset.columnMappings.theta);
          const hasPhiMapping = Boolean(dataset.columnMappings.phi);
          const spectrumPointsWithPhi = applyDefaultUploadPhiToPoints(
            dataset.spectrumPoints,
            dataset.fixedPhi,
          );
          const geometryInput =
            hasThetaMapping || hasPhiMapping
              ? {
                  mode: "csv" as const,
                  csvGeometries: extractGeometryPairs(spectrumPointsWithPhi),
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

          const geometriesToValidate =
            geometryInput.mode === "csv"
              ? (geometryInput.csvGeometries ?? [])
              : geometryInput.fixed
                ? [geometryInput.fixed]
                : [];
          for (const geometry of geometriesToValidate) {
            const invalid = describeInvalidPolarizationGeometry(
              geometry.theta,
              geometry.phi,
            );
            if (invalid) {
              setSubmitStatus({
                type: "error",
                message: `Dataset "${dataset.fileName}": ${invalid}. Remap theta/phi or use fixed geometry.`,
              });
              return;
            }
          }

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

          let spectrumPoints = buildSpectrumPointsWithDerivedForUpload({
            ...dataset,
            spectrumPoints: spectrumPointsWithPhi,
          });
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

          const createPayload = {
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
                        bandMode: dataset.normalizationBandMode,
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
                "rawabs" as const,
                ...(dataset.columnMappings.od
                  ? (["od"] as const)
                  : ([] as const)),
                ...(dataset.columnMappings.massabsorption
                  ? (["massabsorption"] as const)
                  : ([] as const)),
                ...(dataset.columnMappings.beta
                  ? (["beta"] as const)
                  : ([] as const)),
              ],
              computeKkDeltaOnSubmit: dataset.computeKkDeltaOnSubmit
                ? true
                : undefined,
            },
            geometry: geometryInput,
            spectrum: {
              points: spectrumPoints,
            },
            peaksets:
              dataset.peaks.length > 0
                ? dataset.peaks.map((peak) => {
                    const mapped = plotPeakToPeaksetWrite({
                      energy: peak.energy,
                      intensity: peak.intensity ?? peak.amplitude,
                      peakKind: peak.peakKind,
                      bond: peak.bond,
                      transition: peak.transition,
                    });
                    return {
                      energy: mapped.energyev,
                      intensity: mapped.intensity ?? undefined,
                      bond: mapped.bond ?? undefined,
                      transition: mapped.transition ?? undefined,
                      peakKind: peak.peakKind ?? undefined,
                    };
                  })
                : undefined,
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
          };

          let createResult;
          try {
            createResult = await createNexafsMutation.mutateAsync(createPayload);
          } catch (createError) {
            if (!isSessionAalRequiredError(createError) || didRetryPasskey) {
              throw createError;
            }
            didRetryPasskey = true;
            if (!(await ensureSubmitPasskey())) {
              return;
            }
            createResult =
              await createNexafsMutation.mutateAsync(createPayload);
          }

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

          void utils.client.experiments.mintZenodoDatasetDoi
            .mutate({ experimentId })
            .catch((mintError: unknown) => {
              console.error(
                "Zenodo dataset DOI mint failed (non-blocking)",
                mintError,
              );
            });

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
    [
      createNexafsMutation,
      datasets,
      ensureSubmitPasskey,
      options,
      sampleAuxUpsertMutation,
      sessionUploader,
      utils,
    ],
  );

  return {
    submit,
    submitStatus,
    setSubmitStatus,
    isPending: createNexafsMutation.isPending || isConfirmingPasskey,
  };
}
