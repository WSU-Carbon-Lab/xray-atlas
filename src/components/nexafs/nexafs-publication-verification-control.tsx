"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { BadgeCheck, BookOpen, Shield, X } from "lucide-react";
import { Button, Checkbox, Separator } from "@heroui/react";
import { cn } from "@heroui/styles";
import { site } from "~/app/brand";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import {
  SourcePaperDoiField,
  type SourcePaperDoiFieldValue,
} from "~/features/process-nexafs/ui/source-paper-doi-field";
import { ATTRIBUTION_NESTED_OVERLAY_SELECTOR } from "~/lib/nexafs-attribution";
import type {
  NexafsBrowseLinkedPublication,
  NexafsBrowseSourcePublication,
} from "~/types/nexafs-browse";

const POPOVER_CLOSE_DELAY_MS = 120;

export const nexafsSourcePublicationBadgeClassName =
  "text-blue-600 dark:text-blue-400";

const verificationBadgeIconClassName = "h-4 w-4 shrink-0";
const verificationBadgeIconStrokeWidth = 1.75;
const sourceBookClassName = nexafsSourcePublicationBadgeClassName;

function normalizeDoiForHref(doi: string): string {
  return doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
}

/**
 * Returns an absolute DOI resolver URL for `doi`, stripping an existing `https://doi.org/` prefix when present.
 */
export function nexafsPublicationDoiHref(doi: string): string {
  return `https://doi.org/${normalizeDoiForHref(doi)}`;
}

function truncateTitle(title: string, maxLen: number): string {
  const t = title.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function shortenAuthors(authors: unknown): string | null {
  if (authors == null) return null;
  if (Array.isArray(authors)) {
    const names: string[] = [];
    for (const a of authors) {
      if (typeof a === "string" && a.trim()) names.push(a.trim());
      else if (a && typeof a === "object" && "name" in a) {
        const n = (a as { name?: unknown }).name;
        if (typeof n === "string" && n.trim()) names.push(n.trim());
      }
    }
    if (names.length === 0) return null;
    const first = names[0];
    if (!first) return null;
    if (names.length === 1) return first;
    return `${first} et al.`;
  }
  if (typeof authors === "object") {
    const o = authors as Record<string, unknown>;
    const nested = o.names ?? o.authors;
    if (Array.isArray(nested)) return shortenAuthors(nested);
  }
  return null;
}

/**
 * Builds a single-line minimal citation for browse UI: shortened authors, optional year, truncated title;
 * falls back to DOI when metadata is insufficient.
 */
export function formatNexafsBrowseMinimalCitation(
  p: NexafsBrowseLinkedPublication,
): string {
  const au = shortenAuthors(p.authors);
  const titleFrag = truncateTitle(p.title || "", 80);
  if (au && titleFrag) {
    const yearSuffix = p.year != null ? ` (${p.year})` : "";
    return `${au}${yearSuffix}. ${titleFrag}`.replace(/\s+/g, " ").trim();
  }
  if (titleFrag && p.year != null) return `${p.year}. ${titleFrag}`.trim();
  if (titleFrag) return titleFrag;
  return p.doi;
}

export interface NexafsPublicationVerificationControlProps {
  linkedPublications: NexafsBrowseLinkedPublication[];
  sourcePublications?: NexafsBrowseSourcePublication[];
  /** When true, shows Atlas team verification (maintainer flag on `validation_summary`). */
  ingestVerified?: boolean;
  /** Experiment id for source-publication and Atlas verification edits in the popover. */
  experimentId?: string;
}

function VerificationBadgeStack({
  hasAtlas,
  hasSource,
}: {
  hasAtlas: boolean;
  hasSource: boolean;
}) {
  if (hasAtlas && hasSource) {
    return (
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        <BadgeCheck
          className={cn(
            verificationBadgeIconClassName,
            "text-emerald-600 dark:text-emerald-400",
          )}
          strokeWidth={verificationBadgeIconStrokeWidth}
          aria-hidden
        />
        <BookOpen
          className={cn(verificationBadgeIconClassName, sourceBookClassName)}
          strokeWidth={verificationBadgeIconStrokeWidth}
          aria-hidden
        />
      </span>
    );
  }

  if (hasAtlas) {
    return (
      <BadgeCheck
        className={cn(
          verificationBadgeIconClassName,
          "text-emerald-600 dark:text-emerald-400",
        )}
        strokeWidth={verificationBadgeIconStrokeWidth}
        aria-hidden
      />
    );
  }

  if (hasSource) {
    return (
      <BookOpen
        className={cn(verificationBadgeIconClassName, sourceBookClassName)}
        strokeWidth={verificationBadgeIconStrokeWidth}
        aria-hidden
      />
    );
  }

  return (
    <Shield
      className={cn(
        verificationBadgeIconClassName,
        "text-text-tertiary opacity-70",
      )}
      strokeWidth={verificationBadgeIconStrokeWidth}
      aria-hidden
    />
  );
}

function verificationAriaLabel(
  hasAtlas: boolean,
  hasLinkedDoi: boolean,
  hasSource: boolean,
): string {
  if (!hasAtlas && !hasLinkedDoi && !hasSource) {
    return "No dataset verification";
  }
  const parts: string[] = [];
  if (hasAtlas) parts.push("Atlas team verification");
  if (hasSource) parts.push("source publication linked");
  if (hasLinkedDoi) parts.push("linked publication DOI");
  return `Dataset verification: ${parts.join("; ")}`;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </p>
  );
}

