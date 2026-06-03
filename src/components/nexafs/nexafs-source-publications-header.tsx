"use client";

import { useCallback, useMemo, useState } from "react";
import { BookOpen, Plus, X } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  nexafsPublicationDoiHref,
} from "~/components/nexafs/nexafs-publication-verification-control";
import type { NexafsBrowseSourcePublication } from "~/types/nexafs-browse";
import {
  SourcePaperDoiField,
  type SourcePaperDoiFieldValue,
} from "~/features/process-nexafs/ui/source-paper-doi-field";

const NESTED_OVERLAY_SELECTOR =
  "[data-overlay=true], [data-slot='popover'], [role='listbox']";

type NexafsSourcePublicationsHeaderProps = {
  experimentId: string;
  sourcePublications: NexafsBrowseSourcePublication[];
  ingestVerified: boolean;
  canEdit: boolean;
};

function SourceDoiChip({
  publication,
  onRemove,
  removable,
}: {
  publication: NexafsBrowseSourcePublication;
  onRemove?: () => void;
  removable: boolean;
}) {
  const href = nexafsPublicationDoiHref(publication.doi);
  return (
    <Chip
      size="sm"
      variant="soft"
      className="border-border bg-surface max-w-[11rem] shrink-0 border"
    >
      <Chip.Label className="min-w-0 truncate text-[10px] font-medium sm:text-[11px]">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {publication.doi}
        </a>
      </Chip.Label>
      {removable && onRemove ? (
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={`Remove source publication ${publication.doi}`}
          className="text-muted hover:text-danger -mr-1 min-h-6 min-w-6"
          onPress={onRemove}
        >
          <X className="size-3" aria-hidden />
        </Button>
      ) : null}
    </Chip>
  );
}

/**
 * Renders source publication DOIs on the NEXAFS browse compact card header beside verification badges.
 */
export function NexafsSourcePublicationsHeader({
  experimentId,
  sourcePublications,
  ingestVerified,
  canEdit,
}: NexafsSourcePublicationsHeaderProps) {
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<SourcePaperDoiFieldValue>({
    doi: "",
    citation: null,
  });

  const invalidateBrowse = useCallback(async () => {
    await Promise.all([
      utils.experiments.getSourcePaperDoi.invalidate({ experimentId }),
      utils.experiments.listSourcePublications.invalidate({ experimentId }),
      utils.experiments.browseList.invalidate(),
      utils.experiments.browseSearch.invalidate(),
    ]);
  }, [experimentId, utils.experiments]);

  const addMutation = trpc.experiments.addSourcePublication.useMutation({
    onSuccess: async () => {
      await invalidateBrowse();
      setDraft({ doi: "", citation: null });
      showToast("Source publication added", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const removeMutation = trpc.experiments.removeSourcePublication.useMutation({
    onSuccess: async () => {
      await invalidateBrowse();
      showToast("Source publication removed", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const existingDois = useMemo(
    () => new Set(sourcePublications.map((publication) => publication.doi)),
    [sourcePublications],
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

  const showEmptyHint = sourcePublications.length === 0 && ingestVerified;
  const showReadOnlyEmpty = sourcePublications.length === 0 && !canEdit && !showEmptyHint;

  if (showReadOnlyEmpty) {
    return null;
  }

  return (
    <div
      className="inline-flex min-w-0 max-w-full shrink flex-wrap items-center gap-1"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {sourcePublications.map((publication) => (
        <SourceDoiChip
          key={publication.doi}
          publication={publication}
          removable={canEdit}
          onRemove={() => {
            removeMutation.mutate({
              experimentId,
              doi: publication.doi,
            });
          }}
        />
      ))}
      {showEmptyHint && !canEdit ? (
        <Chip size="sm" variant="soft" className="border-border bg-surface border">
          <BookOpen className="text-muted size-3 shrink-0" aria-hidden />
          <Chip.Label className="text-muted text-[10px] font-medium sm:text-[11px]">
            Source paper
          </Chip.Label>
        </Chip>
      ) : null}
      {canEdit ? (
        <PopoverMenu
          placement="bottom-start"
          ignoreOutsidePointerDownSelector={NESTED_OVERLAY_SELECTOR}
          renderTrigger={({ triggerProps, toggle, isOpen }) => (
            <button
              {...triggerProps}
              type="button"
              aria-label={
                sourcePublications.length > 0
                  ? "Add another source publication"
                  : "Add source publication"
              }
              aria-expanded={isOpen}
              className={cn(
                "border-border bg-surface text-muted hover:text-accent inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-colors sm:text-[11px]",
                showEmptyHint && sourcePublications.length === 0
                  ? "border-accent/35 text-accent"
                  : "",
              )}
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
            >
              <Plus className="size-3.5 shrink-0" aria-hidden />
              {sourcePublications.length === 0 ? <span>Source paper</span> : null}
            </button>
          )}
          renderContent={({ close, contentProps, contentStyle, contentPositionClassName }) => (
            <PopoverMenuContent
              {...contentProps}
              style={contentStyle}
              className={cn(
                contentPositionClassName,
                "border-border bg-surface z-tooltip w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border p-3 shadow-xl",
              )}
            >
              <p className="text-foreground mb-2 text-sm font-semibold">
                Add source publication
              </p>
              <p className="text-muted mb-3 text-xs leading-snug">
                Link peer-reviewed papers that report the original measurement for this dataset.
              </p>
              <SourcePaperDoiField
                value={draft}
                onChange={setDraft}
                disabled={addMutation.isPending}
                showLabel={false}
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" size="sm" variant="tertiary" onPress={close}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  isDisabled={addMutation.isPending}
                  onPress={() => {
                    handleAdd();
                    close();
                  }}
                >
                  Add
                </Button>
              </div>
            </PopoverMenuContent>
          )}
        />
      ) : null}
    </div>
  );
}

/**
 * Loads edit permission and renders {@link NexafsSourcePublicationsHeader} for browse cards.
 */
export function NexafsSourcePublicationsHeaderControl({
  experimentId,
  sourcePublications,
  ingestVerified,
}: Omit<NexafsSourcePublicationsHeaderProps, "canEdit">) {
  const canEditQuery = trpc.experiments.canEditExperiment.useQuery({
    experimentId,
  });

  return (
    <NexafsSourcePublicationsHeader
      experimentId={experimentId}
      sourcePublications={sourcePublications}
      ingestVerified={ingestVerified}
      canEdit={canEditQuery.data?.canEdit === true}
    />
  );
}
