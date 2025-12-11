/**
 * Tooltip system for visx visualization
 */

import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
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
  isDark,
  TooltipInPortal,
}: {
  tooltipData: TooltipData | null;
  tooltipLeft: number;
  tooltipTop: number;
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
}) {
  if (!tooltipData) return null;

  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  return (
    <TooltipInPortal
      left={tooltipLeft}
      top={tooltipTop}
      offsetLeft={15}
      offsetTop={15}
      style={{
        backgroundColor: themeColors.hoverBg,
        color: themeColors.hoverText,
        border: `1px solid ${themeColors.legendBorder}`,
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "12px",
        fontFamily: "Inter, system-ui, sans-serif",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      <div>
        {tooltipData.label && (
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            {tooltipData.label}
          </div>
        )}
        <div>Energy: {tooltipData.energy.toFixed(3)} eV</div>
        <div>Intensity: {tooltipData.intensity.toFixed(4)}</div>
      </div>
    </TooltipInPortal>
  );
}
