"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

export type PopoverOffset = {
  dx: number;
  dy: number;
};

/**
 * Free-floating HTML popover anchored at a base (x, y) in overlay CSS pixels
 * and offset by a user-draggable `(dx, dy)`. The offset is controlled by the
 * caller so the owning component can persist the popover position across pin
 * selection or axis-drag events without the popover snapping back to the
 * anchor.
 *
 * The component stops pointer-down propagation on its container so interactions
 * inside the popover do not fall through to the plot's pan / zoom / click
 * handlers. The header provides the drag grip; all other areas are
 * interactive.
 *
 * Parameters
 * ----------
 * anchorXCss, anchorYCss : number
 *     Position in overlay CSS space where the popover "wants" to be before
 *     the user starts dragging.
 * offset : PopoverOffset
 *     Current delta from the anchor. Controlled by the parent so dragging is
 *     a pure state update and the axis anchor can move independently.
 * onOffsetChange : (next: PopoverOffset) => void
 *     Called during drag with the new offset.
 * onFocus : (() => void) | undefined
 *     Called on pointer-down anywhere in the popover to raise z-index (e.g.
 *     select the underlying pin).
 * onClose : () => void
 *     Closes the popover.
 * title : ReactNode
 *     Rendered in the header next to the drag grip.
 * zIndex : number
 *     CSS z-index; typically elevated for the selected popover.
 * children : ReactNode
 *     Popover body.
 * collapsed : boolean
 *     When true, only the header row is shown; body is hidden.
 * onCollapsedChange : (collapsed: boolean) => void
 *     Toggles collapse from the chevron control in the header.
 */
export function DraggablePlotPopover({
  anchorXCss,
  anchorYCss,
  offset,
  onOffsetChange,
  onFocus,
  onClose,
  title,
  zIndex,
  children,
  collapsed,
  onCollapsedChange,
}: {
  anchorXCss: number;
  anchorYCss: number;
  offset: PopoverOffset;
  onOffsetChange: (next: PopoverOffset) => void;
  onFocus?: () => void;
  onClose: () => void;
  title: ReactNode;
  zIndex: number;
  children: ReactNode;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 200, h: 100 });
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    dx: number;
    dy: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      setSize({ w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleHeaderPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      onFocus?.();
      dragStartRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        dx: offset.dx,
        dy: offset.dy,
      };
      (event.currentTarget as HTMLDivElement).setPointerCapture?.(
        event.pointerId,
      );
    },
    [offset.dx, offset.dy, onFocus],
  );

  const handleHeaderPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start) return;
      event.preventDefault();
      const nextDx = start.dx + (event.clientX - start.clientX);
      const nextDy = start.dy + (event.clientY - start.clientY);
      onOffsetChange({ dx: nextDx, dy: nextDy });
    },
    [onOffsetChange],
  );

  const handleHeaderPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStartRef.current) return;
      (event.currentTarget as HTMLDivElement).releasePointerCapture?.(
        event.pointerId,
      );
      dragStartRef.current = null;
    },
    [],
  );

  const stopPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const leftPx = anchorXCss + offset.dx - size.w / 2;
  const topPx = anchorYCss + offset.dy;

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute select-none rounded-md border border-[color-mix(in_oklab,var(--chart-grid-strong)_55%,transparent)] bg-[color-mix(in_oklab,var(--chart-paper)_98%,transparent)] text-[var(--chart-text)] shadow-lg"
      style={{
        left: leftPx,
        top: topPx,
        zIndex,
        minWidth: collapsed ? 160 : 208,
      }}
      onPointerDown={(event) => {
        onFocus?.();
        event.stopPropagation();
      }}
      onWheel={stopPropagation}
      onContextMenu={stopPropagation}
    >
      <div
        className={
          collapsed
            ? "flex cursor-grab items-center gap-1.5 rounded-md bg-[color-mix(in_oklab,var(--chart-background)_80%,transparent)] px-2 py-1 active:cursor-grabbing"
            : "flex cursor-grab items-center gap-1.5 rounded-t-md border-b border-[color-mix(in_oklab,var(--chart-grid-strong)_55%,transparent)] bg-[color-mix(in_oklab,var(--chart-background)_80%,transparent)] px-2 py-1 active:cursor-grabbing"
        }
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        style={{ touchAction: "none" }}
      >
        <span
          className="flex h-3 w-3 shrink-0 flex-col justify-between"
          aria-hidden
        >
          <span className="h-0.5 w-full rounded bg-[var(--chart-text-secondary)] opacity-60" />
          <span className="h-0.5 w-full rounded bg-[var(--chart-text-secondary)] opacity-60" />
          <span className="h-0.5 w-full rounded bg-[var(--chart-text-secondary)] opacity-60" />
        </span>
        <div className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-tight">
          {title}
        </div>
        <button
          type="button"
          className="rounded p-0.5 text-[var(--chart-text-secondary)] transition-colors hover:bg-[color-mix(in_oklab,var(--chart-grid-strong)_25%,transparent)] hover:text-[var(--chart-text)]"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand pin details" : "Collapse pin details"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onCollapsedChange(!collapsed);
          }}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="rounded p-0.5 text-[var(--chart-text-secondary)] transition-colors hover:bg-[color-mix(in_oklab,var(--chart-grid-strong)_25%,transparent)] hover:text-[var(--chart-text)]"
          aria-label="Close pinned inspect point"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      </div>
      {!collapsed ? (
        <div className="px-2 py-1.5 text-[11px] leading-tight">{children}</div>
      ) : null}
    </div>
  );
}
