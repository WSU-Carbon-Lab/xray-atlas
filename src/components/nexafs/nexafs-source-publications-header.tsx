"use client";

import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { Plus, X } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  nexafsPublicationDoiHref,
  nexafsVerificationBadgeRingClassName,
} from "~/components/nexafs/nexafs-publication-verification-control";
import type { NexafsBrowseSourcePublication } from "~/types/nexafs-browse";
import { ATTRIBUTION_NESTED_OVERLAY_SELECTOR } from "~/lib/nexafs-attribution";
import {
  SourcePaperDoiField,
  type SourcePaperDoiFieldValue,
} from "~/features/process-nexafs/ui/source-paper-doi-field";

type NexafsSourcePublicationsHeaderProps = {
  experimentId: string;
  sourcePublications: NexafsBrowseSourcePublication[];
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

type NexafsSourcePublicationAddMenuProps = {
  experimentId: string;
  sourcePublications: NexafsBrowseSourcePublication[];
  canEdit: boolean;
};

/**
 * Renders a compact add affordance beside the verification badge stack; opens a portaled editor for source publication DOIs.
 */
export function NexafsSourcePublicationAddMenu({
  experimentId,
  sourcePublications,
  canEdit,
}: NexafsSourcePublicationAddMenuProps) {
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

  if (!canEdit) {
    return null;
  }

  const addAriaLabel =
    sourcePublications.length > 0
      ? "Add another source publication"
      : "Add source publication";

  return (
    <PopoverMenu
      placement="bottom-start"
      rootClassName="inline-flex shrink-0"
      ignoreOutsidePointerDownSelector={ATTRIBUTION_NESTED_OVERLAY_SELECTOR}
      renderTrigger={({ triggerProps, isOpen }) => {
        const { onClick, onPointerDown, ...restTriggerProps } = triggerProps;
        return (
          <button
            {...restTriggerProps}
            type="button"
            aria-label={addAriaLabel}
            onPointerDown={(event) => {
              event.stopPropagation();
              onPointerDown?.(event);
            }}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onClick?.(event);
            }}
            className={cn(
              nexafsVerificationBadgeRingClassName,
              "text-muted hover:text-foreground focus-visible:ring-accent cursor-pointer items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1",
              isOpen && "bg-surface-2 text-foreground",
            )}
          >
            <Plus className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
          </button>
        );
      }}
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
          <div data-attribution-nested-overlay="true">
            <SourcePaperDoiField
              value={draft}
              onChange={setDraft}
              disabled={addMutation.isPending}
              showLabel={false}
            />
          </div>
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
  );
}

/**
 * Loads edit permission and renders {@link NexafsSourcePublicationAddMenu} beside verification badges.
 */
export function NexafsSourcePublicationAddMenuControl({
  experimentId,
  sourcePublications,
}: Omit<NexafsSourcePublicationAddMenuProps, "canEdit">) {
  const canEditQuery = trpc.experiments.canEditExperiment.useQuery({
    experimentId,
  });

  return (
    <NexafsSourcePublicationAddMenu
      experimentId={experimentId}
      sourcePublications={sourcePublications}
      canEdit={canEditQuery.data?.canEdit === true}
    />
  );
}

/**
 * Renders linked source publication DOI chips for browse cards.
 */
export function NexafsSourcePublicationsHeader({
  experimentId,
  sourcePublications,
  canEdit,
}: NexafsSourcePublicationsHeaderProps) {
  const utils = trpc.useUtils();

  const invalidateBrowse = useCallback(async () => {
    await Promise.all([
      utils.experiments.getSourcePaperDoi.invalidate({ experimentId }),
      utils.experiments.listSourcePublications.invalidate({ experimentId }),
      utils.experiments.browseList.invalidate(),
      utils.experiments.browseSearch.invalidate(),
    ]);
  }, [experimentId, utils.experiments]);

  const removeMutation = trpc.experiments.removeSourcePublication.useMutation({
    onSuccess: async () => {
      await invalidateBrowse();
      showToast("Source publication removed", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (sourcePublications.length === 0) {
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
    </div>
  );
}

/**
 * Loads edit permission and renders {@link NexafsSourcePublicationsHeader} for browse cards.
 */
export function NexafsSourcePublicationsHeaderControl({
  experimentId,
  sourcePublications,
}: Omit<NexafsSourcePublicationsHeaderProps, "canEdit">) {
  const canEditQuery = trpc.experiments.canEditExperiment.useQuery({
    experimentId,
  });

  return (
    <NexafsSourcePublicationsHeader
      experimentId={experimentId}
      sourcePublications={sourcePublications}
      canEdit={canEditQuery.data?.canEdit === true}
    />
  );
}
