"use client";

/**
 * Compact Atlas dataset Cite | doi segmented control for browse card action rows.
 *
 * One horizontal scholarly unit in the trailing cluster (before To molecule):
 * Cite opens a compact popover (Add to library via Atlas BibTeX for Zotero,
 * BibTeX and data-availability accordions);
 * doi opens Copy DOI / Zenodo link when minted, or mints / retries when not.
 * Never dumps the full `10.5281/…` string into the card header.
 *
 * Polling for in-flight deposits is budgeted and stale-aware so hung
 * `pending`/`depositing` rows cannot spin forever.
 *
 * Popovers use the same portaled press pattern as
 * `NexafsPublicationVerificationControl` / metrics rail: HeroUI Tooltip/Popover
 * is unreliable inside overflow-clipped, click-to-expand browse cards.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SVGProps,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowTopRightOnSquareIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import { Quote } from "lucide-react";
import { Accordion, Button, Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import { site } from "~/app/brand";
import { trpc } from "~/trpc/client";
import { ToastContainer, useToast } from "~/components/ui/toast";
import {
  buildDatasetCitationBundle,
  buildMendeleyImportUrl,
} from "~/lib/dataset-citation";
import { normalizeDoi } from "~/lib/doi";
import { atlasDatasetCitationHref } from "~/lib/nexafs-experiment-deep-link";
import {
  coerceZenodoDepositUiState,
  resolveZenodoDoiButtonMode,
  ZENODO_STATUS_MAX_POLLS,
  type ZenodoDepositUiState,
} from "~/lib/zenodo-doi-button-mode";
import type { NexafsBrowseSourcePublication } from "~/types/nexafs-browse";

/** Official Zotero mark (white-backed PNG) served from `public/brand`. */
const ZOTERO_LOGO_SRC = "/brand/zotero-logo.png";

const shellClassName =
  "inline-flex h-6 shrink-0 items-stretch overflow-hidden rounded-md border border-border/70 bg-surface/60 text-[11px] leading-none shadow-sm";

const citeSegmentClassName =
  "text-text-secondary hover:text-foreground inline-flex h-full min-h-0 min-w-0 shrink-0 items-center gap-1 rounded-none border-0 bg-transparent px-2 py-0 font-medium tracking-tight shadow-none hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent data-[hovered=true]:bg-foreground/5";

const segmentDividerClassName = "w-px shrink-0 self-stretch bg-border/80";

const doiSegmentClassName =
  "inline-flex h-full min-w-[4.5rem] shrink-0 items-center justify-center gap-1 px-2 font-medium tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";

const doiSegmentQuietClassName =
  "text-text-secondary hover:bg-foreground/5 hover:text-foreground";

const doiSegmentMintedClassName =
  "text-foreground/80 hover:bg-foreground/5 hover:text-foreground";

const doiSegmentRetryClassName =
  "text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/15";

const doiSegmentBusyClassName = "text-accent";

const doiWordmarkClassName = "font-semibold lowercase tracking-wide";

const scholarlyIconClassName = "h-3 w-3 shrink-0 opacity-80";

const popoverShellClassName =
  "pointer-events-auto relative w-[min(26rem,calc(100vw-1.5rem))] max-w-[min(26rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-surface p-4 text-left text-foreground shadow-xl ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)]";

const sectionLabelClassName =
  "text-foreground text-[11px] font-semibold tracking-wide";

const sectionHintClassName =
  "text-muted mt-0.5 text-[10px] font-normal leading-snug tracking-normal";

const sectionBodyClassName =
  "text-muted mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-foreground/[0.03] px-2.5 py-2 font-mono text-[11px] leading-relaxed";

const sectionProseClassName =
  "text-muted mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-[12px] leading-relaxed";

const copyIconButtonClassName =
  "text-text-secondary hover:text-foreground h-7 w-7 min-w-7 shrink-0";

const referenceManagerLinkClassName =
  "text-text-secondary hover:text-foreground inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-foreground/[0.03] px-2.5 text-[11px] font-medium hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const citeAccordionClass = "w-full min-w-0 gap-1";

const citeAccordionTriggerClass =
  "text-foreground hover:bg-foreground/5 flex w-full min-w-0 items-center gap-2 rounded-lg px-1 py-2 text-left text-[11px] font-semibold tracking-wide";

