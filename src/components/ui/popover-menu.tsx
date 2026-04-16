"use client";

import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

type TriggerButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
>;

export interface PopoverMenuRenderProps {
  close: () => void;
  contentProps: PopoverMenuContentProps;
  contentPositionClassName: string;
  contentId: string;
  isOpen: boolean;
  open: () => void;
  toggle: () => void;
  triggerProps: TriggerButtonProps;
}

export interface PopoverMenuProps {
  align?: "start" | "end";
  contentClassName?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  renderContent: (props: PopoverMenuRenderProps) => ReactNode;
  renderTrigger: (props: PopoverMenuRenderProps) => ReactNode;
  rootClassName?: string;
  sideOffsetClassName?: string;
}

export function PopoverMenu({
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onOpenChange,
  align = "end",
  contentClassName = "",
  renderContent,
  renderTrigger,
  rootClassName = "relative",
  sideOffsetClassName = "mt-2",
}: PopoverMenuProps) {
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (rootRef.current?.contains(target)) {
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
  }, [close, isOpen]);

  const alignmentClassName = align === "start" ? "left-0" : "right-0";

  const triggerProps: TriggerButtonProps = {
    "aria-controls": isOpen ? contentId : undefined,
    "aria-expanded": isOpen,
    "aria-haspopup": "dialog",
    onClick: toggle,
    type: "button",
  };

  const contentPositionClassName = `absolute top-full z-[650] ${alignmentClassName} ${sideOffsetClassName} ${contentClassName}`;
  const contentProps: PopoverMenuContentProps = { id: contentId };

  const renderProps: PopoverMenuRenderProps = {
    close,
    contentProps,
    contentPositionClassName,
    contentId,
    isOpen,
    open,
    toggle,
    triggerProps,
  };

  return (
    <div ref={rootRef} className={rootClassName}>
      {renderTrigger(renderProps)}
      {isOpen ? renderContent(renderProps) : null}
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
