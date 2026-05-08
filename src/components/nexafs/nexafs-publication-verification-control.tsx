"use client";

import { BadgeCheck } from "lucide-react";
import { Modal, Tooltip } from "@heroui/react";
import type { NexafsBrowseLinkedPublication } from "~/types/nexafs-browse";

const badgeBase =
  "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1 py-0.5 text-[10px] font-semibold leading-none tracking-wide uppercase transition-colors";

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
}

/**
 * Renders the browse-card verification affordance: muted when no linked DOIs; accent badge when verified.
 * One DOI opens the resolver in a new tab; several open a HeroUI modal listing minimal citations with outbound links.
 */
export function NexafsPublicationVerificationControl({
  linkedPublications,
}: NexafsPublicationVerificationControlProps) {
  const n = linkedPublications.length;
  const verified = n > 0;

  const iconVerified =
    "h-3 w-3 shrink-0 text-[var(--accent)] sm:h-3.5 sm:w-3.5";
  const iconMuted =
    "h-3 w-3 shrink-0 text-text-tertiary opacity-70 sm:h-3.5 sm:w-3.5";

  if (!verified) {
    return (
      <Tooltip delay={0}>
        <Tooltip.Trigger
          className="inline-flex shrink-0 cursor-default"
          aria-label="No linked publication DOI"
        >
          <span
            className={`${badgeBase} border-dashed border-zinc-400/55 bg-zinc-100/80 text-text-tertiary opacity-90 dark:border-zinc-500/55 dark:bg-zinc-700/40`}
          >
            <BadgeCheck className={iconMuted} aria-hidden />
            <span aria-hidden className="max-[380px]:hidden">
              No DOI
            </span>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content placement="top">
          Dataset has no linked publication DOI
        </Tooltip.Content>
      </Tooltip>
    );
  }

  const verifiedBadgeClass = `${badgeBase} border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_oklab,var(--accent)_22%,transparent)]`;

  if (n === 1) {
    const pub = linkedPublications[0]!;
    const href = nexafsPublicationDoiHref(pub.doi);
    return (
      <button
        type="button"
        className={`focus-visible:ring-accent cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${verifiedBadgeClass}`}
        aria-label="Open linked publication DOI in a new tab"
        title="Open publication DOI"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(href, "_blank", "noopener,noreferrer");
        }}
      >
        <BadgeCheck className={iconVerified} aria-hidden />
        <span className="max-[380px]:sr-only">DOI</span>
      </button>
    );
  }

  return (
    <Modal>
      <Modal.Trigger
        className={`focus-visible:ring-accent cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${verifiedBadgeClass}`}
        aria-label={`Show ${n} linked publication DOIs`}
        title="Linked publications"
      >
        <BadgeCheck className={iconVerified} aria-hidden />
        <span className="tabular-nums">{n}</span>
        <span className="max-[420px]:sr-only">DOIs</span>
      </Modal.Trigger>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="Close linked publications" />
            <Modal.Header>
              <Modal.Heading>Linked publications</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ul className="space-y-3 text-left text-sm">
                {linkedPublications.map((p) => {
                  const href = nexafsPublicationDoiHref(p.doi);
                  const cite = formatNexafsBrowseMinimalCitation(p);
                  return (
                    <li key={p.doi}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {cite}
                      </a>
                      <div className="text-text-tertiary mt-0.5 font-mono text-xs">
                        {p.doi}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