const citeAccordionIndicatorClass =
  "text-muted ml-auto shrink-0 [&>svg]:size-3.5";

const POPOVER_VIEWPORT_PADDING_PX = 12;
const POPOVER_SIDE_OFFSET_PX = 8;
const POPOVER_FALLBACK_WIDTH_PX = 416;
const POPOVER_FALLBACK_HEIGHT_PX = 320;

type OpenPopoverId = "cite" | "doi" | null;

export interface NexafsDatasetDoiCiteControlProps {
  experimentId: string;
  /** Opaque short id for `/d/{id}` citation URLs. */
  atlasDatasetId?: string | null;
  datasetDoi: string | null;
  zenodoRecordUrl: string | null;
  zenodoDepositState: ZenodoDepositUiState;
  moleculeDisplayName: string;
  edgeLabel: string;
  instrumentName: string;
  facilityName: string | null;
  experimentTypeLabel: string | null;
  sourcePublications: ReadonlyArray<NexafsBrowseSourcePublication>;
  /** Ordered creator display names for APA / BibTeX citations. */
  citationCreators?: ReadonlyArray<string>;
  /** Four-digit year for citations; defaults to current UTC year when omitted. */
  citationYear?: number;
  /** Core sample preparation fields included in the BibTeX note. */
  citationSample?: {
    processMethod: string | null;
    substrate: string | null;
    patterningLayer: string | null;
    solvent: string | null;
    thicknessNm: number | null;
    molecularWeightGPerMol: number | null;
    vendorName: string | null;
  } | null;
  className?: string;
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function isInFlightState(state: ZenodoDepositUiState): boolean {
  return state === "pending" || state === "depositing";
}

function stopCardToggle(event: {
  stopPropagation: () => void;
  preventDefault?: () => void;
}): void {
  event.stopPropagation();
}

function clampPopoverCoords(
  triggerRect: DOMRect,
  contentWidth: number,
  contentHeight: number,
): { top: number; left: number } {
  const padding = POPOVER_VIEWPORT_PADDING_PX;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = triggerRect.right - contentWidth;
  left = Math.min(
    Math.max(left, padding),
    Math.max(padding, viewportWidth - contentWidth - padding),
  );

  const belowTop = triggerRect.bottom + POPOVER_SIDE_OFFSET_PX;
  const aboveTop = triggerRect.top - contentHeight - POPOVER_SIDE_OFFSET_PX;
  const fitsBelow = belowTop + contentHeight <= viewportHeight - padding;
  const fitsAbove = aboveTop >= padding;
  let top = fitsBelow || !fitsAbove ? belowTop : aboveTop;
  top = Math.min(
    Math.max(top, padding),
    Math.max(padding, viewportHeight - contentHeight - padding),
  );

  return { top, left };
}

function useCardPressPopoverPosition(
  triggerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;
    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = contentRef.current?.getBoundingClientRect();
    const contentWidth =
      contentRect && contentRect.width > 0
        ? contentRect.width
        : Math.min(POPOVER_FALLBACK_WIDTH_PX, window.innerWidth - 24);
    const contentHeight =
      contentRect && contentRect.height > 0
        ? contentRect.height
        : POPOVER_FALLBACK_HEIGHT_PX;
    setPosition(clampPopoverCoords(triggerRect, contentWidth, contentHeight));
  }, [contentRef, triggerRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

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

  return { position, updatePosition };
}

function CardPressPopover({
  id,
  openId,
  onOpenChange,
  triggerClassName,
  ariaLabel,
  title,
  trigger,
  children,
}: {
  id: Exclude<OpenPopoverId, null>;
  openId: OpenPopoverId;
  onOpenChange: (next: OpenPopoverId) => void;
  triggerClassName?: string;
  ariaLabel: string;
  title?: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const isOpen = openId === id;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { position, updatePosition } = useCardPressPopoverPosition(
    triggerRef,
    contentRef,
    isOpen,
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        triggerRef.current?.contains(target) ||
        contentRef.current?.contains(target)
      ) {
        return;
      }
      onOpenChange(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, children, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={title}
        className={cn(triggerClassName, isOpen && "bg-foreground/5")}
        onPointerDown={stopCardToggle}
        onClick={(event) => {
          stopCardToggle(event);
          onOpenChange(isOpen ? null : id);
        }}
      >
        {trigger}
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="z-tooltip fixed"
              style={{ top: position.top, left: position.left }}
            >
              <div
                ref={contentRef}
                role="dialog"
                aria-label={ariaLabel}
                className={popoverShellClassName}
                onPointerDown={stopCardToggle}
                onClick={stopCardToggle}
              >
                {children}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Renders the Font Awesome Brands Mendeley mark (CC BY 4.0 Fonticons).
 *
 * @param props - Standard SVG element props; `className` sizes the glyph.
 */
function MendeleyMarkIcon(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg viewBox="0 0 640 512" fill="currentColor" aria-hidden {...props}>
      <path d="M624.6 325.2c-12.3-12.4-29.7-19.2-48.4-17.2-43.3-1-49.7-34.9-37.5-98.8 22.8-57.5-14.9-131.5-87.4-130.8-77.4.7-81.7 82-130.9 82-48.1 0-54-81.3-130.9-82-72.9-.8-110.1 73.3-87.4 130.8 12.2 63.9 5.8 97.8-37.5 98.8-21.2-2.3-37 6.5-53 22.5-19.9 19.7-19.3 94.8 42.6 102.6 47.1 5.9 81.6-42.9 61.2-87.8-47.3-103.7 185.9-106.1 146.5-8.2-.1.1-.2.2-.3.4-26.8 42.8 6.8 97.4 58.8 95.2 52.1 2.1 85.4-52.6 58.8-95.2-.1-.2-.2-.3-.3-.4-39.4-97.9 193.8-95.5 146.5 8.2-4.6 10-6.7 21.3-5.7 33 4.9 53.4 68.7 74.1 104.9 35.2 17.8-14.8 23.1-65.6 0-88.3zm-303.9-19.1h-.6c-43.4 0-62.8-37.5-62.8-62.8 0-34.7 28.2-62.8 62.8-62.8h.6c34.7 0 62.8 28.1 62.8 62.8 0 25-19.2 62.8-62.8 62.8z" />
    </svg>
  );
}

function CitationCopyIconButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      isIconOnly
      className={copyIconButtonClassName}
      aria-label={`Copy ${label}`}
      onPress={onPress}
    >
      <Square2StackIcon className="size-3.5" aria-hidden />
    </Button>
  );
}

function openExternalUrl(
  url: string,
  event: {
    stopPropagation: () => void;
    preventDefault: () => void;
  },
): void {
  event.stopPropagation();
  event.preventDefault();
  window.open(url, "_blank", "noopener,noreferrer");
}

const ZOTERO_IMPORT_FRAME_ID = "atlas-zotero-bibtex-import-frame";

/**
 * Imports the Atlas-built BibTeX `@dataset` for this experiment via a hidden
 * iframe so the Zotero Connector can capture authors, note (sample/experiment),
 * DOI, and Atlas citation URL in one pass.
 *
 * @param experimentId - Experiment UUID for the BibTeX route.
 */
function importDatasetWithZoteroConnector(experimentId: string): "bibtex" {
  if (typeof window === "undefined") return "bibtex";
  document.getElementById(ZOTERO_IMPORT_FRAME_ID)?.remove();
  const iframe = document.createElement("iframe");
  iframe.id = ZOTERO_IMPORT_FRAME_ID;
  iframe.title = "Zotero BibTeX import";
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.cssText =
    "position:fixed;width:0;height:0;border:0;clip:rect(0,0,0,0);overflow:hidden";
  iframe.src = `/api/citations/experiments/${encodeURIComponent(experimentId)}/bibtex`;
  document.body.appendChild(iframe);
  window.setTimeout(() => {
    iframe.remove();
  }, 60_000);
  return "bibtex";
}

function ReferenceManagerLinks({
  experimentId,
  datasetDoi,
  onZoteroImport,
}: {
  experimentId: string;
  datasetDoi: string | null;
  onZoteroImport?: (mode: "bibtex") => void;
}): ReactNode {
  const canImportZotero = Boolean(datasetDoi?.trim()) || Boolean(experimentId);
  const mendeleyHref = buildMendeleyImportUrl(datasetDoi);
  return (
    <section className="min-w-0">
      <h3 className={sectionLabelClassName}>Add to library</h3>
      <p className={sectionHintClassName}>
        {canImportZotero
          ? "Zotero imports Atlas BibTeX (authors, notes, DOI, and Atlas URL). Mendeley uses DOI lookup."
          : "Available after the dataset is saved"}
      </p>
      {canImportZotero || mendeleyHref ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {canImportZotero ? (
            <button
              type="button"
              className={referenceManagerLinkClassName}
              onPointerDown={stopCardToggle}
              onClick={(event) => {
                event.stopPropagation();
                const mode = importDatasetWithZoteroConnector(experimentId);
                onZoteroImport?.(mode);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand PNG from /public */}
              <img
                src={ZOTERO_LOGO_SRC}
                alt=""
                width={16}
                height={16}
                className="size-4 shrink-0 rounded-[3px] bg-white object-cover"
                aria-hidden
              />
              Zotero
            </button>
          ) : null}
          {mendeleyHref ? (
            <a
              href={mendeleyHref}
              target="_blank"
              rel="noopener noreferrer"
              className={referenceManagerLinkClassName}
              onPointerDown={stopCardToggle}
              onClick={(event) => {
                openExternalUrl(mendeleyHref, event);
              }}
            >
              <MendeleyMarkIcon className="size-4 shrink-0 text-[#AD0000]" />
              Mendeley
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CitationCopyAccordion({
  id,
  label,
  hint,
  text,
  prose,
  onCopy,
}: {
  id: string;
  label: string;
  hint?: string;
  text: string;
  prose?: boolean;
  onCopy: (text: string, label: string) => void;
}): ReactNode {
  return (
    <Accordion.Item id={id} className="w-full min-w-0">
      <Accordion.Heading className="w-full min-w-0">
        <div className="flex w-full min-w-0 items-center gap-1">
          <Accordion.Trigger className={citeAccordionTriggerClass}>
            <span className="min-w-0 flex-1">
              <span className="block">{label}</span>
              {hint ? (
                <span className={cn(sectionHintClassName, "mt-0 font-normal")}>
                  {hint}
                </span>
              ) : null}
            </span>
            <Accordion.Indicator className={citeAccordionIndicatorClass} />
          </Accordion.Trigger>
          <CitationCopyIconButton
            label={label}
            onPress={() => {
              onCopy(text, label);
            }}
          />
        </div>
      </Accordion.Heading>
      <Accordion.Panel className="w-full min-w-0">
        <Accordion.Body className="pt-0">
          <p className={prose ? sectionProseClassName : sectionBodyClassName}>
            {text}
          </p>
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

/**
 * Renders a single Cite | doi segmented control: citation popover on the left;
 * DOI popover (minted) or mint/retry/busy on the right.
 *
 * @param props - Experiment id, dataset identity, DOI/Zenodo links, and sources.
 */
export function NexafsDatasetDoiCiteControl({
  experimentId,
  atlasDatasetId = null,
  datasetDoi,
  zenodoRecordUrl,
  zenodoDepositState,
  moleculeDisplayName,
  edgeLabel,
  instrumentName,
  facilityName,
  experimentTypeLabel,
  sourcePublications,
  citationCreators = [],
  citationYear,
  citationSample = null,
  className,
}: NexafsDatasetDoiCiteControlProps) {
  const [localDoi, setLocalDoi] = useState(datasetDoi);
  const [localRecordUrl, setLocalRecordUrl] = useState(zenodoRecordUrl);
  const [localState, setLocalState] =
    useState<ZenodoDepositUiState>(zenodoDepositState);
  const [mintingEnabled, setMintingEnabled] = useState<boolean | null>(null);
  const [pollExhausted, setPollExhausted] = useState(false);
  const [openPopover, setOpenPopover] = useState<OpenPopoverId>(null);
  const pollCountRef = useRef(0);
  const lastStatusDataUpdatedAtRef = useRef(0);
  const toastedTerminalRef = useRef<string | null>(null);
  const userInitiatedMintRef = useRef(false);
  const { toasts, removeToast, showToast } = useToast();
  const utils = trpc.useUtils();

  useEffect(() => {
    setLocalDoi(datasetDoi);
    setLocalRecordUrl(zenodoRecordUrl);
    setLocalState(zenodoDepositState);
    setPollExhausted(false);
    setOpenPopover(null);
    pollCountRef.current = 0;
    lastStatusDataUpdatedAtRef.current = 0;
    toastedTerminalRef.current = null;
    userInitiatedMintRef.current = false;
  }, [experimentId, datasetDoi, zenodoRecordUrl, zenodoDepositState]);

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled: Boolean(experimentId) },
  );
  const canMint = canEditQuery.data?.canEdit === true;

  const mintMutation = trpc.experiments.mintZenodoDatasetDoi.useMutation();

  const shouldPollStatus =
    Boolean(experimentId) &&
    !pollExhausted &&
    (mintMutation.isPending || isInFlightState(localState));

  const statusQuery = trpc.experiments.getZenodoDepositStatus.useQuery(
    { experimentId },
    {
      enabled: shouldPollStatus,
      refetchInterval: shouldPollStatus ? 2500 : false,
      staleTime: 0,
    },
  );

  useEffect(() => {
    const data = statusQuery.data;
    if (!data) return;

    const dataUpdatedAt = statusQuery.dataUpdatedAt;
    const isNewFetch = dataUpdatedAt !== lastStatusDataUpdatedAtRef.current;
    if (isNewFetch) {
      lastStatusDataUpdatedAtRef.current = dataUpdatedAt;
      pollCountRef.current += 1;
    }

    setMintingEnabled(data.mintingEnabled);
    if (data.doi) setLocalDoi(data.doi);
    if (data.recordUrl) setLocalRecordUrl(data.recordUrl);

    const coerced = coerceZenodoDepositUiState({
      state: data.state,
      lastAttemptAt: data.lastAttemptAt,
      attemptCount: data.attemptCount,
    });
    setLocalState(coerced);

    if (data.mintingEnabled === false && !data.doi) {
      setPollExhausted(true);
      if (isInFlightState(coerced)) {
        setLocalState(null);
      }
    } else if (
      isNewFetch &&
      isInFlightState(coerced) &&
      pollCountRef.current >= ZENODO_STATUS_MAX_POLLS
    ) {
      setPollExhausted(true);
      setLocalState("failed");
      if (userInitiatedMintRef.current) {
        showToast(
          "Zenodo mint is taking too long. You can retry from the DOI control.",
          "warning",
        );
      }
    } else if (!isInFlightState(coerced)) {
      setPollExhausted(false);
      pollCountRef.current = 0;
    }

    if (mintMutation.isPending) return;

    if (coerced === "published" && data.doi) {
      const key = `published:${data.doi}`;
      if (toastedTerminalRef.current !== key) {
        toastedTerminalRef.current = key;
        void utils.experiments.browseList.invalidate();
        void utils.experiments.browseSearch.invalidate();
        if (userInitiatedMintRef.current) {
          showToast(`Dataset DOI minted: ${data.doi}`, "success");
        }
      }
    } else if (coerced === "failed" && userInitiatedMintRef.current) {
      const key = `failed:${data.error ?? "stale"}`;
      if (toastedTerminalRef.current !== key) {
        toastedTerminalRef.current = key;
        showToast(
          data.error?.trim()
            ? `Zenodo mint failed: ${data.error}`
            : "Zenodo mint failed or stalled",
          "error",
        );
      }
    }
  }, [
    mintMutation.isPending,
    showToast,
    statusQuery.data,
    statusQuery.dataUpdatedAt,
    utils.experiments.browseList,
    utils.experiments.browseSearch,
  ]);

  const mode = resolveZenodoDoiButtonMode({
    datasetDoi: localDoi,
    zenodoRecordUrl: localRecordUrl,
    depositState: localState,
    canMint,
    mintingEnabled,
    isMutating: mintMutation.isPending,
    pollExhausted,
  });

  const atlasCitationUrl = atlasDatasetId?.trim()
    ? `${site.url.replace(/\/$/, "")}${atlasDatasetCitationHref(atlasDatasetId.trim())}`
    : null;

  const citationBundle = buildDatasetCitationBundle({
    moleculeDisplayName,
    edgeLabel,
    instrumentName,
    facilityName,
    experimentTypeLabel,
    datasetDoi: localDoi,
    atlasCitationUrl,
    sourcePublications,
    creators: citationCreators,
    year: citationYear,
    sample: citationSample,
  });

  const normalizedDoi = normalizeDoi(localDoi);
  const recordUrlTrimmed = localRecordUrl?.trim() ?? "";
  const zenodoHref =
    recordUrlTrimmed.length > 0
      ? recordUrlTrimmed
      : normalizedDoi
        ? `https://doi.org/${normalizedDoi}`
        : null;

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      const ok = await copyText(text);
      if (ok) {
        showToast(`${label} copied to clipboard`, "success");
      } else {
        showToast(`Could not copy ${label.toLowerCase()}`, "error");
      }
    },
    [showToast],
  );

  const runMint = useCallback(async () => {
    if (!canMint || mintMutation.isPending) return;
    toastedTerminalRef.current = null;
    userInitiatedMintRef.current = true;
    setPollExhausted(false);
    pollCountRef.current = 0;
    setLocalState("depositing");
    setOpenPopover(null);
    showToast("Minting dataset DOI on Zenodo…", "info");
    try {
      const result = await mintMutation.mutateAsync({ experimentId });
      setMintingEnabled(result.mintingEnabled);
      if (result.doi) setLocalDoi(result.doi);
      if (result.recordUrl) setLocalRecordUrl(result.recordUrl);

      switch (result.state) {
        case "published": {
          setLocalState("published");
          toastedTerminalRef.current = `published:${result.doi ?? ""}`;
          showToast(
            result.doi
              ? `Dataset DOI minted: ${result.doi}`
              : "Dataset DOI published on Zenodo",
            "success",
          );
          void utils.experiments.browseList.invalidate();
          void utils.experiments.browseSearch.invalidate();
          void utils.experiments.getZenodoDepositStatus.invalidate({
            experimentId,
          });
          break;
        }
        case "disabled": {
          setLocalState(null);
          setPollExhausted(true);
          const disabledMessage = result.error?.trim();
          showToast(
            disabledMessage && disabledMessage.length > 0
              ? disabledMessage
              : "Zenodo DOI minting is not configured on this deployment.",
            "warning",
          );
          break;
        }
        case "failed": {
          setLocalState("failed");
          toastedTerminalRef.current = `failed:${result.error ?? "unknown"}`;
          showToast(
            result.error?.trim()
              ? `Zenodo mint failed: ${result.error}`
              : "Zenodo mint failed",
            "error",
          );
          break;
        }
        case "pending":
        case "depositing": {
          setLocalState(result.state);
          showToast("Zenodo deposit still in progress…", "info");
          void utils.experiments.getZenodoDepositStatus.invalidate({
            experimentId,
          });
          break;
        }
        default: {
          const _exhaustive: never = result.state;
          void _exhaustive;
          break;
        }
      }
    } catch (error) {
      setLocalState("failed");
      const message =
        error instanceof Error ? error.message : "Zenodo mint failed";
      showToast(message, "error");
    }
  }, [canMint, experimentId, mintMutation, showToast, utils.experiments]);

  let doiSegment: ReactNode;
  switch (mode.kind) {
    case "link": {
      doiSegment = (
        <CardPressPopover
          id="doi"
          openId={openPopover}
          onOpenChange={setOpenPopover}
          ariaLabel={`Dataset DOI ${mode.doi}`}
          title={`Atlas dataset DOI: ${mode.doi}`}
          triggerClassName={cn(
            doiSegmentClassName,
            doiSegmentMintedClassName,
            "cursor-pointer border-0 bg-transparent shadow-none",
          )}
          trigger={
            <span className={doiWordmarkClassName} aria-hidden>
              doi
            </span>
          }
        >
          <h3 className={sectionLabelClassName}>Zenodo DOI</h3>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <p
              className={cn(
                sectionBodyClassName,
                "mt-0 max-h-none min-w-0 flex-1 overflow-x-auto whitespace-nowrap",
              )}
            >
              {mode.doi}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                className={copyIconButtonClassName}
                aria-label="Copy DOI"
                onPress={() => {
                  void handleCopy(mode.doi, "DOI");
                }}
              >
                <Square2StackIcon className="size-3.5" aria-hidden />
              </Button>
              {zenodoHref ? (
                <a
                  href={zenodoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open on Zenodo"
                  title="Open on Zenodo"
                  className={cn(
                    "bg-accent text-accent-foreground inline-flex h-7 w-7 items-center justify-center rounded-lg",
                    "focus-visible:ring-accent hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none",
                  )}
                >
                  <ArrowTopRightOnSquareIcon
                    className="size-3.5 shrink-0"
                    aria-hidden
                  />
                </a>
              ) : null}
            </div>
          </div>
          {atlasDatasetId?.trim() && atlasCitationUrl ? (
            <div className="mt-3 min-w-0">
              <h4 className={sectionLabelClassName}>Atlas data tag</h4>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <p
                  className={cn(
                    sectionBodyClassName,
                    "mt-0 max-h-none min-w-0 flex-1 overflow-x-auto whitespace-nowrap",
                  )}
                >
                  {atlasCitationUrl.replace(/^https?:\/\//, "")}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  className={copyIconButtonClassName}
                  aria-label="Copy Atlas data tag"
                  onPress={() => {
                    void handleCopy(
                      atlasCitationUrl.replace(/^https?:\/\//, ""),
                      "Atlas data tag",
                    );
                  }}
                >
                  <Square2StackIcon className="size-3.5" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </CardPressPopover>
      );
      break;
    }
    case "busy": {
      doiSegment = (
        <span
          className={cn(doiSegmentClassName, doiSegmentBusyClassName)}
          role="status"
          aria-live="polite"
          aria-label={mode.label}
          title={mode.label}
        >
          <Spinner size="sm" color="accent" className="h-3 w-3" />
        </span>
      );
      break;
    }
    case "mint":
    case "retry": {
      const isRetry = mode.kind === "retry";
      doiSegment = (
        <button
          type="button"
          disabled={!mode.enabled}
          onPointerDown={stopCardToggle}
          onClick={(event) => {
            stopCardToggle(event);
            if (!mode.enabled) return;
            void runMint();
          }}
          className={cn(
            doiSegmentClassName,
            isRetry ? doiSegmentRetryClassName : doiSegmentQuietClassName,
            mode.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50",
          )}
          aria-label={mode.hint}
          title={mode.hint}
        >
          {isRetry ? "Retry" : "Get DOI"}
        </button>
      );
      break;
    }
    default: {
      const _exhaustive: never = mode;
      void _exhaustive;
      doiSegment = null;
      break;
    }
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center", className)}
      onPointerDown={stopCardToggle}
      onClick={stopCardToggle}
      onKeyDown={stopCardToggle}
    >
      <span className={shellClassName} role="group" aria-label="Cite and DOI">
        <CardPressPopover
          id="cite"
          openId={openPopover}
          onOpenChange={setOpenPopover}
          ariaLabel="Cite this dataset"
          triggerClassName={citeSegmentClassName}
          trigger={
            <>
              <Quote
                className={scholarlyIconClassName}
                strokeWidth={1.75}
                aria-hidden
              />
              Cite
            </>
          }
        >
          <div className="space-y-3">
            <ReferenceManagerLinks
              experimentId={experimentId}
              datasetDoi={localDoi}
              onZoteroImport={() => {
                showToast(
                  "Confirm the Zotero import if prompted (authors, notes, DOI, and Atlas URL)",
                  "info",
                );
              }}
            />
            <Accordion
              className={citeAccordionClass}
              hideSeparator
              allowsMultipleExpanded
            >
              <CitationCopyAccordion
                id="bibtex"
                label="BibTeX"
                text={citationBundle.bibtex}
                onCopy={(text, label) => {
                  void handleCopy(text, label);
                }}
              />
              <CitationCopyAccordion
                id="data-availability"
                label="Data availability statement"
                hint="For a manuscript Data Availability section"
                text={citationBundle.dataAvailability}
                prose
                onCopy={(text, label) => {
                  void handleCopy(text, label);
                }}
              />
            </Accordion>
          </div>
        </CardPressPopover>
        <span className={segmentDividerClassName} aria-hidden />
        {doiSegment}
      </span>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </span>
  );
}