function DoiResolverLink({ doi }: { doi: string }) {
  const href = nexafsPublicationDoiHref(doi);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-visible:ring-accent text-accent mt-1 inline-block font-mono text-[11px] break-all hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      {doi}
    </a>
  );
}

function useInvalidateBrowseSourcePublications(experimentId: string | undefined) {
  const utils = trpc.useUtils();
  return useCallback(async () => {
    if (!experimentId) return;
    await Promise.all([
      utils.experiments.getSourcePaperDoi.invalidate({ experimentId }),
      utils.experiments.listSourcePublications.invalidate({ experimentId }),
      utils.experiments.browseList.invalidate(),
      utils.experiments.browseSearch.invalidate(),
    ]);
  }, [experimentId, utils.experiments]);
}

function VerificationStatusSections({
  hasAtlas,
  hasLinkedDoi,
  hasSource,
  linkedPublications,
  sourcePublications,
}: {
  hasAtlas: boolean;
  hasLinkedDoi: boolean;
  hasSource: boolean;
  linkedPublications: NexafsBrowseLinkedPublication[];
  sourcePublications: NexafsBrowseSourcePublication[];
}) {
  const n = linkedPublications.length;
  const sourceCount = sourcePublications.length;

  if (!hasAtlas && !hasLinkedDoi && !hasSource) {
    return (
      <section>
        <SectionTitle>Verification status</SectionTitle>
        <p className="text-muted mt-1 text-xs leading-snug">
          No Atlas team verification or source publication linked yet.
        </p>
      </section>
    );
  }

  const atlasSection = hasAtlas ? (
    <section>
      <SectionTitle>Atlas verification</SectionTitle>
      <p className="text-muted mt-1 text-xs leading-snug">
        Peer-reviewed by the {site.name} team (dataset quality review, not the
        original measurement paper).
      </p>
    </section>
  ) : null;

  const linkedSection =
    !hasLinkedDoi ? null : n === 1 ? (
      (() => {
        const pub = linkedPublications[0]!;
        const cite = formatNexafsBrowseMinimalCitation(pub);
        return (
          <section className={hasAtlas ? "border-separator border-t pt-3" : undefined}>
            <SectionTitle>Linked publication</SectionTitle>
            <p className="text-muted mt-1 text-xs leading-snug">
              Additional literature reference linked to this dataset.
            </p>
            <p className="text-foreground mt-1 text-sm leading-snug">{cite}</p>
            <DoiResolverLink doi={pub.doi} />
          </section>
        );
      })()
    ) : (
      <section className={hasAtlas ? "border-separator border-t pt-3" : undefined}>
        <SectionTitle>Linked publications</SectionTitle>
        <p className="text-muted mt-1 text-xs leading-snug">
          {n} additional DOIs linked.
        </p>
        <ul className="mt-2 space-y-2">
          {linkedPublications.map((p) => {
            const cite = formatNexafsBrowseMinimalCitation(p);
            return (
              <li key={p.doi}>
                <p className="text-foreground text-sm leading-snug">{cite}</p>
                <DoiResolverLink doi={p.doi} />
              </li>
            );
          })}
        </ul>
      </section>
    );

  const sourceSection =
    sourceCount === 0 ? null : sourceCount === 1 ? (
      (() => {
        const pub = sourcePublications[0]!;
        const cite = formatNexafsBrowseMinimalCitation(pub);
        return (
          <section
            className={
              hasAtlas || hasLinkedDoi ? "border-separator border-t pt-3" : undefined
            }
          >
            <SectionTitle>Source publication</SectionTitle>
            <p className="text-muted mt-1 text-xs leading-snug">
              Peer-reviewed paper reporting the original measurement.
            </p>
            <p className="text-foreground mt-1 text-sm leading-snug">{cite}</p>
            <DoiResolverLink doi={pub.doi} />
          </section>
        );
      })()
    ) : (
      <section
        className={
          hasAtlas || hasLinkedDoi ? "border-separator border-t pt-3" : undefined
        }
      >
        <SectionTitle>Source publications</SectionTitle>
        <p className="text-muted mt-1 text-xs leading-snug">
          {sourceCount} peer-reviewed source papers linked.
        </p>
        <ul className="mt-2 space-y-2">
          {sourcePublications.map((p) => {
            const cite = formatNexafsBrowseMinimalCitation(p);
            return (
              <li key={p.doi}>
                <p className="text-foreground text-sm leading-snug">{cite}</p>
                <DoiResolverLink doi={p.doi} />
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <div className="flex flex-col gap-3">
      {atlasSection}
      {linkedSection}
      {sourceSection}
    </div>
  );
}

function VerificationEditorSections({
  experimentId,
  sourcePublications,
  atlasTeamVerified,
  canEditSourcePublications,
  canManageAtlasVerification,
  onClose,
}: {
  experimentId: string;
  sourcePublications: NexafsBrowseSourcePublication[];
  atlasTeamVerified: boolean;
  canEditSourcePublications: boolean;
  canManageAtlasVerification: boolean;
  onClose: () => void;
}) {
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

  return (
    <div className="border-separator mt-3 border-t pt-3">
      {showAtlasSection ? (
        <section className="mb-3">
          <SectionTitle>Atlas team</SectionTitle>
          <Checkbox
            className="mt-2"
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
          <SectionTitle>Source publications</SectionTitle>
          <p className="text-muted mb-3 mt-1 text-xs leading-snug">
            Link peer-reviewed papers reporting the original measurement.
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
            <Button type="button" size="sm" variant="tertiary" onPress={onClose}>
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              isDisabled={addMutation.isPending}
              onPress={handleAdd}
            >
              Add publication
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/**
 * Renders verification badges on browse cards and a unified popover for status plus
 * contributor source-publication edits and maintainer Atlas-team verification toggles.
 */
export function NexafsPublicationVerificationControl({
  linkedPublications,
  sourcePublications = [],
  ingestVerified = false,
  experimentId,
}: NexafsPublicationVerificationControlProps) {
  const n = linkedPublications.length;
  const hasLinkedDoi = n > 0;
  const hasSource = sourcePublications.length > 0;
  const hasAtlas = ingestVerified;

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId: experimentId ?? "" },
    { enabled: Boolean(experimentId) },
  );
  const canEditSourcePublications = canEditQuery.data?.canEdit === true;
  const canManageAtlasVerification =
    canEditQuery.data?.canManageAtlasVerification === true;
  const hasEditorAccess =
    Boolean(experimentId) &&
    (canEditSourcePublications || canManageAtlasVerification);

  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPopover = useCallback(() => {
    clearCloseTimer();
    setIsOpen(true);
  }, [clearCloseTimer]);

  const scheduleClosePopover = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, POPOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  const ariaLabel = verificationAriaLabel(hasAtlas, hasLinkedDoi, hasSource);

  const popoverBody = (
    <>
      <p className="text-foreground mb-1 text-sm font-semibold">
        Dataset verification
      </p>
      <p className="text-muted mb-3 text-xs leading-snug">
        Reasons to trust this dataset on {site.name}.
      </p>
      <VerificationStatusSections
        hasAtlas={hasAtlas}
        hasLinkedDoi={hasLinkedDoi}
        hasSource={hasSource}
        linkedPublications={linkedPublications}
        sourcePublications={sourcePublications}
      />
      {experimentId && hasEditorAccess ? (
        <VerificationEditorSections
          experimentId={experimentId}
          sourcePublications={sourcePublications}
          atlasTeamVerified={hasAtlas}
          canEditSourcePublications={canEditSourcePublications}
          canManageAtlasVerification={canManageAtlasVerification}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );

  return (
    <PopoverMenu
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-start"
      rootClassName="inline-flex shrink-0"
      ignoreOutsidePointerDownSelector={ATTRIBUTION_NESTED_OVERLAY_SELECTOR}
      renderTrigger={({ triggerProps }) => {
        const { onClick, onPointerDown, ...restTriggerProps } = triggerProps;
        return (
          <button
            {...restTriggerProps}
            type="button"
            aria-label={ariaLabel}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            onPointerDown={(event) => {
              event.stopPropagation();
              onPointerDown?.(event);
            }}
            onMouseEnter={openPopover}
            onMouseLeave={scheduleClosePopover}
            onFocus={openPopover}
            onBlur={scheduleClosePopover}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              clearCloseTimer();
              setIsOpen((prev) => !prev);
              onClick?.(event);
            }}
            className={cn(
              "focus-visible:ring-accent inline-flex shrink-0 cursor-default items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isOpen && "ring-accent/40 ring-1 ring-offset-1",
            )}
          >
            <VerificationBadgeStack hasAtlas={hasAtlas} hasSource={hasSource} />
          </button>
        );
      }}
      renderContent={({ contentProps, contentPositionClassName }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(
            contentPositionClassName,
            "border-border bg-surface z-tooltip w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border p-3 shadow-xl",
          )}
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClosePopover}
        >
          {popoverBody}
        </PopoverMenuContent>
      )}
    />
  );
}
