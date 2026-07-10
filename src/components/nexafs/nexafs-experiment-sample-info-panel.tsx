"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import {
  SampleInformationEditStack,
  sampleAuxFieldsHasData,
} from "~/components/forms";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import { DefaultButton } from "~/components/ui/button";
import { showToast } from "~/components/ui/toast";
import type { SampleAuxFields } from "~/features/process-nexafs/types";
import {
  SampleMetadataEmptyState,
  SampleMetadataPanelHeading,
  SampleMetadataReadView,
} from "~/components/nexafs/sample-metadata-display-chrome";
import {
  coreSampleMetadataRows,
  coreSampleMetadataSections,
  extendedSampleAuxMetadataSections,
  sampleMetadataHasDisplayableRows,
} from "~/lib/sample-metadata-display";
import {
  applyProcessMethodToSampleFields,
  linkedSampleAuxForProcessMethod,
} from "~/lib/sample-process-method-link";
import {
  sampleCoreDraftFromPersistedRow,
  type SampleCoreDraft,
} from "~/lib/sample-core-draft";
import { resolveSampleVendorUpdatePayload } from "~/lib/sample-vendor-update";
import { trpc } from "~/trpc/client";

export type NexafsExperimentSampleInfoPanelProps = {
  experimentId: string;
  sampleId: string | null;
  enabled: boolean;
};

function sampleAuxFromQuery(
  data: Record<string, unknown> | null | undefined,
): SampleAuxFields {
  if (!data) {
    return {};
  }
  const { sampleId: _sampleId, ...fields } = data;
  const result: SampleAuxFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) {
      continue;
    }
    (result as Record<string, unknown>)[key] = value;
  }
  return result;
}

function NexafsExperimentSampleInfoSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-5 py-1"
      aria-busy
      aria-label="Loading sample information"
    >
      <div className="space-y-2">
        <LoadingSkeleton className="h-6 w-40 rounded-md" />
        <LoadingSkeleton className="h-4 w-full max-w-md rounded-md" />
      </div>
      <LoadingSkeleton className="h-[148px] w-full rounded-2xl" />
      <LoadingSkeleton className="h-[72px] w-full rounded-2xl" />
    </div>
  );
}

/**
 * Loads persisted sample and extended preparation metadata for one experiment; contributors may edit core and extended fields in place.
 */
