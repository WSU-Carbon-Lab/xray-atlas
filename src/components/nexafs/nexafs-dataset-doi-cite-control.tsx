"use client";

/**
 * Compact Atlas dataset Cite | doi segmented control for browse card action rows.
 *
 * One horizontal scholarly unit in the trailing cluster (before To molecule):
 * Cite opens a popover with in-text (plus prose example), data-availability,
 * BibTeX, full-reference copy actions, and Zotero / Mendeley deep links when a
 * DOI exists;
 * doi opens Copy DOI / Go to Zenodo when minted, or mints / retries when not.
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
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowTopRightOnSquareIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import { Quote } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import { site } from "~/app/brand";
import { trpc } from "~/trpc/client";
import { ToastContainer, useToast } from "~/components/ui/toast";
import {
  buildDatasetCitationBundle,
  buildMendeleyImportUrl,
  buildZoteroSaveUrl,
} from "~/lib/dataset-citation";
import { normalizeDoi } from "~/lib/doi";
import {
  coerceZenodoDepositUiState,
  resolveZenodoDoiButtonMode,
  ZENODO_STATUS_MAX_POLLS,
  type ZenodoDepositUiState,
} from "~/lib/zenodo-doi-button-mode";
import type { NexafsBrowseSourcePublication } from "~/types/nexafs-browse";

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
  "text-text-secondary hover:text-foreground inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-foreground/[0.03] px-2.5 text-[11px] font-medium hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const POPOVER_VIEWPORT_PADDING_PX = 12;
const POPOVER_SIDE_OFFSET_PX = 8;
const POPOVER_FALLBACK_WIDTH_PX = 416;
const POPOVER_FALLBACK_HEIGHT_PX = 420;

type OpenPopoverId = "cite" | "doi" | null;

export interface NexafsDatasetDoiCiteControlProps {
  experimentId: string;
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

function CitationCopySection({
  label,
  text,
  onCopy,
  hint,
  prose,
}: {
  label: string;
  text: string;
  onCopy: (text: string, label: string) => void;
  hint?: string;
  /** When true, render body as readable prose instead of monospace. */
  prose?: boolean;
}) {
  return (
    <section className="min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={sectionLabelClassName}>{label}</h3>
          {hint ? <p className={sectionHintClassName}>{hint}</p> : null}
        </div>
        <CitationCopyIconButton
          label={label}
          onPress={() => {
            onCopy(text, label);
          }}
        />
      </div>
      <p className={prose ? sectionProseClassName : sectionBodyClassName}>
        {text}
      </p>
    </section>
  );
}

function ReferenceManagerLinks({
  datasetDoi,
}: {
  datasetDoi: string | null;
}): ReactNode {
  const zoteroHref = buildZoteroSaveUrl(datasetDoi);
  const mendeleyHref = buildMendeleyImportUrl(datasetDoi);
  return (
    <section className="min-w-0">
      <h4 className={sectionLabelClassName}>Add to library</h4>
      <p className={sectionHintClassName}>
        {zoteroHref
          ? "Opens Zotero or Mendeley with this dataset DOI"
          : "Available after a dataset DOI is minted"}
      </p>
      {zoteroHref && mendeleyHref ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a
            href={zoteroHref}
            target="_blank"
            rel="noopener noreferrer"
            className={referenceManagerLinkClassName}
            onPointerDown={stopCardToggle}
            onClick={stopCardToggle}
          >
            <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" aria-hidden />
            Zotero
          </a>
          <a
            href={mendeleyHref}
            target="_blank"
            rel="noopener noreferrer"
            className={referenceManagerLinkClassName}
            onPointerDown={stopCardToggle}
            onClick={stopCardToggle}
          >
            <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" aria-hidden />
            Mendeley
          </a>
        </div>
      ) : null}
    </section>
  );
}

function InTextCitationSection({
  inText,
  inTextExample,
  onCopy,
}: {
  inText: string;
  inTextExample: string;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <section className="min-w-0 space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className={sectionLabelClassName}>In-text citation</h3>
          <CitationCopyIconButton
            label="In-text citation"
            onPress={() => {
              onCopy(inText, "In-text citation");
            }}
          />
        </div>
        <p className={sectionBodyClassName}>{inText}</p>
      </div>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className={sectionLabelClassName}>Example in prose</h4>
            <p className={sectionHintClassName}>
              How you might mention an {site.name} dataset in a manuscript
            </p>
          </div>
          <CitationCopyIconButton
            label="example citation sentence"
            onPress={() => {
              onCopy(inTextExample, "Example citation sentence");
            }}
          />
        </div>
        <p className={sectionProseClassName}>{inTextExample}</p>
      </div>
    </section>
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

  const citationBundle = buildDatasetCitationBundle({
    moleculeDisplayName,
    edgeLabel,
    instrumentName,
    facilityName,
    experimentTypeLabel,
    datasetDoi: localDoi,
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
          <h3 className="text-foreground text-sm font-semibold tracking-tight">
            Dataset DOI
          </h3>
          <p className={sectionHintClassName}>
            {site.name} dataset DOI minted via Zenodo
          </p>
          <p className={sectionBodyClassName}>{mode.doi}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                className={cn(
                  "bg-accent text-accent-foreground inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium",
                  "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                )}
              >
                <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" aria-hidden />
                Go to Zenodo
              </a>
            ) : null}
          </div>
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
          <header className="mb-4 border-b border-border/60 pb-3">
            <h3 className="text-foreground text-sm font-semibold tracking-tight">
              Cite this dataset
            </h3>
            <p className={sectionHintClassName}>
              {site.name} NEXAFS dataset; DOI minted via Zenodo
            </p>
          </header>
          <div className="space-y-4">
            <InTextCitationSection
              inText={citationBundle.inText}
              inTextExample={citationBundle.inTextExample}
              onCopy={(text, label) => {
                void handleCopy(text, label);
              }}
            />
            <CitationCopySection
              label="Data availability"
              hint="For a manuscript Data Availability section"
              text={citationBundle.dataAvailability}
              prose
              onCopy={(text, label) => {
                void handleCopy(text, label);
              }}
            />
            <CitationCopySection
              label="BibTeX"
              text={citationBundle.bibtex}
              onCopy={(text, label) => {
                void handleCopy(text, label);
              }}
            />
            <CitationCopySection
              label="Full reference"
              text={citationBundle.reference}
              prose
              onCopy={(text, label) => {
                void handleCopy(text, label);
              }}
            />
            <ReferenceManagerLinks datasetDoi={datasetDoi} />
          </div>
        </CardPressPopover>
        <span className={segmentDividerClassName} aria-hidden />
        {doiSegment}
      </span>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </span>
  );
}
