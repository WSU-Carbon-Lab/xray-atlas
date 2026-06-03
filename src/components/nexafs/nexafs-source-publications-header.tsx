"use client";

import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button, Checkbox, Separator } from "@heroui/react";
import { cn } from "@heroui/styles";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  nexafsVerificationBadgeRingClassName,
} from "~/components/nexafs/nexafs-publication-verification-control";
import type { NexafsBrowseSourcePublication } from "~/types/nexafs-browse";
import { ATTRIBUTION_NESTED_OVERLAY_SELECTOR } from "~/lib/nexafs-attribution";
import {
  SourcePaperDoiField,
  type SourcePaperDoiFieldValue,
} from "~/features/process-nexafs/ui/source-paper-doi-field";
import { site } from "~/app/brand";

type NexafsVerificationHubMenuProps = {
  experimentId: string;
  sourcePublications: NexafsBrowseSourcePublication[];
  atlasTeamVerified: boolean;
  canEditSourcePublications: boolean;
  canManageAtlasVerification: boolean;
};

function useInvalidateBrowseSourcePublications(experimentId: string) {
  const utils = trpc.useUtils();
  return useCallback(async () => {
    await Promise.all([
      utils.experiments.getSourcePaperDoi.invalidate({ experimentId }),
      utils.experiments.listSourcePublications.invalidate({ experimentId }),
      utils.experiments.browseList.invalidate(),
      utils.experiments.browseSearch.invalidate(),
    ]);
  }, [experimentId, utils.experiments]);
}

/**
 * Unified verification editor opened from the browse card + control: Atlas team verification (maintainers)
 * and source publication linking (experiment editors).
 */
export function NexafsVerificationHubMenu({
  experimentId,
  sourcePublications,
  atlasTeamVerified,
  canEditSourcePublications,
  canManageAtlasVerification,
}: NexafsVerificationHubMenuProps) {
  const invalidateBrowse = useInvalidateBrowseSourcePublications(experimentId);
  const [draft, setDraft] = useState<SourcePaperDoiFieldValue>({
    doi: "",
    citation: null,
  });

  const atlasMutation = trpc.experiments.setAtlasTeamVerification.useMutation({
    onSuccess: async () => {
      await invalidateBrowse();
      showToast("Atlas team verification updated", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

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

  const showAtlasSection = canManageAtlasVerification;
  const showSourceSection = canEditSourcePublications;
  if (!showAtlasSection && !showSourceSection) {
    return null;
  }

  const hubAriaLabel = showAtlasSection
    ? showSourceSection
      ? "Manage dataset verification"
      : "Manage Atlas team verification"
    : "Manage source publications";

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
            aria-label={hubAriaLabel}
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
      renderContent={({ close, contentProps, contentPositionClassName }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(
            contentPositionClassName,
            "border-border bg-surface z-tooltip w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border p-3 shadow-xl",
          )}
        >
          <p className="text-foreground mb-1 text-sm font-semibold">
            Dataset verification
          </p>
          <p className="text-muted mb-3 text-xs leading-snug">
            Reasons to trust this dataset on {site.name}.
          </p>

          {showAtlasSection ? (
            <section className="mb-3">
              <p className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                Atlas team
              </p>
              <Checkbox
                isSelected={atlasTeamVerified}
                isDisabled={atlasMutation.isPending}
                onChange={() => {
                  atlasMutation.mutate({
                    experimentId,
                    verified: !atlasTeamVerified,
                  });
                }}
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Content>
                  <span className="text-foreground text-sm">
                    Verified by the {site.name} team
                  </span>
                </Checkbox.Content>
              </Checkbox>
            </section>
          ) : null}

          {showAtlasSection && showSourceSection ? (
            <Separator className="bg-separator mb-3" />
          ) : null}

          {showSourceSection ? (
            <section>
              <p className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                Source publications
              </p>
              <p className="text-muted mb-3 text-xs leading-snug">
                Peer-reviewed papers reporting the original measurement.
              </p>
              {sourcePublications.length > 0 ? (
                <ul className="mb-3 space-y-2">
                  {sourcePublications.map((publication) => (
                    <li
                      key={publication.doi}
                      className="border-border bg-surface-secondary flex items-start justify-between gap-2 rounded-lg border px-2 py-1.5"
                    >
                      <span className="text-foreground min-w-0 font-mono text-[11px] break-all">
                        {publication.doi}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-danger shrink-0"
                        isDisabled={removeMutation.isPending}
                        onPress={() => {
                          removeMutation.mutate({
                            experimentId,
                            doi: publication.doi,
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
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
                  Close
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  isDisabled={addMutation.isPending}
                  onPress={() => {
                    handleAdd();
                  }}
                >
                  Add publication
                </Button>
              </div>
            </section>
          ) : null}
        </PopoverMenuContent>
      )}
    />
  );
}

/**
 * Loads permissions and renders {@link NexafsVerificationHubMenu} beside verification badges.
 */
export function NexafsVerificationHubMenuControl({
  experimentId,
  sourcePublications,
  atlasTeamVerified,
}: Omit<
  NexafsVerificationHubMenuProps,
  "canEditSourcePublications" | "canManageAtlasVerification"
>) {
  const { data: session } = useSession();
  const canEditQuery = trpc.experiments.canEditExperiment.useQuery({
    experimentId,
  });

  const canEditSourcePublications = canEditQuery.data?.canEdit === true;
  const canManageAtlasVerification = session?.user?.canAccessLabs === true;

  if (!canEditSourcePublications && !canManageAtlasVerification) {
    return null;
  }

  return (
    <NexafsVerificationHubMenu
      experimentId={experimentId}
      sourcePublications={sourcePublications}
      atlasTeamVerified={atlasTeamVerified}
      canEditSourcePublications={canEditSourcePublications}
      canManageAtlasVerification={canManageAtlasVerification}
    />
  );
}
