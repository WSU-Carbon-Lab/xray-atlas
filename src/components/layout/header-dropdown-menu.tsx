"use client";

import { cn } from "@heroui/styles";
import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import {
  announceHeaderMenu,
  headerMenuCanHover,
  subscribeHeaderMenu,
} from "./header-menu-coordinator";

type HeaderMenuIconComponent = ComponentType<{ className?: string }>;

/** Invisible hover bridge between a header trigger and its panel. */
export const headerDropdownBridgeClass = "absolute top-full z-50 w-max pt-2";

/** Shared surface for header navigation dropdowns. Position it with {@link headerDropdownBridgeClass}. */
export const headerDropdownPanelClass =
  "header-menu-rise border-border/60 bg-background w-max rounded-2xl border px-4 py-3 shadow-xl";

/** Inner stack spacing for dropdown menu rows. */
export const headerDropdownInnerClass = "mt-2 flex flex-col";

const headerMenuRowBaseClass =
  "text-foreground decoration-foreground w-full min-w-0 rounded-md text-left text-sm no-underline underline-offset-4 transition-colors hover:underline";

const headerMenuTopRowClass = cn(
  headerMenuRowBaseClass,
  "flex items-center gap-2 px-4 py-1.5",
);

const headerMenuNestedGridClass =
  "grid w-full grid-cols-[minmax(0,1fr)_0.875rem] items-center gap-x-2 py-1.5";

function headerMenuNestedIndentClass(indent: 1 | 2): string {
  return indent === 2 ? "pl-9 pr-3" : "pl-6 pr-3";
}

const HEADER_MENU_OPEN_DELAY_MS = 0;
const HEADER_MENU_CLOSE_DELAY_MS = 140;
const HEADER_MENU_VIEWPORT_GUTTER_PX = 16;

type HeaderMenuEdge = {
  className: "left-1/2 -translate-x-1/2" | "";
  left: number | null;
};

const headerMenuCenterEdge: HeaderMenuEdge = {
  className: "left-1/2 -translate-x-1/2",
  left: null,
};

/**
 * Centers a header panel under its trigger.
 *
 * The panel's midpoint sits on the trigger's midpoint. When that placement
 * would leave the viewport, the panel shifts only enough to keep a 16px gutter
 * inside the window. Callers put `edgeClassName` and `edgeStyle` on the same
 * node as `panelRef`.
 *
 * @param isOpen - Whether the panel is mounted and should be measured.
 * @param anchorRef - Positioned trigger root. The panel centers on this box.
 */
export function useHeaderMenuInlineEdge<T extends HTMLElement>(
  isOpen: boolean,
  anchorRef: RefObject<T | null>,
): {
  panelRef: RefObject<HTMLDivElement | null>;
  edgeClassName: HeaderMenuEdge["className"];
  edgeStyle: CSSProperties | undefined;
} {
  const panelRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<HeaderMenuEdge>(headerMenuCenterEdge);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) {
      return;
    }

    function place(): void {
      const anchorBox = anchor?.getBoundingClientRect();
      if (!anchorBox || !panel) {
        return;
      }
      const width = panel.offsetWidth;
      const minLeft = HEADER_MENU_VIEWPORT_GUTTER_PX;
      const maxLeft = Math.max(
        minLeft,
        window.innerWidth - HEADER_MENU_VIEWPORT_GUTTER_PX - width,
      );
      const pageLeft = anchorBox.left + anchorBox.width / 2 - width / 2;
      if (pageLeft >= minLeft && pageLeft <= maxLeft) {
        setEdge((current) =>
          current.className === headerMenuCenterEdge.className
            ? current
            : headerMenuCenterEdge,
        );
        return;
      }
      const left =
        Math.min(Math.max(pageLeft, minLeft), maxLeft) - anchorBox.left;
      setEdge((current) =>
        current.className === "" && current.left === left
          ? current
          : { className: "", left },
      );
    }

    place();
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
    };
  }, [anchorRef, isOpen]);

  return {
    panelRef,
    edgeClassName: edge.className,
    edgeStyle: edge.left === null ? undefined : { left: edge.left },
  };
}

/**
 * Binds open state, hover, and outside-click dismissal for a header dropdown.
 *
 * On a fine pointer the menu opens as soon as the pointer enters and stays open
 * while the pointer is on the trigger or the panel. Touch toggles on click.
 * Opening this menu closes any other header menu.
 *
 * @param menuId - Stable id used to coordinate with the other header menus.
 */
