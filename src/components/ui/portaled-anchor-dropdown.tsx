"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const HIDDEN_STYLE: CSSProperties = {
  position: "fixed",
  top: -9999,
  left: -9999,
  visibility: "hidden",
};

export interface PortaledAnchorDropdownProps {
  anchorRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  children: ReactNode;
  className?: string;
  gapPx?: number;
  dropdownRef?: RefObject<HTMLDivElement | null>;
}

/**
 * Positions dropdown content in a fixed `document.body` portal aligned to an anchor.
 *
 * Avoids clipping from ancestor `overflow-hidden` (for example the home hero section).
 */
export function PortaledAnchorDropdown({
  anchorRef,
  isOpen,
  children,
  className = "",
  gapPx = 4,
  dropdownRef: externalDropdownRef,
}: PortaledAnchorDropdownProps) {
  const internalDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef = externalDropdownRef ?? internalDropdownRef;
  const [style, setStyle] = useState<CSSProperties>(HIDDEN_STYLE);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown || typeof window === "undefined") {
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
    setStyle({
      position: "fixed",
      top: anchorRect.bottom + gapPx,
      left: anchorRect.left,
      width: anchorRect.width,
      visibility: "visible",
    });
  }, [anchorRef, dropdownRef, gapPx]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setStyle(HIDDEN_STYLE);
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition, children]);

  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  if (typeof document === "undefined" || !isOpen) {
    return null;
  }

  return createPortal(
    <div ref={dropdownRef} className={className} style={style}>
      {children}
    </div>,
    document.body,
  );
}
