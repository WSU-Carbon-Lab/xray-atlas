"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import {
  SampleMetadataPanelHeading,
  SampleMetadataSectionBlock,
} from "~/components/nexafs/sample-metadata-display-chrome";
import { DefaultButton } from "~/components/ui/button";
import { showToast } from "~/components/ui/toast";
import { formatExperimentType } from "~/components/browse/nexafs-browse-experiment-utils";
import { EXPERIMENT_TYPE_OPTIONS } from "~/features/process-nexafs/constants";
import type { ExperimentTypeOption } from "~/features/process-nexafs/types";
import { useNexafsOptions } from "~/features/process-nexafs/hooks/useNexafsOptions";
import {
  EdgeSelectModal,
  ExperimentSelectModal,
  InstrumentSelectModal,
} from "~/features/process-nexafs/ui/descriptor-select-modals";
import type { ExperimentType } from "~/prisma/browser";
import { trpc } from "~/trpc/client";
import type { SampleMetadataDisplaySection } from "~/lib/sample-metadata-display";

export type NexafsExperimentDescriptorsPanelProps = {
  experimentId: string;
  enabled: boolean;
};

type DescriptorDraft = {
  edgeId: string;
  instrumentId: string;
  experimentType: ExperimentTypeOption | null;
};

type OpenModal = "edge" | "instrument" | "experiment" | null;

function isExperimentTypeOption(
  value: string | null | undefined,
): value is ExperimentTypeOption {
  return (
    value != null &&
    EXPERIMENT_TYPE_OPTIONS.some((option) => option.value === value)
  );
}

function NexafsExperimentDescriptorsSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-4 py-1"
      aria-busy
      aria-label="Loading experiment information"
    >
      <LoadingSkeleton className="h-6 w-48 rounded-md" />
      <LoadingSkeleton className="h-[120px] w-full rounded-2xl" />
    </div>
  );
}

/**
 * Shows edge, instrument, and measurement mode for one experiment; authorized
 * contributors may correct broken ingest descriptors in place on the browse sample tab.
 */