export function useHeaderDropdown(menuId: string): {
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  close: () => void;
  rootProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  triggerProps: {
    onClick: () => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  };
} {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimers();
    setIsOpen(false);
  }, [clearTimers]);

  const open = useCallback(() => {
    clearTimers();
    announceHeaderMenu(menuId);
    setIsOpen(true);
  }, [clearTimers, menuId]);

  useEffect(() => subscribeHeaderMenu(menuId, close), [close, menuId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const rootProps = {
    onMouseEnter: () => {
      if (!headerMenuCanHover()) {
        return;
      }
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      if (isOpen) {
        return;
      }
      openTimer.current = window.setTimeout(open, HEADER_MENU_OPEN_DELAY_MS);
    },
    onMouseLeave: () => {
      if (!headerMenuCanHover()) {
        return;
      }
      if (openTimer.current !== null) {
        window.clearTimeout(openTimer.current);
        openTimer.current = null;
      }
      closeTimer.current = window.setTimeout(close, HEADER_MENU_CLOSE_DELAY_MS);
    },
  };

  const triggerProps = {
    onClick: () => {
      if (headerMenuCanHover()) {
        open();
        return;
      }
      if (isOpen) {
        close();
        return;
      }
      open();
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        open();
      }
      if (event.key === "Escape") {
        close();
      }
    },
  };

  return { isOpen, dropdownRef, close, rootProps, triggerProps };
}

function HeaderMenuLeadingIcon({
  icon: Icon,
}: {
  icon: HeaderMenuIconComponent;
}): ReactElement {
  return <Icon className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />;
}

/**
 * Renders a top-level header dropdown row with optional leading icon and trailing chevron.
 */
export function HeaderMenuButton({
  icon,
  label,
  onClick,
  chevronOpen,
  fontMedium,
  className,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
}: {
  icon?: HeaderMenuIconComponent;
  label: ReactNode;
  onClick: () => void;
  chevronOpen?: boolean;
  fontMedium?: boolean;
  className?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      className={cn(
        headerMenuTopRowClass,
        fontMedium && "font-medium",
        className,
      )}
    >
      {icon ? <HeaderMenuLeadingIcon icon={icon} /> : null}
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      {chevronOpen !== undefined ? (
        <ChevronDown
          className={cn(
            "text-muted mt-0.5 size-3.5 shrink-0 transition-transform",
            chevronOpen && "rotate-180",
          )}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

/**
 * Nested wiki link row with the same footprint as {@link HeaderMenuNestedToggle}.
 */
export function HeaderMenuNestedLink({
  label,
  onClick,
  indent = 1,
}: {
  label: ReactNode;
  onClick: () => void;
  indent?: 1 | 2;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        headerMenuRowBaseClass,
        headerMenuNestedGridClass,
        headerMenuNestedIndentClass(indent),
      )}
    >
      <span className="min-w-0 leading-snug">{label}</span>
      <span aria-hidden className="size-3.5 shrink-0" />
    </button>
  );
}

/**
 * Column heading + stacked links for multi-column header mega-menus.
 */
export function HeaderMenuColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-muted px-4 pt-1 pb-1 text-[0.65rem] font-medium tracking-[0.16em] uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

/**
 * Nested wiki disclosure toggle; shares grid, padding, and hover bounds with nested links.
 */
export function HeaderMenuNestedToggle({
  label,
  onClick,
  indent = 1,
  isOpen,
  "aria-controls": ariaControls,
}: {
  label: ReactNode;
  onClick: () => void;
  indent?: 1 | 2;
  isOpen: boolean;
  "aria-controls": string;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-controls={ariaControls}
      aria-expanded={isOpen}
      className={cn(
        headerMenuRowBaseClass,
        headerMenuNestedGridClass,
        headerMenuNestedIndentClass(indent),
      )}
    >
      <span className="min-w-0 leading-snug">{label}</span>
      <ChevronDown
        className={cn(
          "text-muted size-3.5 shrink-0 transition-transform",
          isOpen && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}

/**
 * Indented disclosure block used for nested wiki groups inside the About menu.
 */
export function HeaderMenuNestedGroup({
  id,
  label,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  label: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="flex w-full min-w-0 flex-col gap-0.5">
      <HeaderMenuNestedToggle
        aria-controls={id}
        isOpen={isOpen}
        label={label}
        onClick={onToggle}
      />
      {isOpen ? (
        <div id={id} className="flex w-full min-w-0 flex-col gap-0.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}
