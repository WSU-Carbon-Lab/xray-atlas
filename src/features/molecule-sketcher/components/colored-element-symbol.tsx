"use client";

import { cpkHexForElementSymbol } from "~/lib/molecule-svg-cpk-theme";

/** Props for {@link ColoredElementSymbol}. */
export interface ColoredElementSymbolProps {
  /** Element symbol to render (for example `N`, `O`, `Cl`). */
  symbol: string;
  /** When true, use the dark-theme CPK palette. */
  isDark: boolean;
  /** Optional Tailwind class names for the span wrapper. */
  className?: string;
}

/**
 * Renders a single element symbol with CPK coloring consistent with catalog
 * molecule SVG depictions.
 */
export function ColoredElementSymbol({
  symbol,
  isDark,
  className,
}: ColoredElementSymbolProps) {
  return (
    <span
      className={className}
      style={{ color: cpkHexForElementSymbol(symbol, isDark) }}
      aria-hidden
    >
      {symbol}
    </span>
  );
}