export function NexafsExperimentDescriptorsPanel({
  experimentId,
  enabled,
}: NexafsExperimentDescriptorsPanelProps) {
  const utils = trpc.useUtils();
  const { instrumentOptions, edgeOptions } = useNexafsOptions();

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );
  const canEdit = canEditQuery.data?.canEdit === true;

  const descriptorsQuery = trpc.experiments.getDescriptors.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );

  const updateDescriptors = trpc.experiments.updateDescriptors.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.experiments.getDescriptors.invalidate({ experimentId }),
        utils.experiments.getById.invalidate({ id: experimentId }),
        utils.experiments.browseList.invalidate(),
        utils.experiments.browseSearch.invalidate(),
      ]);
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DescriptorDraft | null>(null);
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(null);
      setOpenModal(null);
    }
  }, [isEditing]);

  const persisted = descriptorsQuery.data;

  const beginEditing = useCallback(() => {
    if (!persisted) {
      return;
    }
    setDraft({
      edgeId: persisted.edgeId,
      instrumentId: persisted.instrumentId,
      experimentType: isExperimentTypeOption(persisted.experimentType)
        ? persisted.experimentType
        : null,
    });
    setIsEditing(true);
  }, [persisted]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const edgeLabel = useMemo(() => {
    if (!persisted) {
      return null;
    }
    if (isEditing && draft) {
      const edge = edgeOptions.find((item) => item.id === draft.edgeId);
      if (edge) {
        return `${edge.targetatom} ${edge.corestate}`;
      }
    }
    return `${persisted.edge.targetatom} ${persisted.edge.corestate}`;
  }, [draft, edgeOptions, isEditing, persisted]);

  const instrumentLabel = useMemo(() => {
    if (!persisted) {
      return null;
    }
    if (isEditing && draft) {
      const instrument = instrumentOptions.find(
        (item) => item.id === draft.instrumentId,
      );
      if (instrument) {
        return instrument.facilityName
          ? `${instrument.name} (${instrument.facilityName})`
          : instrument.name;
      }
    }
    return persisted.instrument.facilityName
      ? `${persisted.instrument.name} (${persisted.instrument.facilityName})`
      : persisted.instrument.name;
  }, [draft, instrumentOptions, isEditing, persisted]);

  const measurementModeLabel = useMemo(() => {
    if (isEditing && draft) {
      if (draft.experimentType == null) {
        return "Not set";
      }
      return (
        EXPERIMENT_TYPE_OPTIONS.find(
          (option) => option.value === draft.experimentType,
        )?.label ?? draft.experimentType
      );
    }
    if (!persisted) {
      return null;
    }
    return (
      formatExperimentType(persisted.experimentType) ??
      persisted.experimentKind?.label ??
      "Not set"
    );
  }, [draft, isEditing, persisted]);

  const readSection: SampleMetadataDisplaySection = useMemo(
    () => ({
      title: "Descriptors",
      rows: [
        { label: "Edge", value: edgeLabel ?? "—" },
        { label: "Instrument", value: instrumentLabel ?? "—" },
        { label: "Measurement mode", value: measurementModeLabel ?? "—" },
      ],
    }),
    [edgeLabel, instrumentLabel, measurementModeLabel],
  );

  const dirty = useMemo(() => {
    if (!persisted || !draft) {
      return false;
    }
    const persistedType = isExperimentTypeOption(persisted.experimentType)
      ? persisted.experimentType
      : null;
    return (
      draft.edgeId !== persisted.edgeId ||
      draft.instrumentId !== persisted.instrumentId ||
      draft.experimentType !== persistedType
    );
  }, [draft, persisted]);

  const saveBusy = updateDescriptors.isPending;

  const handleSave = useCallback(async () => {
    if (!persisted || !draft || !dirty) {
      setIsEditing(false);
      return;
    }
    if (draft.experimentType == null) {
      showToast("Select a measurement mode (TEY / PEY / FY / TRANS).", "error");
      return;
    }
    try {
      await updateDescriptors.mutateAsync({
        experimentId,
        edgeId: draft.edgeId,
        instrumentId: draft.instrumentId,
        experimentType: draft.experimentType as ExperimentType,
      });
      showToast("Experiment information saved.", "success");
      setIsEditing(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save descriptors.";
      showToast(message, "error");
    }
  }, [dirty, draft, experimentId, persisted, updateDescriptors]);

  if (descriptorsQuery.isLoading || canEditQuery.isLoading) {
    return <NexafsExperimentDescriptorsSkeleton />;
  }

  if (descriptorsQuery.isError || !persisted) {
    return (
      <div
        className="border-border bg-surface flex w-full flex-col gap-3 rounded-xl border p-4"
        data-testid="nexafs-experiment-descriptors-panel-error"
      >
        <SampleMetadataPanelHeading
          title="Experiment information"
          description="Could not load edge, instrument, or measurement mode for this dataset."
        />
      </div>
    );
  }

  return (
    <div
      className="border-border bg-surface flex w-full flex-col gap-4 rounded-xl border p-4"
      data-testid="nexafs-experiment-descriptors-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SampleMetadataPanelHeading
          title="Experiment information"
          description={
            isEditing
              ? "Correct edge, instrument, or measurement mode when ingest metadata was wrong."
              : "Edge, instrument, and detection mode recorded for this dataset."
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
            Edit
          </Button>
        ) : null}
      </div>

      {isEditing && draft ? (
        <div className="flex flex-col gap-4">
          <div className="border-border divide-border flex flex-col divide-y rounded-xl border">
            <DescriptorEditRow
              label="Edge"
              value={edgeLabel ?? "—"}
              onChangePress={() => setOpenModal("edge")}
            />
            <DescriptorEditRow
              label="Instrument"
              value={instrumentLabel ?? "—"}
              onChangePress={() => setOpenModal("instrument")}
            />
            <DescriptorEditRow
              label="Measurement mode"
              value={measurementModeLabel ?? "—"}
              onChangePress={() => setOpenModal("experiment")}
            />
          </div>
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
              isDisabled={saveBusy || !dirty}
              onPress={() => {
                void handleSave();
              }}
            >
              {saveBusy ? "Saving…" : "Save"}
            </DefaultButton>
          </div>
          <EdgeSelectModal
            isOpen={openModal === "edge"}
            onClose={() => setOpenModal(null)}
            edges={edgeOptions}
            onSelect={(edgeId) =>
              setDraft((previous) =>
                previous ? { ...previous, edgeId } : previous,
              )
            }
          />
          <InstrumentSelectModal
            isOpen={openModal === "instrument"}
            onClose={() => setOpenModal(null)}
            instruments={instrumentOptions}
            onSelect={(instrumentId) =>
              setDraft((previous) =>
                previous ? { ...previous, instrumentId } : previous,
              )
            }
          />
          <ExperimentSelectModal
            isOpen={openModal === "experiment"}
            onClose={() => setOpenModal(null)}
            currentType={draft.experimentType}
            onSelect={(experimentType) =>
              setDraft((previous) =>
                previous ? { ...previous, experimentType } : previous,
              )
            }
          />
        </div>
      ) : (
        <SampleMetadataSectionBlock section={readSection} hideCaption />
      )}
    </div>
  );
}

function DescriptorEditRow({
  label,
  value,
  onChangePress,
}: {
  label: string;
  value: string;
  onChangePress: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="text-foreground mt-1 truncate text-sm font-medium">
          {value}
        </p>
      </div>
      <DefaultButton
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onPress={onChangePress}
      >
        Change
      </DefaultButton>
    </div>
  );
}
