"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { Button } from "@heroui/react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { AttributionAvatarRowSkeleton } from "~/components/ui/avatar";
import {
  datasetAttributionsEqual,
  datasetAttributionsFromContributorDtos,
  datasetAttributionsToSetAttributionInput,
  dedupeDatasetAttributions,
  filterValidOrcidAttributions,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import {
  DatasetAttributionEditor,
  type DatasetAttributionChange,
} from "./dataset-attribution-editor";

type ExperimentAttributionEditSectionProps = {
  experimentId: string;
  enabled: boolean;
  /** `inline` fits the browse compact card header; `panel` is the bordered expanded block. */
  variant?: "panel" | "inline";
  /** Shown when the viewer cannot edit or while edit permission is still loading. */
  readOnlyFallback?: ReactNode;
  /** Reserved avatar slots while attributions load for an authorized editor. */
  skeletonAvatarCount?: number;
};

/**
 * Loads and persists experiment researcher attributions. The trailing circular
 * `+` control (add person / apply team) renders only when the session is signed
 * in and may edit the experiment.
 */
export function ExperimentAttributionEditSection({
  experimentId,
  enabled,
  variant = "panel",
  readOnlyFallback = null,
  skeletonAvatarCount = 3,
}: ExperimentAttributionEditSectionProps) {
  const isInline = variant === "inline";
  const { data: session, status: sessionStatus } = useSession();
  const isSignedIn = Boolean(session?.user?.id);
  const sessionReady = sessionStatus !== "loading";
  const editQueriesEnabled = enabled && sessionReady && isSignedIn;

  const utils = trpc.useUtils();
  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled: editQueriesEnabled },
  );
  const canEdit = canEditQuery.data?.canEdit === true;

  const attributionsQuery = trpc.experiments.listAttributions.useQuery(
    { experimentId },
    { enabled: editQueriesEnabled && canEdit },
  );

  const setAttributionsMutation = trpc.experiments.setAttributions.useMutation({
    onSuccess: async () => {
      await utils.experiments.listAttributions.invalidate({ experimentId });
      await utils.experiments.browseList.invalidate();
      await utils.experiments.browseSearch.invalidate();
      showToast("Researchers updated", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const serverAttributions = useMemo(() => {
    if (!attributionsQuery.data) {
      return [];
    }
    return dedupeDatasetAttributions(
      datasetAttributionsFromContributorDtos(attributionsQuery.data),
    );
  }, [attributionsQuery.data]);

  const [draftAttributions, setDraftAttributions] = useState<
    DatasetAttributionEntry[]
  >([]);
  const [hydratedFromServer, setHydratedFromServer] = useState(false);
  const lastHydrationKeyRef = useRef<string | null>(null);

  const hydrationKey = `${experimentId}:${attributionsQuery.dataUpdatedAt}`;

  useEffect(() => {
    if (!editQueriesEnabled || !canEdit) {
      lastHydrationKeyRef.current = null;
      setHydratedFromServer(false);
      setDraftAttributions([]);
      return;
    }
    if (!attributionsQuery.isSuccess) {
      return;
    }
    if (lastHydrationKeyRef.current === hydrationKey) {
      return;
    }
    lastHydrationKeyRef.current = hydrationKey;
    setDraftAttributions(serverAttributions);
    setHydratedFromServer(true);
  }, [
    attributionsQuery.isSuccess,
    canEdit,
    editQueriesEnabled,
    hydrationKey,
    serverAttributions,
  ]);

  const handleAttributionsChange = useCallback(
    (change: DatasetAttributionChange) => {
      setDraftAttributions((previous) =>
        typeof change === "function" ? change(previous) : change,
      );
    },
    [],
  );

  const isDirty = useMemo(() => {
    if (!hydratedFromServer) {
      return false;
    }
    return !datasetAttributionsEqual(draftAttributions, serverAttributions);
  }, [draftAttributions, hydratedFromServer, serverAttributions]);

  const handleSave = useCallback(() => {
    const rows = filterValidOrcidAttributions(draftAttributions);
    const uploaderCount = rows.filter(
      (row) => row.role === "DataCurator",
    ).length;
    if (uploaderCount !== 1) {
      showToast("Exactly one data curator (uploader) is required", "error");
      return;
    }
    setAttributionsMutation.mutate({
      experimentId,
      attributions: datasetAttributionsToSetAttributionInput(rows),
    });
  }, [draftAttributions, experimentId, setAttributionsMutation]);

  const handleDiscard = useCallback(() => {
    setDraftAttributions(serverAttributions);
  }, [serverAttributions]);

  if (!sessionReady) {
    return (
      <AttributionAvatarRowSkeleton
        avatarCount={3}
        max={3}
        size="sm"
        trailingSlotCount={enabled ? 1 : 0}
        reserveOverflowSlot
        className={isInline ? undefined : "py-1"}
      />
    );
  }

  if (!enabled || !isSignedIn) {
    return readOnlyFallback;
  }

  if (!canEditQuery.isSuccess) {
    return (
      <AttributionAvatarRowSkeleton
        avatarCount={3}
        max={3}
        size="sm"
        trailingSlotCount={1}
        reserveOverflowSlot
        className={isInline ? undefined : "py-1"}
      />
    );
  }

  if (!canEdit) {
    return readOnlyFallback;
  }

  if (attributionsQuery.isError) {
    return (
      <p className="text-danger text-xs sm:text-sm">
        Could not load researcher attributions for this dataset.
      </p>
    );
  }

  if (!attributionsQuery.isSuccess || !hydratedFromServer) {
    return (
      <AttributionAvatarRowSkeleton
        avatarCount={skeletonAvatarCount}
        max={3}
        size="sm"
        trailingSlotCount={1}
        reserveOverflowSlot
        className={isInline ? undefined : "py-1"}
      />
    );
  }

  const editor = (
    <DatasetAttributionEditor
      attributions={draftAttributions}
      onChange={handleAttributionsChange}
      showLabel={!isInline}
    />
  );

  const saveActions = isDirty ? (
    <div
      className={
        isInline
          ? "flex flex-wrap items-center justify-end gap-1.5"
          : "flex flex-wrap items-center justify-end gap-2"
      }
    >
      <Button
        type="button"
        size="sm"
        variant="tertiary"
        isDisabled={setAttributionsMutation.isPending}
        onPress={handleDiscard}
      >
        Discard
      </Button>
      <Button
        type="button"
        size="sm"
        variant="primary"
        isDisabled={setAttributionsMutation.isPending}
        onPress={handleSave}
      >
        Save
      </Button>
    </div>
  ) : null;

  if (isInline) {
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        {editor}
        {saveActions}
      </div>
    );
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3">
      {editor}
      {saveActions}
    </div>
  );
}
