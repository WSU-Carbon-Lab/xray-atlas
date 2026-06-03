"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { X } from "lucide-react";
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

/**
 * Loads and persists source publication DOIs for an existing experiment (post-upload edit).
 */
export function ExperimentSourcePaperDoiSection({
  experimentId,
  enabled,
  variant = "panel",
}: ExperimentSourcePaperDoiSectionProps) {
  const isInline = variant === "inline";
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<SourcePaperDoiFieldValue>({
    doi: "",
    citation: null,
  });

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled },
  );
  const canEdit = canEditQuery.data?.canEdit === true;

  const sourceQuery = trpc.experiments.getSourcePaperDoi.useQuery(
    { experimentId },
    { enabled },
  );

  const addMutation = trpc.experiments.addSourcePublication.useMutation({
    onSuccess: async () => {
      await utils.experiments.getSourcePaperDoi.invalidate({ experimentId });
      await utils.experiments.browseList.invalidate();
      await utils.experiments.browseSearch.invalidate();
      setDraft({ doi: "", citation: null });
      showToast("Source publication added", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const removeMutation = trpc.experiments.removeSourcePublication.useMutation({
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

  const publications = useMemo(
    () => sourceQuery.data?.publications ?? [],
    [sourceQuery.data?.publications],
  );

  const existingDois = useMemo(
    () => new Set(publications.map((publication) => publication.doi)),
    [publications],
  );

  const handleAdd = useCallback(() => {
    if (!draft.citation) {
      showToast("Verify the publication DOI before adding", "error");
      return;
    }
    if (existingDois.has(draft.citation.doi)) {
      showToast("That source publication is already linked", "error");
      return;
    }
    addMutation.mutate({ experimentId, doi: draft.citation.doi });
  }, [addMutation, draft.citation, existingDois, experimentId]);

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
    if (publications.length === 0) {
      return null;
    }
    return (
      <div
        className={
          isInline ? "min-w-0 max-w-md" : "border-border bg-surface rounded-lg border p-3"
        }
      >
        <p className="text-foreground mb-2 text-sm font-semibold">
          Source publications
        </p>
        <div className="flex flex-col gap-2">
          {publications.map((publication) => (
            <ReadOnlySourcePaperCitation
              key={publication.doi}
              citation={publication}
            />
          ))}
        </div>
      </div>
    );
  }

  if (sourceQuery.isError) {
    return (
      <p className="text-danger text-xs sm:text-sm">
        Could not load source publications for this dataset.
      </p>
    );
  }

  const list = (
    <div className="flex flex-col gap-2">
      {publications.map((publication) => (
        <div
          key={publication.doi}
          className="border-border bg-surface-2/60 flex items-start justify-between gap-2 rounded-lg border p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium leading-snug">
              {publication.title}
            </p>
            <a
              href={nexafsPublicationDoiHref(publication.doi)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent mt-2 inline-block text-xs font-medium hover:underline"
            >
              {publication.doi}
            </a>
          </div>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`Remove source publication ${publication.doi}`}
            isDisabled={removeMutation.isPending}
            className="text-muted hover:text-danger shrink-0"
            onPress={() => {
              removeMutation.mutate({ experimentId, doi: publication.doi });
            }}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  );

  const addField = (
    <div className="flex flex-col gap-3">
      <SourcePaperDoiField
        value={draft}
        onChange={setDraft}
        disabled={addMutation.isPending || removeMutation.isPending}
        showLabel={!isInline}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="primary"
          isDisabled={
            addMutation.isPending || removeMutation.isPending || !draft.citation
          }
          onPress={handleAdd}
        >
          Add source publication
        </Button>
      </div>
    </div>
  );

  if (isInline) {
    return (
      <div className="flex min-w-0 max-w-md flex-col gap-3">
        {publications.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {publications.map((publication) => (
              <Chip key={publication.doi} size="sm" variant="soft">
                <Chip.Label className="truncate text-xs">{publication.doi}</Chip.Label>
              </Chip>
            ))}
          </div>
        ) : null}
        {addField}
      </div>
    );
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3">
      {publications.length > 0 ? list : null}
      {addField}
    </div>
  );
}
