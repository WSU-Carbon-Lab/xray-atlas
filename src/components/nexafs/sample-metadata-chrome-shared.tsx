"use client";

import type { ReactNode } from "react";

/** Shared inset group surface used by sample metadata read and edit panels. */
export const sampleMetadataInsetGroupClass =
  "border-border/50 bg-surface-2/40 divide-border/40 overflow-hidden rounded-2xl border shadow-sm divide-y backdrop-blur-sm";

/**
 * Renders a small uppercase section caption aligned with grouped inset lists.
 */
export function SampleMetadataSectionCaption({
  title,
  trailing,
  hint,
}: {
  title: string;
  trailing?: string;
  hint?: string;
}) {
  return (
    <div className="mb-2 px-1">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-muted text-[11px] font-medium tracking-[0.08em] uppercase">
          {title}
        </h4>
        {trailing ? (
          <span className="text-muted/80 text-[11px] tabular-nums">{trailing}</span>
        ) : null}
      </div>
      {hint ? (
        <p className="text-muted/80 mt-1 text-xs leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Wraps form or read rows in the shared inset grouped list container.
 */
export function SampleMetadataInsetGroup({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className={sampleMetadataInsetGroupClass} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
