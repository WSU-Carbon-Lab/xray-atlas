"use client";

import { memo } from "react";
import type { ChartThemeColors } from "../config";

export type TraceTooltipRow = {
  label: string;
  value: number | null;
  color: string;
};

type MultiTraceTooltipProps = {
  energy: number;
  rows: TraceTooltipRow[];
  themeColors: ChartThemeColors;
  style?: React.CSSProperties;
};

export const MultiTraceTooltip = memo(function MultiTraceTooltip({
  energy,
  rows,
  themeColors,
  style = {},
}: MultiTraceTooltipProps) {
  return (
    <div
      role="tooltip"
      aria-label={`Energy ${energy.toFixed(3)} eV. ${rows.length} trace(s).`}
      style={{
        backgroundColor: themeColors.hoverBg,
        color: themeColors.hoverText,
        border: `1px solid ${themeColors.legendBorder}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 14,
        fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
        boxShadow:
          "0 4px 14px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
        pointerEvents: "none",
        zIndex: 1000,
        minWidth: 160,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
          paddingBottom: 4,
          borderBottom: `1px solid ${themeColors.legendBorder}`,
        }}
      >
        <span style={{ opacity: 0.85 }}>Energy</span>
        <span
          className="tabular-nums"
          style={{
            fontWeight: 600,
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {energy.toFixed(3)} eV
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: row.color,
                }}
                aria-hidden
              />
              <span style={{ color: themeColors.hoverText }}>{row.label}</span>
            </span>
            <span
              className="tabular-nums"
              style={{
                fontWeight: 600,
                fontFamily: "var(--font-mono), monospace",
                color:
                  row.value !== null
                    ? themeColors.hoverText
                    : themeColors.textSecondary,
              }}
            >
              {row.value !== null ? row.value.toFixed(4) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
