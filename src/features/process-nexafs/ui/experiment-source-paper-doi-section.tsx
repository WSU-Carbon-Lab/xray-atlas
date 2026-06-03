"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import {
  formatPublicationAuthorsPreview,
  type PublicationCitation,
} from "~/lib/publication-citation";
import { nexafsPublicationDoiHref } from "~/components/nexafs/nexafs-publication-verification-control";
import {
  SourcePaperDoiField,
  type SourcePaperDoiFieldValue,
} from "./source-paper-doi-field";

function ReadOnlySourcePaperCitation({
  citation,
}: {
  citation: PublicationCitation;
}) {
  const authors = formatPublicationAuthorsPreview(citation);
  return (
    <div className="border-border bg-surface-2/60 rounded-lg border p-3">
      <p className="text-foreground text-sm font-medium leading-snug">
        {citation.title}
      </p>
      {authors ? (
        <p className="text-muted mt-1 text-xs leading-snug">{authors}</p>
      ) : null}
      <a
        href={nexafsPublicationDoiHref(citation.doi)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent mt-2 inline-block text-xs font-medium hover:underline"
      >
        {citation.doi}
      </a>
    </div>
  );
}

type ExperimentSourcePaperDoiSectionProps = {
  experimentId: string;
  enabled: boolean;
  variant?: "panel" | "inline";
};

function valuesEqual(
  a: SourcePaperDoiFieldValue,
  b: SourcePaperDoiFieldValue,
): boolean {
  return (
    a.doi === b.doi &&
    (a.citation?.doi ?? "") === (b.citation?.doi ?? "") &&
    (a.citation?.title ?? "") === (b.citation?.title ?? "")
  );
}

function valueFromServer(data: {
  doi: string | null;
  citation: SourcePaperDoiFieldValue["citation"];
}): SourcePaperDoiFieldValue {
  const doi = data.doi?.trim() ?? "";
  if (!doi) {
    return { doi: "", citation: null };
  }
  return {
    doi,
    citation: data.citation,
  };
}

/**
 * Loads and persists source publication DOI for an existing experiment (post-upload edit).
 */
export function ExperimentSourcePaperDoiSection({
  experimentId,
  enabled,
  variant = "panel",
}: ExperimentSourcePaperDoiSectionProps) {
  const isInline = variant === "inline";
  const utils = trpc.useUtils();

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled },
  );
  const canEdit = canEditQuery.data?.canEdit === true;

  const sourceQuery = trpc.experiments.getSourcePaperDoi.useQuery(
    { experimentId },
    { enabled },
  );

  const setDoiMutation = trpc.experiments.setSourcePaperDoi.useMutation({
    onSuccess: async () => {
      await utils.experiments.getSourcePaperDoi.invalidate({ experimentId });
      await utils.experiments.browseList.invalidate();
      await utils.experiments.browseSearch.invalidate();
      showToast("Source publication updated", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const clearDoiMutation = trpc.experiments.clearSourcePaperDoi.useMutation({
    onSuccess: async () => {
      await utils.experiments.getSourcePaperDoi.invalidate({ experimentId });
      await utils.experiments.browseList.invalidate();
      await utils.experiments.browseSearch.invalidate();
      showToast("Source publication removed", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const serverValue = useMemo(
    () =>
      sourceQuery.data
        ? valueFromServer(sourceQuery.data)
        : { doi: "", citation: null },
    [sourceQuery.data],
  );

  const [draft, setDraft] = useState<SourcePaperDoiFieldValue>({
    doi: "",
    citation: null,
  });
  const [hydrated, setHydrated] = useState(false);
  const hydrationKeyRef = useRef<string | null>(null);
  const hydrationKey = `${experimentId}:${sourceQuery.dataUpdatedAt}`;

  useEffect(() => {
    if (!enabled) {
      hydrationKeyRef.current = null;
      setHydrated(false);
      setDraft({ doi: "", citation: null });
      return;
    }
    if (!canEdit || !sourceQuery.isSuccess) {
      return;
    }
    if (hydrationKeyRef.current === hydrationKey) {
      return;
    }
    hydrationKeyRef.current = hydrationKey;
    setDraft(serverValue);
    setHydrated(true);
  }, [canEdit, enabled, hydrationKey, serverValue, sourceQuery.isSuccess]);

  const isDirty = useMemo(() => {
    if (!hydrated) {
      return false;
    }
    return !valuesEqual(draft, serverValue);
  }, [draft, hydrated, serverValue]);

  const handleSave = useCallback(() => {
    if (!draft.doi.trim() && !serverValue.doi) {
      return;
    }
    if (!draft.doi.trim()) {
      clearDoiMutation.mutate({ experimentId });
      return;
    }
    if (!draft.citation) {
      showToast("Verify the publication DOI before saving", "error");
      return;
    }
    setDoiMutation.mutate({ experimentId, doi: draft.doi });
  }, [
    clearDoiMutation,
    draft.citation,
    draft.doi,
    experimentId,
    serverValue.doi,
    setDoiMutation,
  ]);

  const handleDiscard = useCallback(() => {
    setDraft(serverValue);
  }, [serverValue]);

  if (!enabled) {
    return null;
  }

  if (canEditQuery.isLoading || sourceQuery.isLoading) {
    return (
      <div
        className={
          isInline
            ? "bg-surface-2/40 h-16 w-full max-w-md animate-pulse rounded-lg"
            : "border-border bg-surface-2/40 h-24 animate-pulse rounded-lg border"
        }
        aria-hidden
      />
    );
  }

  if (!canEdit) {
    if (!serverValue.citation && !serverValue.doi) {
      return null;
    }
    return (
      <div
        className={
          isInline ? "min-w-0 max-w-md" : "border-border bg-surface rounded-lg border p-3"
        }
      >
        <p className="text-foreground mb-2 text-sm font-semibold">
          Source publication
        </p>
        {serverValue.citation ? (
          <ReadOnlySourcePaperCitation citation={serverValue.citation} />
        ) : (
          <p className="text-muted text-xs">{serverValue.doi}</p>
        )}
      </div>
    );
  }

  if (sourceQuery.isError) {
    return (
      <p className="text-danger text-xs sm:text-sm">
        Could not load source publication for this dataset.
      </p>
    );
  }

  const field = (
    <SourcePaperDoiField
      value={draft}
      onChange={setDraft}
      disabled={setDoiMutation.isPending || clearDoiMutation.isPending}
      showLabel={!isInline}
    />
  );

  const saveActions = isDirty ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="tertiary"
        isDisabled={setDoiMutation.isPending || clearDoiMutation.isPending}
        onPress={handleDiscard}
      >
        Discard
      </Button>
      <Button
        type="button"
        size="sm"
        variant="primary"
        isDisabled={setDoiMutation.isPending || clearDoiMutation.isPending}
        onPress={handleSave}
      >
        Save
      </Button>
    </div>
  ) : null;

  if (isInline) {
    return (
      <div className="flex min-w-0 max-w-md flex-col gap-2">
        {field}
        {saveActions}
      </div>
    );
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3">
      {field}
      {saveActions}
    </div>
  );
}
