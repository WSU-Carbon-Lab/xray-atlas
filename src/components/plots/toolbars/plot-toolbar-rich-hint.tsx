"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { BUTTON_GROUP_CHILD } from "@heroui/react";

/**
 * Where the portaled hint panel anchors relative to the wrapped control. `top` centers the panel
 * horizontally above the trigger; `left` places it to the trigger's left for right-edge rails.
 */
export type PlotToolbarRichHintPlacement = "top" | "bottom" | "left" | "right";

const CLOSE_DELAY_MS = 100;
const EDGE_GAP_PX = 8;

function readAnchorRect(el: HTMLElement | null) {
  if (!el || typeof document === "undefined") {
    return null;
  }
  return el.getBoundingClientRect();
}

function anchorStyleForPlacement(
  rect: DOMRectReadOnly,
  placement: PlotToolbarRichHintPlacement,
): { left: number; top: number; outerClassName: string } {
  switch (placement) {
    case "bottom":
      return {
        left: rect.left + rect.width / 2,
        top: rect.bottom + EDGE_GAP_PX,
        outerClassName:
          "z-max pointer-events-none fixed isolate -translate-x-1/2",
      };
    case "left":
      return {
        left: rect.left - EDGE_GAP_PX,
        top: rect.top + rect.height / 2,
        outerClassName:
          "z-max pointer-events-none fixed isolate -translate-x-full -translate-y-1/2",
      };
    case "right":
      return {
        left: rect.right + EDGE_GAP_PX,
        top: rect.top + rect.height / 2,
        outerClassName: "z-max pointer-events-none fixed isolate -translate-y-1/2",
      };
    case "top":
    default:
      return {
        left: rect.left + rect.width / 2,
        top: rect.top - EDGE_GAP_PX,
        outerClassName:
          "z-max pointer-events-none fixed isolate -translate-x-1/2 -translate-y-full",
      };
  }
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null && typeof ref === "object") {
        (ref as { current: T | null }).current = value;
      }
    }
  };
}

function chainHandlers<E>(
  ours: (event: E) => void,
  theirs: ((event: E) => void) | undefined,
) {
  return (event: E) => {
    ours(event);
    theirs?.(event);
  };
}

function readTriggerDisabled(
  child: ReactElement,
  disabledOverride: boolean | undefined,
): boolean {
  if (disabledOverride === true) {
    return true;
  }
  const props = child.props as {
    isDisabled?: boolean;
    disabled?: boolean;
  };
  return props.isDisabled === true || props.disabled === true;
}

export interface PlotToolbarRichHintProps {
  title: string;
  description: string;
  whenDisabledDescription?: string;
  disabled?: boolean;
  placement?: PlotToolbarRichHintPlacement;
  children: ReactElement;
  [BUTTON_GROUP_CHILD]?: boolean;
}

/**
 * Wraps one plot-rail control and shows a hover/focus hint in a `document.body` portal at `z-max`.
 * Clones the child (no wrapper element) so HeroUI button groups keep connected segment styling and
 * forwards {@link BUTTON_GROUP_CHILD} to the inner control.
 */
export function PlotToolbarRichHint({
  title,
  description,
  whenDisabledDescription,
  disabled: disabledOverride,
  placement = "top",
  children,
  [BUTTON_GROUP_CHILD]: buttonGroupChild,
}: PlotToolbarRichHintProps) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [anchorBox, setAnchorBox] = useState<{
    left: number;
    top: number;
    outerClassName: string;
  } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDisabled = readTriggerDisabled(children, disabledOverride);
  const hintBody =
    triggerDisabled && whenDisabledDescription
      ? whenDisabledDescription
      : description;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updateAnchor = useCallback(() => {
    const rect = readAnchorRect(anchorRef.current);
    if (!rect) return;
    setAnchorBox(anchorStyleForPlacement(rect, placement));
  }, [placement]);

  const openHint = useCallback(() => {
    updateAnchor();
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer, updateAnchor]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  useLayoutEffect(() => {
    if (!open) return;
    updateAnchor();
  }, [open, placement, updateAnchor]);

  useEffect(() => {
    if (!open) return;
    const handler = () => {
      updateAnchor();
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, updateAnchor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearCloseTimer();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearCloseTimer, open]);

  const childProps = children.props as {
    ref?: Ref<HTMLElement>;
    onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
    onFocus?: (event: FocusEvent<HTMLElement>) => void;
    onBlur?: (event: FocusEvent<HTMLElement>) => void;
  };

  const hintedChild = cloneElement(children, {
    [BUTTON_GROUP_CHILD]: buttonGroupChild,
    ref: mergeRefs(anchorRef, childProps.ref),
    onMouseEnter: chainHandlers(
      (event: MouseEvent<HTMLElement>) => {
        openHint();
        event.stopPropagation();
      },
      childProps.onMouseEnter,
    ),
    onMouseLeave: chainHandlers(scheduleClose, childProps.onMouseLeave),
    onFocus: chainHandlers(openHint, childProps.onFocus),
    onBlur: chainHandlers(
      (event: FocusEvent<HTMLElement>) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !anchorRef.current?.contains(next)) {
          scheduleClose();
        }
      },
      childProps.onBlur,
    ),
  } as Record<string, unknown>);

  const portal: ReactNode =
    open &&
    anchorBox &&
    typeof document !== "undefined"
      ? createPortal(
          <PlotToolbarRichHintPanel
            anchorBox={anchorBox}
            title={title}
            hintBody={hintBody}
            triggerDisabled={triggerDisabled}
            onPointerEnter={openHint}
            onPointerLeave={scheduleClose}
          />,
          document.body,
        )
      : null;

  return (
    <>
      {hintedChild}
      {portal}
    </>
  );
}

function PlotToolbarRichHintPanel({
  anchorBox,
  title,
  hintBody,
  triggerDisabled,
  onPointerEnter,
  onPointerLeave,
}: {
  anchorBox: { left: number; top: number; outerClassName: string };
  title: string;
  hintBody: string;
  triggerDisabled: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  return (
    <div
      className={anchorBox.outerClassName}
      style={{ left: anchorBox.left, top: anchorBox.top }}
    >
      <div
        role="note"
        aria-label={title}
        className="border-border bg-surface pointer-events-auto max-w-xs rounded-xl border px-3 py-2.5 text-left text-xs shadow-xl ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)]"
        onMouseEnter={onPointerEnter}
        onMouseLeave={onPointerLeave}
      >
        <p className="text-foreground font-semibold leading-snug">{title}</p>
        {triggerDisabled ? (
          <p className="text-muted mt-1 text-[0.6875rem] font-semibold uppercase tracking-wide">
            Unavailable
          </p>
        ) : null}
        <p className="mt-1.5 leading-snug text-[var(--text-secondary)]">{hintBody}</p>
      </div>
    </div>
  );
}
