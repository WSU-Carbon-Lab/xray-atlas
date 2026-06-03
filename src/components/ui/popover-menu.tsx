"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

type TriggerButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "ref"
> & {
  ref?: Ref<HTMLButtonElement>;
};

const DEFAULT_COLLISION_PADDING_PX = 8;
const DEFAULT_SIDE_OFFSET_PX = 8;

/** Viewport-aware anchor for portaled menu panels. `auto` picks start vs end from trigger geometry. */
export type PopoverMenuPlacement =
  | "auto"
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end";

type PopoverMenuResolvedPlacement = Exclude<PopoverMenuPlacement, "auto">;

export interface PopoverMenuRenderProps {
  close: () => void;
  contentProps: PopoverMenuContentProps;
  contentPositionClassName: string;
  contentStyle: CSSProperties;
  contentId: string;
  isOpen: boolean;
  open: () => void;
  toggle: () => void;
  triggerProps: TriggerButtonProps;
}

export interface PopoverMenuProps {
  align?: "start" | "end";
  collisionPadding?: number;
  contentClassName?: string;
  defaultOpen?: boolean;
  /**
   * When set, pointer-down on a matching element (including portaled overlays) does
   * not dismiss the menu. Use for nested ComboBox/Select popovers inside menu content.
   */
  ignoreOutsidePointerDownSelector?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  placement?: PopoverMenuPlacement;
  renderContent: (props: PopoverMenuRenderProps) => ReactNode;
  renderTrigger: (props: PopoverMenuRenderProps) => ReactNode;
  rootClassName?: string;
  /** Legacy spacing class; portaled positioning uses {@link DEFAULT_SIDE_OFFSET_PX} instead of margin utilities. */
  sideOffsetClassName?: string;
}

function placementFromAlign(align: "start" | "end"): PopoverMenuResolvedPlacement {
  return align === "start" ? "bottom-start" : "bottom-end";
}

function flipVertical(
  placement: PopoverMenuResolvedPlacement,
): PopoverMenuResolvedPlacement {
  if (placement.startsWith("bottom")) {
    return placement.replace("bottom", "top") as PopoverMenuResolvedPlacement;
  }
  return placement.replace("top", "bottom") as PopoverMenuResolvedPlacement;
}

function resolveAutoPlacement(
  triggerRect: DOMRect,
  contentWidth: number,
  padding: number,
): PopoverMenuResolvedPlacement {
  const viewportWidth = window.innerWidth;
  const startLeft = triggerRect.left;
  const endLeft = triggerRect.right - contentWidth;
  const overflowStart = startLeft + contentWidth > viewportWidth - padding;
  const overflowEnd = endLeft < padding;

  if (overflowStart && !overflowEnd) {
    return "bottom-end";
  }
  if (overflowEnd && !overflowStart) {
    return "bottom-start";
  }

  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  return triggerCenter > viewportWidth / 2 ? "bottom-end" : "bottom-start";
}

function rawCoordsForPlacement(
  placement: PopoverMenuResolvedPlacement,
  triggerRect: DOMRect,
  contentWidth: number,
  contentHeight: number,
  sideOffsetPx: number,
): { top: number; left: number } {
  switch (placement) {
    case "bottom-end":
      return {
        top: triggerRect.bottom + sideOffsetPx,
        left: triggerRect.right - contentWidth,
      };
    case "top-start":
      return {
        top: triggerRect.top - sideOffsetPx - contentHeight,
        left: triggerRect.left,
      };
    case "top-end":
      return {
        top: triggerRect.top - sideOffsetPx - contentHeight,
        left: triggerRect.right - contentWidth,
      };
    case "bottom-start":
    default:
      return {
        top: triggerRect.bottom + sideOffsetPx,
        left: triggerRect.left,
      };
  }
}

function clampToViewport(
  top: number,
  left: number,
  contentWidth: number,
  contentHeight: number,
  padding: number,
): { top: number; left: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = Math.max(padding, viewportWidth - contentWidth - padding);
  const maxTop = Math.max(padding, viewportHeight - contentHeight - padding);
  return {
    left: Math.min(Math.max(left, padding), maxLeft),
    top: Math.min(Math.max(top, padding), maxTop),
  };
}

function fitsViewport(
  top: number,
  left: number,
  contentWidth: number,
  contentHeight: number,
  padding: number,
): boolean {
  return (
    left >= padding &&
    top >= padding &&
    left + contentWidth <= window.innerWidth - padding &&
    top + contentHeight <= window.innerHeight - padding
  );
}

