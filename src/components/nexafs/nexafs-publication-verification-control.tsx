"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, BookOpen, X } from "lucide-react";
import { Button } from "@heroui/react";
import { site } from "~/app/brand";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import type {
  NexafsBrowseLinkedPublication,
  NexafsBrowseSourcePublication,
} from "~/types/nexafs-browse";

const TOOLTIP_CLOSE_DELAY_MS = 100;
const TOOLTIP_VERTICAL_OFFSET_PX = 8;

const tooltipShellClassName =
  "relative w-[min(18rem,calc(100vw-1rem))] max-w-[min(18rem,calc(100vw-1rem))] rounded-2xl border border-zinc-700/80 bg-zinc-900/95 px-3 py-2.5 text-left text-xs leading-snug text-zinc-100 shadow-2xl backdrop-blur-sm";

export const nexafsVerificationBadgeRingClassName =
  "inline-flex shrink-0 rounded-full bg-zinc-50 p-px ring-2 ring-zinc-50 dark:bg-zinc-800 dark:ring-zinc-800";

export const nexafsSourcePublicationBadgeClassName =
  "text-blue-600 dark:text-blue-400";

const badgeRing = nexafsVerificationBadgeRingClassName;
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
  /** Experiment id for source-publication removal in the hover panel. */
  experimentId?: string;
  /** Compact edit affordances rendered beside the badge stack (unified verification hub). */
  trailingSlot?: ReactNode;
}

function VerificationBadgeStack({
  hasAtlas,
  hasLinkedDoi,
  hasSource,
}: {
  hasAtlas: boolean;
  hasLinkedDoi: boolean;
  hasSource: boolean;
}) {
  if (!hasAtlas && !hasLinkedDoi && !hasSource) {
    return (
      <BadgeCheck
        className="text-text-tertiary h-4 w-4 shrink-0 opacity-75"
        strokeWidth={1.75}
        aria-hidden
      />
    );
  }

  if (hasAtlas && hasSource) {
    return (
      <span className="inline-flex items-center pr-0.5" aria-hidden>
        <span className={`relative z-0 ${badgeRing}`}>
          <BadgeCheck
            className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400"
            strokeWidth={2}
            aria-hidden
          />
        </span>
        <span className={`relative z-[1] -ml-1.5 ${badgeRing}`}>
          <BookOpen
            className={`${sourceBookClassName} h-3 w-3 shrink-0`}
            strokeWidth={2}
            aria-hidden
          />
        </span>
      </span>
    );
  }

  if (hasAtlas && hasLinkedDoi) {
    return (
      <span className="inline-flex items-center pr-0.5" aria-hidden>
        <span className={`relative z-0 ${badgeRing}`}>
          <BadgeCheck
            className="h-3 w-3 shrink-0 text-[var(--accent)]"
            strokeWidth={2}
            aria-hidden
          />
        </span>
        <span className={`relative z-[1] -ml-1.5 ${badgeRing}`}>
          <BadgeCheck
            className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400"
            strokeWidth={2}
            aria-hidden
          />
        </span>
      </span>
    );
  }

  if (hasAtlas) {
    return (
      <BadgeCheck
        className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        strokeWidth={1.75}
        aria-hidden
      />
    );
  }

  if (hasSource) {
    return (
      <BookOpen
        className={`${sourceBookClassName} h-4 w-4 shrink-0`}
        strokeWidth={1.75}
        aria-hidden
      />
    );
  }

  return (
    <BadgeCheck
      className="h-4 w-4 shrink-0 text-[var(--accent)]"
      strokeWidth={1.75}
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
  return <p className="text-sm font-semibold text-zinc-100">{children}</p>;
}

function DoiResolverLink({ doi }: { doi: string }) {
  const href = nexafsPublicationDoiHref(doi);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-visible:ring-accent mt-1 inline-block font-mono text-[11px] text-emerald-400 break-all hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
      onClick={(e) => e.stopPropagation()}
    >
      {doi}
    </a>
  );
}

