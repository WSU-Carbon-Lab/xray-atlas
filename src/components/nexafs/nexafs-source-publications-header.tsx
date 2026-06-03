"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from "react";
import { Plus, X } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  nexafsPublicationDoiHref,
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

function SourcePublicationEditorTrigger({
  triggerProps,
  isOpen,
  ariaLabel,
}: {
  triggerProps: ComponentProps<"span"> & {
    ref?: Ref<HTMLSpanElement>;
    onClick?: (event: MouseEvent<HTMLSpanElement>) => void;
  };
  isOpen: boolean;
  ariaLabel: string;
}) {
  const { onClick, ref, type: _buttonType, ...restTriggerProps } =
    triggerProps as ComponentProps<"span"> & {
      ref?: Ref<HTMLSpanElement>;
      onClick?: (event: MouseEvent<HTMLSpanElement>) => void;
      type?: string;
    };

  const handleActivate = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    onClick?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onClick?.(event as unknown as MouseEvent<HTMLSpanElement>);
    }
  };

  return (
    <span
      {...restTriggerProps}
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className={cn(
        "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground focus-visible:ring-accent inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isOpen && "ring-accent ring-2 ring-offset-2",
      )}
    >
      <Plus className="size-3.5 shrink-0" aria-hidden />
    </span>
  );
}

/**
 * Renders source publication DOI chips and the editor affordance beside the verification badge stack.
 */
export function NexafsSourcePublicationsHeader({
  experimentId,
  sourcePublications,
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

  if (sourcePublications.length === 0 && !canEdit) {
    return null;
  }

  const addAriaLabel =
    sourcePublications.length > 0
      ? "Add another source publication"
      : "Add source publication";

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
      {canEdit ? (
        <PopoverMenu
          placement="bottom-start"
          ignoreOutsidePointerDownSelector={ATTRIBUTION_NESTED_OVERLAY_SELECTOR}
          renderTrigger={({ triggerProps, isOpen }) => (
            <SourcePublicationEditorTrigger
              triggerProps={
                triggerProps as ComponentProps<"span"> & {
                  ref?: Ref<HTMLSpanElement>;
                  onClick?: (event: MouseEvent<HTMLSpanElement>) => void;
                }
              }
              isOpen={isOpen}
              ariaLabel={addAriaLabel}
            />
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
