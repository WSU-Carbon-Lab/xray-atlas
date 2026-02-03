/**
 * Tooltip system for visx visualization
 * Enhanced with crosshair indicator and improved formatting
 */

import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { THEME_COLORS } from "../../core/constants";

export type TooltipData = {
  energy: number;
  intensity: number;
  label?: string;
};

/**
 * Hook for managing tooltip state with portal support
 */
export function useSpectrumTooltip() {
  const tooltip = useTooltip<TooltipData>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  return {
    ...tooltip,
    TooltipInPortal,
    containerRef,
  };
}

export function VisxTooltip({
  tooltipData,
  tooltipLeft,
  tooltipTop,
  tooltipX,
  tooltipY,
  isDark,
  TooltipInPortal,
  plotDimensions,
  scales,
}: {
  tooltipData: TooltipData | null;
  tooltipLeft: number;
  tooltipTop: number;
  tooltipX?: number;
  tooltipY?: number;
  isDark: boolean;
  TooltipInPortal: React.ComponentType<
    React.PropsWithChildren<{
      left: number;
      top: number;
      style?: React.CSSProperties;
      offsetLeft?: number;
      offsetTop?: number;
    }>
  >;
  plotDimensions?: {
    width: number;
    height: number;
    margins: { top: number; right: number; bottom: number; left: number };
  };
  scales?: {
    xScale: (value: number) => number;
    yScale: (value: number) => number;
  };
}) {
  if (!tooltipData) return null;

  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  // Calculate crosshair position in plot coordinates
  const _crosshairX =
    tooltipX !== undefined && scales && plotDimensions
      ? scales.xScale(tooltipData.energy) + plotDimensions.margins.left
      : undefined;
  const _crosshairY =
    tooltipY !== undefined && scales && plotDimensions
      ? scales.yScale(tooltipData.intensity) + plotDimensions.margins.top
      : undefined;

  return (
    <>
      {/* Tooltip */}
      <TooltipInPortal
        left={tooltipLeft}
        top={tooltipTop}
        offsetLeft={15}
        offsetTop={-50}
        style={{
          backgroundColor: themeColors.hoverBg,
          color: themeColors.hoverText,
          border: `1px solid ${themeColors.legendBorder}`,
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
          fontFamily: "Inter, system-ui, sans-serif",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          pointerEvents: "none",
          zIndex: 1000,
          transition: "opacity 0.15s ease-in-out, transform 0.15s ease-in-out",
          transform: "translateY(0)",
        }}
      >
        <div style={{ minWidth: "140px" }}>
          {tooltipData.label && (
            <div
              style={{
                fontWeight: 600,
                marginBottom: "6px",
                fontSize: "13px",
                color: themeColors.hoverText,
                borderBottom: `1px solid ${themeColors.legendBorder}`,
                paddingBottom: "4px",
              }}
            >
              {tooltipData.label}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ opacity: 0.8 }}>Energy:</span>
              <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
                {tooltipData.energy.toFixed(3)} eV
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ opacity: 0.8 }}>Intensity:</span>
              <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
                {tooltipData.intensity.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </TooltipInPortal>
    </>
  );
}
