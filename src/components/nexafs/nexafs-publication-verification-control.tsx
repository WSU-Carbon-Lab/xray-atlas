"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, BookOpen, Shield } from "lucide-react";
import { Button } from "@heroui/react";
import { cn } from "@heroui/styles";
import { site } from "~/app/brand";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
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
const POPOVER_VERTICAL_OFFSET_PX = 8;

const verificationPopoverShellClassName =
  "relative w-[min(22rem,calc(100vw-1.5rem))] max-w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-surface p-2.5 text-left shadow-xl ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)]";

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
    <p className="text-foreground text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </p>
  );
}

function VerificationPopoverSurface({
  arrowOffsetPx,
  contentRef,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  arrowOffsetPx: number;
  contentRef: RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={contentRef}
      className={`pointer-events-auto ${verificationPopoverShellClassName}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
      <div
        className="border-border bg-surface absolute top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b transition-[left] duration-150 ease-out"
        style={{ left: `calc(50% + ${arrowOffsetPx}px)` }}
        aria-hidden
      />
    </div>
  );
}

function useVerificationPopoverPosition(
  triggerRef: RefObject<HTMLElement | null>,
) {
  const [position, setPosition] = useState({ left: 0, top: 0, arrowOffsetPx: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - POPOVER_VERTICAL_OFFSET_PX,
      arrowOffsetPx: 0,
    });
  }, [triggerRef]);

  return { position, updatePosition };
}

function DoiResolverLink({ doi }: { doi: string }) {
  const href = nexafsPublicationDoiHref(doi);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-visible:ring-accent text-accent inline-block font-mono text-[10px] break-all hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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

function AtlasVerificationSection({
  experimentId,
  atlasTeamVerified,
  canManageAtlasVerification,
}: {
  experimentId: string;
  atlasTeamVerified: boolean;
  canManageAtlasVerification: boolean;
}) {
  const invalidateBrowse = useInvalidateBrowseSourcePublications(experimentId);

  const atlasMutation = trpc.experiments.setAtlasTeamVerification.useMutation({
    onSuccess: async () => {
      await invalidateBrowse();
      showToast("Atlas team verification updated", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Atlas Verification</SectionTitle>
        {canManageAtlasVerification ? (
          atlasTeamVerified ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-danger h-7 min-h-7 shrink-0 px-2 text-xs"
              isDisabled={atlasMutation.isPending}
              onPress={() => {
                atlasMutation.mutate({
                  experimentId,
                  verified: false,
                });
              }}
            >
              Remove
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 min-h-7 shrink-0 px-2 text-xs"
              isDisabled={atlasMutation.isPending}
              onPress={() => {
                atlasMutation.mutate({
                  experimentId,
                  verified: true,
                });
              }}
            >
              Add verification
            </Button>
          )
        ) : null}
      </div>
      {atlasTeamVerified ? (
        <p className="text-muted mt-0.5 text-xs leading-snug">
          Verified by the {site.name} team
        </p>
      ) : null}
    </section>
  );
}

function SourcePublicationSection({
  experimentId,
  sourcePublications,
  canEditSourcePublications,
  showTopBorder,
}: {
  experimentId: string;
  sourcePublications: NexafsBrowseSourcePublication[];
  canEditSourcePublications: boolean;
  showTopBorder: boolean;
}) {
  const invalidateBrowse = useInvalidateBrowseSourcePublications(experimentId);
  const [draft, setDraft] = useState<SourcePaperDoiFieldValue>({
    doi: "",
    citation: null,
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

  return (
    <section className={showTopBorder ? "border-separator border-t pt-2.5" : undefined}>
      <SectionTitle>Source Publication</SectionTitle>
      {sourcePublications.length > 0 ? (
        <ul className="mt-1 space-y-1.5">
          {sourcePublications.map((publication) => {
            const title = publication.title?.trim();
            return (
              <li
                key={publication.doi}
                className="flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  {title ? (
                    <p className="text-foreground line-clamp-1 text-xs leading-snug">
                      {truncateTitle(title, 72)}
                    </p>
                  ) : null}
                  <DoiResolverLink doi={publication.doi} />
                </div>
                {canEditSourcePublications ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger h-7 min-h-7 shrink-0 px-2 text-xs"
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
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {canEditSourcePublications ? (
        <div className={sourcePublications.length > 0 ? "mt-2" : "mt-1"}>
          <div data-attribution-nested-overlay="true">
            <SourcePaperDoiField
              value={draft}
              onChange={setDraft}
              disabled={addMutation.isPending}
              showLabel={false}
              helperText=""
              showCitationPreview={false}
            />
          </div>
          {draft.citation ? (
            <div className="mt-1.5 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 min-h-7 px-2 text-xs"
                isDisabled={addMutation.isPending}
                onPress={handleAdd}
              >
                Add
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function VerificationPopoverContent({
  experimentId,
  sourcePublications,
  atlasTeamVerified,
  canEditSourcePublications,
  canManageAtlasVerification,
}: {
  experimentId: string | undefined;
  sourcePublications: NexafsBrowseSourcePublication[];
  atlasTeamVerified: boolean;
  canEditSourcePublications: boolean;
  canManageAtlasVerification: boolean;
}) {
  const showAtlasSection =
    atlasTeamVerified || canManageAtlasVerification;
  const showSourceSection =
    sourcePublications.length > 0 || canEditSourcePublications;

  if (!showAtlasSection && !showSourceSection) {
    return (
      <p className="text-muted text-xs leading-snug">No verification on record.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {showAtlasSection && experimentId ? (
        <AtlasVerificationSection
          experimentId={experimentId}
          atlasTeamVerified={atlasTeamVerified}
          canManageAtlasVerification={canManageAtlasVerification}
        />
      ) : showAtlasSection ? (
        <section>
          <SectionTitle>Atlas Verification</SectionTitle>
          <p className="text-muted mt-0.5 text-xs leading-snug">
            Verified by the {site.name} team
          </p>
        </section>
      ) : null}
      {showSourceSection && experimentId ? (
        <SourcePublicationSection
          experimentId={experimentId}
          sourcePublications={sourcePublications}
          canEditSourcePublications={canEditSourcePublications}
          showTopBorder={showAtlasSection}
        />
      ) : showSourceSection ? (
        <section className={showAtlasSection ? "border-separator border-t pt-2.5" : undefined}>
          <SectionTitle>Source Publication</SectionTitle>
          <ul className="mt-1 space-y-1.5">
            {sourcePublications.map((publication) => {
              const title = publication.title?.trim();
              return (
                <li key={publication.doi} className="min-w-0">
                  {title ? (
                    <p className="text-foreground line-clamp-1 text-xs leading-snug">
                      {truncateTitle(title, 72)}
                    </p>
                  ) : null}
                  <DoiResolverLink doi={publication.doi} />
                </li>
              );
            })}
          </ul>
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

  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { position, updatePosition } = useVerificationPopoverPosition(triggerRef);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPopover = useCallback(() => {
    updatePosition();
    clearCloseTimer();
    setIsOpen(true);
  }, [clearCloseTimer, updatePosition]);

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

  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => {
      updatePosition();
    };
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen || !hasEditorAccess) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        triggerRef.current?.contains(target) ||
        contentRef.current?.contains(target)
      ) {
        return;
      }
      if (
        target instanceof Element &&
        target.closest(ATTRIBUTION_NESTED_OVERLAY_SELECTOR)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasEditorAccess, isOpen]);

  const ariaLabel = verificationAriaLabel(hasAtlas, hasLinkedDoi, hasSource);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClosePopover}
        onFocus={openPopover}
        onBlur={scheduleClosePopover}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          clearCloseTimer();
          updatePosition();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "focus-visible:ring-accent inline-flex shrink-0 cursor-default items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isOpen && "ring-accent/40 ring-1 ring-offset-1",
        )}
      >
        <VerificationBadgeStack hasAtlas={hasAtlas} hasSource={hasSource} />
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="z-tooltip pointer-events-none fixed -translate-x-1/2 -translate-y-full"
              style={{ left: position.left, top: position.top }}
            >
              <VerificationPopoverSurface
                arrowOffsetPx={position.arrowOffsetPx}
                contentRef={contentRef}
                onMouseEnter={openPopover}
                onMouseLeave={scheduleClosePopover}
              >
                <VerificationPopoverContent
                  experimentId={experimentId}
                  sourcePublications={sourcePublications}
                  atlasTeamVerified={hasAtlas}
                  canEditSourcePublications={canEditSourcePublications}
                  canManageAtlasVerification={canManageAtlasVerification}
                />
              </VerificationPopoverSurface>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
