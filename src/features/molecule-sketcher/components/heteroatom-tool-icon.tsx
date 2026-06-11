"use client";

import { useEffect, useState } from "react";
import { cn } from "@heroui/styles";
import { useTheme } from "next-themes";

import { ColoredElementSymbol } from "./colored-element-symbol";

/** Heteroatom symbols shown in the 2x2 grid (N, O, S, F). */
const HETEROATOM_GRID_SYMBOLS = [
  ["N", "O"],
  ["S", "F"],
] as const;

/** Props for {@link HeteroatomGridIcon}. */
export interface HeteroatomGridIconProps {
  /** When true, use the dark-theme CPK palette. Omit to resolve from `next-themes`. */
  isDark?: boolean;
  /**
   * `sm` is a 16x16 grid for draw-lab toolbar controls (matches lucide `size-4`);
   * `xs` is a 22x22 grid for workflow faux-toolbar chips (`h-7`).
   */
  size?: "xs" | "sm";
  /** Optional Tailwind class names merged onto the root grid. */
  className?: string;
}

/**
 * Renders a compact 2x2 heteroatom palette glyph with CPK-colored N, O, S, and F.
 * Shared by the draw-lab Element toolbar control and database-build workflow hints.
 */
export function HeteroatomGridIcon({
  isDark: isDarkProp,
  size = "sm",
  className,
}: HeteroatomGridIconProps) {
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const isDark = isDarkProp ?? (themeMounted && resolvedTheme === "dark");

  const rootClass =
    size === "xs"
      ? "inline-grid size-[22px] shrink-0 grid-cols-2 grid-rows-2 gap-0"
      : "inline-grid size-4 shrink-0 grid-cols-2 grid-rows-2 gap-0 self-center";

  const cellClass =
    size === "xs"
      ? "flex size-3 items-center justify-center overflow-hidden"
      : "flex size-2 items-center justify-center overflow-hidden";

  const symbolClass =
    size === "xs"
      ? "block text-[11px] font-bold leading-none tracking-tighter"
      : "block text-[9px] font-bold leading-none tracking-tighter";

  return (
    <div
      className={cn(rootClass, className)}
      aria-label="Heteroatom"
      role="img"
    >
      {HETEROATOM_GRID_SYMBOLS.flatMap((row, rowIndex) =>
        row.map((symbol, colIndex) => (
          <span key={`${rowIndex}-${colIndex}`} className={cellClass}>
            <ColoredElementSymbol
              symbol={symbol}
              isDark={isDark}
              className={symbolClass}
            />
          </span>
        )),
      )}
    </div>
  );
}

/**
 * Toolbar-sized heteroatom grid icon; alias of {@link HeteroatomGridIcon} at `sm`.
 */
export function HeteroatomToolIcon() {
  return <HeteroatomGridIcon size="sm" />;
}
