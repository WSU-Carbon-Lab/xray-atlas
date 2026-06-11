"use client";

import { cn } from "@heroui/styles";
import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";

type HeaderMenuIconComponent = ComponentType<{ className?: string }>;

/** Shared outer panel for header navigation dropdowns. */
export const headerDropdownPanelClass =
  "border-border bg-surface absolute top-full z-50 mt-2 rounded-lg border py-1.5 shadow-lg";

/** Inner stack spacing for dropdown menu rows. */
export const headerDropdownInnerClass = "flex flex-col gap-0.5 px-1.5";

const headerMenuRowBaseClass =
  "text-foreground hover:bg-default/50 w-full min-w-0 rounded-md text-left text-sm transition-colors";

const headerMenuTopRowClass = cn(
  headerMenuRowBaseClass,
  "flex min-h-9 items-start gap-2.5 px-3 py-2",
);

const headerMenuNestedGridClass =
  "grid min-h-9 w-full grid-cols-[minmax(0,1fr)_0.875rem] items-center gap-x-2 py-2";

function headerMenuNestedIndentClass(indent: 1 | 2): string {
  return indent === 2 ? "pl-9 pr-3" : "pl-6 pr-3";
}

/**
 * Binds open state and outside-click dismissal for a header dropdown trigger panel.
 */
export function useHeaderDropdown(): {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  close: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return { isOpen, setIsOpen, dropdownRef, close };
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