function VerificationTooltipSurface({
  arrowOffsetPx,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  arrowOffsetPx: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={`pointer-events-auto ${tooltipShellClassName}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
      <div
        className="absolute top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-zinc-700/80 bg-zinc-900/95 transition-[left] duration-150 ease-out"
        style={{ left: `calc(50% + ${arrowOffsetPx}px)` }}
        aria-hidden
      />
    </div>
  );
}

function useVerificationTooltipPosition(triggerRef: RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof document === "undefined") return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - TOOLTIP_VERTICAL_OFFSET_PX,
    });
  }, [triggerRef]);

  return { position, updatePosition };
}

/**
 * Renders stacked verification badges on browse cards (Atlas ingest first when present, publication DOI behind when both).
 * Hover or focus opens a portaled panel matching contributor avatar tooltips (`document.body`, `z-tooltip`, fixed layout).
 */
export function NexafsPublicationVerificationControl({
  linkedPublications,
  sourcePublications = [],
  ingestVerified = false,
  experimentId,
  trailingSlot = null,
}: NexafsPublicationVerificationControlProps) {
  const n = linkedPublications.length;
  const sourceCount = sourcePublications.length;
  const hasLinkedDoi = n > 0;
  const hasSource = sourceCount > 0;
  const hasAtlas = ingestVerified;

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId: experimentId ?? "" },
    { enabled: Boolean(experimentId) },
  );
  const canEditSourcePublications = canEditQuery.data?.canEdit === true;

  const utils = trpc.useUtils();
  const removeMutation = trpc.experiments.removeSourcePublication.useMutation({
    onSuccess: async () => {
      if (experimentId) {
        await Promise.all([
          utils.experiments.getSourcePaperDoi.invalidate({ experimentId }),
          utils.experiments.listSourcePublications.invalidate({ experimentId }),
          utils.experiments.browseList.invalidate(),
          utils.experiments.browseSearch.invalidate(),
        ]);
      }
      showToast("Source publication removed", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { position, updatePosition } = useVerificationTooltipPosition(triggerRef);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openTooltip = useCallback(() => {
    updatePosition();
    clearCloseTimer();
    setIsOpen(true);
  }, [clearCloseTimer, updatePosition]);

  const scheduleCloseTooltip = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, TOOLTIP_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      updatePosition();
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [isOpen, updatePosition]);

  const renderSourceRemove = useCallback(
    (doi: string) => {
      if (!canEditSourcePublications || !experimentId) {
        return null;
      }
      return (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          isIconOnly
          className="text-zinc-400 hover:text-red-400"
          aria-label={`Remove source publication ${doi}`}
          isDisabled={removeMutation.isPending}
          onPress={() => {
            removeMutation.mutate({ experimentId, doi });
          }}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      );
    },
    [
      canEditSourcePublications,
      experimentId,
      removeMutation,
    ],
  );

  const tooltipInner = useMemo(() => {
    const sourceSection =
      sourceCount === 0 ? null : sourceCount === 1 ? (
        (() => {
          const pub = sourcePublications[0]!;
          const cite = formatNexafsBrowseMinimalCitation(pub);
          return (
            <div
              className={
                hasAtlas || hasLinkedDoi ? "border-t border-zinc-700/70 pt-3" : undefined
              }
            >
              <div className="flex items-start justify-between gap-2">
                <SectionTitle>Source publication</SectionTitle>
                {renderSourceRemove(pub.doi)}
              </div>
              <p className="mt-1 text-zinc-300">
                Peer-reviewed paper reporting the original measurement.
              </p>
              <p className="mt-1 text-sm leading-snug text-zinc-200">{cite}</p>
              <DoiResolverLink doi={pub.doi} />
            </div>
          );
        })()
      ) : (
        <div
          className={
            hasAtlas || hasLinkedDoi ? "border-t border-zinc-700/70 pt-3" : undefined
          }
        >
          <SectionTitle>Source publications</SectionTitle>
          <p className="mt-1 text-zinc-300">
            {sourceCount} peer-reviewed source papers linked.
          </p>
          <ul className="mt-2 space-y-2">
            {sourcePublications.map((p) => {
              const cite = formatNexafsBrowseMinimalCitation(p);
              return (
                <li key={p.doi}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-200">
                      {cite}
                    </p>
                    {renderSourceRemove(p.doi)}
                  </div>
                  <DoiResolverLink doi={p.doi} />
                </li>
              );
            })}
          </ul>
        </div>
      );

    if (!hasAtlas && !hasLinkedDoi && !hasSource) {
      return (
        <>
          <SectionTitle>Verification status</SectionTitle>
          <p className="mt-1 text-zinc-300">
            No Atlas team verification or source publication linked yet.
          </p>
        </>
      );
    }

    const atlasSection = hasAtlas ? (
      <div>
        <SectionTitle>Atlas verification</SectionTitle>
        <p className="mt-1 text-zinc-300">
          Verified by the {site.name} team.
        </p>
      </div>
    ) : null;

    const linkedSection =
      !hasLinkedDoi ? null : n === 1 ? (
        (() => {
          const pub = linkedPublications[0]!;
          const cite = formatNexafsBrowseMinimalCitation(pub);
          return (
            <div className={hasAtlas ? "border-t border-zinc-700/70 pt-3" : undefined}>
              <SectionTitle>Linked publication</SectionTitle>
              <p className="mt-1 text-zinc-300">
                Additional literature reference linked to this dataset.
              </p>
              <p className="mt-1 text-sm leading-snug text-zinc-200">{cite}</p>
              <DoiResolverLink doi={pub.doi} />
            </div>
          );
        })()
      ) : (
        <div className={hasAtlas ? "border-t border-zinc-700/70 pt-3" : undefined}>
          <SectionTitle>Linked publications</SectionTitle>
          <p className="mt-1 text-zinc-300">{n} additional DOIs linked.</p>
          <ul className="mt-2 space-y-2">
            {linkedPublications.map((p) => {
              const cite = formatNexafsBrowseMinimalCitation(p);
              return (
                <li key={p.doi}>
                  <p className="text-sm leading-snug text-zinc-200">{cite}</p>
                  <DoiResolverLink doi={p.doi} />
                </li>
              );
            })}
          </ul>
        </div>
      );

    return (
      <div className="flex flex-col gap-3">
        {atlasSection}
        {linkedSection}
        {sourceSection}
      </div>
    );
  }, [
    hasAtlas,
    hasLinkedDoi,
    hasSource,
    n,
    linkedPublications,
    renderSourceRemove,
    sourceCount,
    sourcePublications,
  ]);

  const ariaLabel = verificationAriaLabel(hasAtlas, hasLinkedDoi, hasSource);

  return (
    <>
      <span className="inline-flex shrink-0 items-center gap-0.5">
        <span
          ref={triggerRef}
          tabIndex={0}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          className="focus-visible:ring-accent inline-flex shrink-0 cursor-default items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          onMouseEnter={openTooltip}
          onMouseLeave={scheduleCloseTooltip}
          onFocus={openTooltip}
          onBlur={scheduleCloseTooltip}
          onClick={(e) => e.stopPropagation()}
        >
          <VerificationBadgeStack
            hasAtlas={hasAtlas}
            hasLinkedDoi={hasLinkedDoi}
            hasSource={hasSource}
          />
        </span>
        {trailingSlot}
      </span>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="z-tooltip pointer-events-none fixed -translate-x-1/2 -translate-y-full"
              style={{ left: position.left, top: position.top }}
            >
              <VerificationTooltipSurface
                arrowOffsetPx={0}
                onMouseEnter={openTooltip}
                onMouseLeave={scheduleCloseTooltip}
              >
                {tooltipInner}
              </VerificationTooltipSurface>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
