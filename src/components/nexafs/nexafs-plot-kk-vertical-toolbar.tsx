"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { PlayIcon } from "@heroicons/react/24/solid";
import { Button, ProgressBar, Toolbar } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarAttachedToolbarVerticalClass,
  plotToolbarGlyphToggleGroupItemVerticalClass,
  plotToolbarIconToolClass,
  PlotToolbarRichHint,
} from "~/components/plots/toolbars";

/**
 * Portals a compact KK progress card beside the plot rail while browser-side KK runs.
 */
function KkCalculationProgressPortal({
  anchorRef,
  open,
  placement,
  title,
  description,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  placement: "left" | "top" | "bottom";
  title: string;
  description: string;
}) {
  const portalId = useId();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);

  useLayoutEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const host = document.createElement("div");
    host.dataset.kkProgressPortal = portalId;
    document.body.appendChild(host);
    hostRef.current = host;
    rootRef.current = createRoot(host);
    return () => {
      queueMicrotask(() => {
        rootRef.current?.unmount();
        rootRef.current = null;
        host.remove();
        hostRef.current = null;
      });
    };
  }, [portalId]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const anchor = anchorRef.current;
    if (!root || !anchor || typeof document === "undefined") {
      return;
    }

    if (!open) {
      root.render(null);
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const width = 240;
    let left = rect.left - width - 12;
    let top = rect.top + rect.height / 2;

    if (placement === "top") {
      left = rect.left + rect.width / 2 - width / 2;
      top = rect.top - 12;
    } else if (placement === "bottom") {
      left = rect.left + rect.width / 2 - width / 2;
      top = rect.bottom + 12;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - 120));

    root.render(
      <div
        className="border-border bg-surface z-max pointer-events-none fixed isolate rounded-xl border p-3 shadow-lg"
        style={{
          left,
          top: placement === "left" ? top - 48 : top,
          width,
          transform: placement === "left" ? "translateY(-50%)" : undefined,
        }}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted mt-1 text-xs leading-snug">{description}</p>
        <ProgressBar
          isIndeterminate
          aria-label={title}
          className="mt-3 w-full"
          size="sm"
          color="accent"
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>,
    );
  }, [anchorRef, description, open, placement, title]);

  return null;
}

/**
 * Vertical attached toolbar with a two-step **KK** control: expand, then **Run calculation**.
 * Callers own consent, eligibility, loading state, and side effects; this module renders
 * HeroUI chrome consistent with other plot rails and surfaces in-plot progress while {@link busy}.
 */
export interface NexafsPlotKkVerticalToolbarProps {
  /** When false, the toolbar is not rendered (callers hide when KK is impossible or irrelevant). */
  readonly visible: boolean;
  /** When true, disables the KK control (heavy KK work in flight or server mutation pending). */
  readonly busy: boolean;
  /** When true with {@link busy} false, greys out KK and shows {@link whenDisabledDescription}. */
  readonly disabled?: boolean;
  /** Hover copy when {@link disabled} is true and {@link busy} is false. */
  readonly whenDisabledDescription?: string;
  /**
   * Invoked when the user confirms **Run calculation**; should open the session consent dialog
   * when needed, then run the KK pipeline (upload drafts vs persisted experiments are caller-defined).
   */
  readonly onPressKk: () => void;
  /** Rail layout: vertical on the analysis stack, horizontal on the bottom deck. */
  readonly orientation?: "vertical" | "horizontal";
}

export function NexafsPlotKkVerticalToolbar({
  visible,
  busy,
  disabled = false,
  whenDisabledDescription,
  onPressKk,
  orientation = "vertical",
}: NexafsPlotKkVerticalToolbarProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const isHorizontal = orientation === "horizontal";
  const controlDisabled = busy || disabled;
  const disabledHint =
    whenDisabledDescription ??
    "Wait for the current KK calculation or save to finish.";

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  useEffect(() => {
    if (busy) {
      setExpanded(false);
    }
  }, [busy]);

  useEffect(() => {
    if (!expanded || busy) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const anchor = anchorRef.current;
      if (!anchor || anchor.contains(event.target as Node)) {
        return;
      }
      collapse();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [busy, collapse, expanded]);

  const handleKkPress = useCallback(() => {
    if (controlDisabled) {
      return;
    }
    setExpanded((current) => !current);
  }, [controlDisabled]);

  const handleRunPress = useCallback(() => {
    if (controlDisabled) {
      return;
    }
    collapse();
    onPressKk();
  }, [collapse, controlDisabled, onPressKk]);

  if (!visible) {
    return null;
  }

  const progressPlacement = isHorizontal ? "top" : "left";

  return (
    <div ref={anchorRef} className="relative flex shrink-0">
      <Toolbar
        isAttached
        orientation={orientation}
        aria-label="Kramers Kronig delta tools"
        className={
          isHorizontal
            ? plotToolbarAttachedToolbarHorizontalClass
            : plotToolbarAttachedToolbarVerticalClass
        }
      >
        <PlotToolbarRichHint
          title="KK"
          description="Expand to recompute delta from beta in-browser (consent once per session)."
          whenDisabledDescription={disabledHint}
          placement={isHorizontal ? "top" : "left"}
          disabled={controlDisabled}
        >
          <Button
            type="button"
            variant={expanded ? "secondary" : "tertiary"}
            aria-label="Kramers-Kronig delta tools"
            aria-expanded={expanded}
            onPress={handleKkPress}
            isDisabled={controlDisabled}
            className={cn(
              plotToolbarGlyphToggleGroupItemVerticalClass,
              "min-h-9 min-w-0 rounded-full px-2 text-xs font-semibold",
            )}
          >
            KK
          </Button>
        </PlotToolbarRichHint>
        {expanded && !busy ? (
          <PlotToolbarRichHint
            title="Run calculation"
            description="Start the in-browser Kramers-Kronig transform for this spectrum."
            placement={isHorizontal ? "top" : "left"}
          >
            <Button
              type="button"
              variant="primary"
              isIconOnly
              aria-label="Run Kramers-Kronig calculation"
              onPress={handleRunPress}
              className={cn(plotToolbarIconToolClass, "rounded-full")}
            >
              <PlayIcon className="h-4 w-4" aria-hidden />
            </Button>
          </PlotToolbarRichHint>
        ) : null}
      </Toolbar>
      <KkCalculationProgressPortal
        anchorRef={anchorRef}
        open={busy}
        placement={progressPlacement}
        title="Running Kramers-Kronig"
        description="Computing delta from beta in your browser. Large spectra may take a moment."
      />
    </div>
  );
}