function computePopoverMenuPosition({
  triggerRect,
  contentWidth,
  contentHeight,
  placement,
  align,
  padding,
  sideOffsetPx,
}: {
  triggerRect: DOMRect;
  contentWidth: number;
  contentHeight: number;
  placement: PopoverMenuPlacement | undefined;
  align: "start" | "end";
  padding: number;
  sideOffsetPx: number;
}): { top: number; left: number } {
  const preferred: PopoverMenuResolvedPlacement =
    placement === "auto"
      ? resolveAutoPlacement(triggerRect, contentWidth, padding)
      : placement ?? placementFromAlign(align);

  const candidates: PopoverMenuResolvedPlacement[] = [
    preferred,
    flipVertical(preferred),
  ];

  for (const candidate of candidates) {
    const raw = rawCoordsForPlacement(
      candidate,
      triggerRect,
      contentWidth,
      contentHeight,
      sideOffsetPx,
    );
    const clamped = clampToViewport(
      raw.top,
      raw.left,
      contentWidth,
      contentHeight,
      padding,
    );
    if (
      fitsViewport(
        clamped.top,
        clamped.left,
        contentWidth,
        contentHeight,
        padding,
      )
    ) {
      return clamped;
    }
  }

  const fallback = rawCoordsForPlacement(
    preferred,
    triggerRect,
    contentWidth,
    contentHeight,
    sideOffsetPx,
  );
  return clampToViewport(
    fallback.top,
    fallback.left,
    contentWidth,
    contentHeight,
    padding,
  );
}

function mergeTriggerRef(
  triggerRef: MutableRefObject<HTMLElement | null>,
  forwardedRef: Ref<HTMLButtonElement> | undefined,
) {
  return (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef && typeof forwardedRef === "object") {
      forwardedRef.current = node;
    }
  };
}

export function PopoverMenu({
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onOpenChange,
  align = "end",
  placement,
  collisionPadding = DEFAULT_COLLISION_PADDING_PX,
  contentClassName = "",
  ignoreOutsidePointerDownSelector,
  renderContent,
  renderTrigger,
  rootClassName = "relative",
  sideOffsetClassName: _sideOffsetClassName = "mt-2",
}: PopoverMenuProps) {
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const [contentStyle, setContentStyle] = useState<CSSProperties>({
    position: "fixed",
    top: -9999,
    left: -9999,
    visibility: "hidden",
  });
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  const setIsOpen = useCallback(
    (nextIsOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledIsOpen(nextIsOpen);
      }
      onOpenChange?.(nextIsOpen);
    },
    [isControlled, onOpenChange],
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const toggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  const updateContentPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const contentEl = contentRef.current;
    if (!triggerEl || !contentEl || typeof window === "undefined") {
      return;
    }
    const triggerRect = triggerEl.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();
    const contentWidth = contentRect.width;
    const contentHeight = contentRect.height;
    if (contentWidth <= 0 || contentHeight <= 0) {
      return;
    }
    const { top, left } = computePopoverMenuPosition({
      triggerRect,
      contentWidth,
      contentHeight,
      placement,
      align,
      padding: collisionPadding,
      sideOffsetPx: DEFAULT_SIDE_OFFSET_PX,
    });
    setContentStyle({
      position: "fixed",
      top,
      left,
      visibility: "visible",
    });
  }, [align, collisionPadding, placement]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setContentStyle({
        position: "fixed",
        top: -9999,
        left: -9999,
        visibility: "hidden",
      });
      return;
    }
    updateContentPosition();
  }, [isOpen, updateContentPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleReposition = () => {
      updateContentPosition();
    };
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updateContentPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        rootRef.current?.contains(target) ||
        triggerRef.current?.contains(target) ||
        contentRef.current?.contains(target)
      ) {
        return;
      }
      if (
        ignoreOutsidePointerDownSelector &&
        target instanceof Element &&
        target.closest(ignoreOutsidePointerDownSelector)
      ) {
        return;
      }
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, ignoreOutsidePointerDownSelector, isOpen]);

  const triggerProps: TriggerButtonProps = {
    "aria-controls": isOpen ? contentId : undefined,
    "aria-expanded": isOpen,
    "aria-haspopup": "dialog",
    onClick: toggle,
    type: "button",
    ref: mergeTriggerRef(triggerRef, undefined),
  };

  const contentPositionClassName = contentClassName.trim();
  const contentProps: PopoverMenuContentProps = { id: contentId };

  const renderProps: PopoverMenuRenderProps = {
    close,
    contentProps,
    contentPositionClassName,
    contentStyle,
    contentId,
    isOpen,
    open,
    toggle,
    triggerProps,
  };

  const portaledContent =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={contentRef}
            style={contentStyle}
            className="z-[650]"
          >
            {renderContent(renderProps)}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={rootClassName}>
      {renderTrigger(renderProps)}
      {portaledContent}
    </div>
  );
}

export type PopoverMenuContentProps = HTMLAttributes<HTMLDivElement>;

export const PopoverMenuContent = forwardRef<
  HTMLDivElement,
  PopoverMenuContentProps
>(function PopoverMenuContent({ children, className = "", ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={`border-border bg-surface overflow-hidden rounded-xl border shadow-xl ${className}`}
    >
      {children}
    </div>
  );
});