export function NexafsExperimentSampleInfoPanel({
  experimentId,
  sampleId,
  enabled,
}: NexafsExperimentSampleInfoPanelProps) {
  const utils = trpc.useUtils();
  const queryEnabled = enabled && Boolean(sampleId);

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );
  const canEdit = canEditQuery.data?.canEdit === true;

  const sampleQuery = trpc.samples.getById.useQuery(
    { id: sampleId ?? "" },
    { enabled: queryEnabled },
  );

  const sampleAuxQuery = trpc.sampleAux.get.useQuery(
    { sampleId: sampleId ?? "" },
    { enabled: queryEnabled },
  );

  const vendorsQuery = trpc.vendors.list.useQuery(
    { limit: 100 },
    { enabled: queryEnabled && canEdit },
  );

  const updateSample = trpc.samples.update.useMutation({
    onSuccess: async () => {
      if (sampleId) {
        await utils.samples.getById.invalidate({ id: sampleId });
      }
      await utils.vendors.list.invalidate();
    },
  });

  const upsertSampleAux = trpc.sampleAux.upsert.useMutation({
    onSuccess: async () => {
      if (sampleId) {
        await utils.sampleAux.get.invalidate({ sampleId });
      }
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [coreDraft, setCoreDraft] = useState<SampleCoreDraft | null>(null);
  const [auxDraft, setAuxDraft] = useState<SampleAuxFields>({});
  const [saveBusy, setSaveBusy] = useState(false);

  const serverAux = useMemo(
    () => sampleAuxFromQuery(sampleAuxQuery.data ?? null),
    [sampleAuxQuery.data],
  );

  const coreRows = useMemo(() => {
    const sample = sampleQuery.data;
    if (!sample) {
      return [];
    }
    return coreSampleMetadataRows({
      processmethod: sample.processmethod,
      substrate: sample.substrate,
      patterninglayer: sample.patterninglayer,
      solvent: sample.solvent,
      thickness: sample.thickness,
      molecularweight: sample.molecularweight,
      vendorName: sample.vendors?.name ?? null,
      vendorUrl: sample.vendors?.url ?? null,
    });
  }, [sampleQuery.data]);

  const coreSections = useMemo(
    () => coreSampleMetadataSections(coreRows),
    [coreRows],
  );

  const extendedSections = useMemo(
    () =>
      extendedSampleAuxMetadataSections(serverAux, {
        processMethod: sampleQuery.data?.processmethod ?? null,
      }),
    [sampleQuery.data?.processmethod, serverAux],
  );

  const extendedRowCount = useMemo(
    () => extendedSections.reduce((count, section) => count + section.rows.length, 0),
    [extendedSections],
  );

  const hasRows = sampleMetadataHasDisplayableRows({
    coreRows,
    extendedRows: extendedSections.flatMap((section) => section.rows),
  });

  const beginEditing = useCallback(() => {
    const sample = sampleQuery.data;
    if (!sample) {
      return;
    }
    setCoreDraft(sampleCoreDraftFromPersistedRow(sample));
    setAuxDraft(
      linkedSampleAuxForProcessMethod(serverAux, sample.processmethod),
    );
    setIsEditing(true);
  }, [sampleQuery.data, serverAux]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setCoreDraft(null);
    setAuxDraft({});
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsEditing(false);
      setCoreDraft(null);
      setAuxDraft({});
    }
  }, [enabled, sampleId]);

  const vendorOptions = useMemo(
    () =>
      vendorsQuery.data?.vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
      })) ?? [],
    [vendorsQuery.data?.vendors],
  );

  const handleSave = useCallback(async () => {
    if (!sampleId || !coreDraft) {
      return;
    }
    setSaveBusy(true);
    try {
      const vendorUpdate = resolveSampleVendorUpdatePayload(
        coreDraft,
        vendorOptions,
      );

      await updateSample.mutateAsync({
        id: sampleId,
        processMethod: coreDraft.processMethod,
        substrate: coreDraft.substrate.trim() || null,
        patterningLayer: coreDraft.patterningLayer.trim() || null,
        solvent: coreDraft.solvent.trim() || null,
        thickness: coreDraft.thickness,
        molecularWeight: coreDraft.molecularWeight,
        ...vendorUpdate,
      });

      if (sampleAuxFieldsHasData(auxDraft)) {
        await upsertSampleAux.mutateAsync({
          sampleId,
          data: linkedSampleAuxForProcessMethod(auxDraft, coreDraft.processMethod),
        });
      }

      showToast("Sample information saved", "success");
      setIsEditing(false);
      setCoreDraft(null);
      setAuxDraft({});
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not save sample information",
        "error",
      );
    } finally {
      setSaveBusy(false);
    }
  }, [auxDraft, coreDraft, sampleId, updateSample, upsertSampleAux, vendorOptions]);

  if (!enabled) {
    return null;
  }

  if (!sampleId) {
    return (
      <div className="border-border bg-surface text-text-secondary flex min-h-[220px] w-full items-center justify-center rounded-xl border border-dashed p-6 text-sm">
        No sample is linked to this experiment.
      </div>
    );
  }

  if (sampleQuery.isLoading || sampleAuxQuery.isLoading) {
    return <NexafsExperimentSampleInfoSkeleton />;
  }

  if (sampleQuery.isError) {
    return (
      <div className="text-danger border-border flex min-h-[220px] w-full items-center justify-center rounded-xl border border-dashed border-red-500/40 p-6 text-sm">
        Could not load sample information for this experiment.
      </div>
    );
  }

  return (
    <div
      className="flex w-full flex-col gap-5 py-1"
      data-testid="nexafs-experiment-sample-info-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SampleMetadataPanelHeading
          title="Sample information"
          description={
            isEditing
              ? "Update sample preparation metadata and extended details for this dataset."
              : "Sample preparation metadata contributed with this dataset, including optional extended details."
          }
        />
        {canEdit && !isEditing ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="border-border/60 shrink-0 rounded-full px-4"
            onPress={beginEditing}
          >
            <PencilIcon className="h-4 w-4" aria-hidden />
            {hasRows ? "Edit" : "Add details"}
          </Button>
        ) : null}
      </div>

      {isEditing && coreDraft ? (
        <div className="flex flex-col gap-5">
          <SampleInformationEditStack
            showSectionHeading={false}
            showVendorCreateFields
            linkedSampleAux={{
              value: auxDraft,
              onChange: setAuxDraft,
              onProcessMethodChange: (value) => {
                setCoreDraft((previous) =>
                  previous
                    ? applyProcessMethodToSampleFields(previous, value)
                    : previous,
                );
              },
            }}
            processMethod={coreDraft.processMethod}
            setProcessMethod={(value) => {
              setCoreDraft((previous) =>
                previous
                  ? applyProcessMethodToSampleFields(previous, value)
                  : previous,
              );
              setAuxDraft((previous) =>
                linkedSampleAuxForProcessMethod(previous, value),
              );
            }}
            substrate={coreDraft.substrate}
            setSubstrate={(value) =>
              setCoreDraft((previous) =>
                previous ? { ...previous, substrate: value } : previous,
              )
            }
            patterningLayer={coreDraft.patterningLayer}
            setPatterningLayer={(value) =>
              setCoreDraft((previous) =>
                previous ? { ...previous, patterningLayer: value } : previous,
              )
            }
            solvent={coreDraft.solvent}
            setSolvent={(value) =>
              setCoreDraft((previous) =>
                previous ? { ...previous, solvent: value } : previous,
              )
            }
            thickness={coreDraft.thickness}
            setThickness={(value) =>
              setCoreDraft((previous) =>
                previous ? { ...previous, thickness: value } : previous,
              )
            }
            molecularWeight={coreDraft.molecularWeight}
            setMolecularWeight={(value) =>
              setCoreDraft((previous) =>
                previous ? { ...previous, molecularWeight: value } : previous,
              )
            }
            selectedVendorId={coreDraft.selectedVendorId}
            setSelectedVendorId={(value) =>
              setCoreDraft((previous) =>
                previous ? { ...previous, selectedVendorId: value } : previous,
              )
            }
            newVendorName={coreDraft.newVendorName}
            setNewVendorName={(value) =>
              setCoreDraft((previous) =>
                previous ? { ...previous, newVendorName: value } : previous,
              )
            }
            newVendorUrl={coreDraft.newVendorUrl}
            setNewVendorUrl={(value) =>
              setCoreDraft((previous) =>
                previous ? { ...previous, newVendorUrl: value } : previous,
              )
            }
            vendors={vendorOptions}
            isLoadingVendors={vendorsQuery.isLoading}
          />

          <div className="border-border/40 flex flex-wrap justify-end gap-2 border-t pt-4">
            <DefaultButton
              type="button"
              variant="outline"
              isDisabled={saveBusy}
              onPress={cancelEditing}
            >
              Cancel
            </DefaultButton>
            <DefaultButton
              type="button"
              variant="primary"
              isDisabled={saveBusy}
              onPress={() => {
                void handleSave();
              }}
            >
              {saveBusy ? "Saving..." : "Save sample information"}
            </DefaultButton>
          </div>
        </div>
      ) : !hasRows ? (
        <div className="flex flex-col items-center gap-3">
          <SampleMetadataEmptyState />
          {canEdit ? (
            <Button type="button" variant="secondary" size="sm" className="rounded-full px-4" onPress={beginEditing}>
              Add sample details
            </Button>
          ) : null}
        </div>
      ) : (
        <SampleMetadataReadView
          coreSections={coreSections}
          extendedSections={extendedSections}
          extendedRowCount={extendedRowCount}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
