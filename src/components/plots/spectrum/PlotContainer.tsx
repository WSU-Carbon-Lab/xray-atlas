"use client";

import { useRef } from "react";
import { ParentSize } from "@visx/responsive";
import {
  PLOT_CONFIG,
  PLOT_MARGIN_BOTTOM,
  PLOT_MARGIN_LEFT,
  PLOT_MARGIN_RIGHT,
  PLOT_MARGIN_TOP,
} from "../config";

const SIZE_STABLE_THRESHOLD = 2;

type PlotContainerProps = {
  height?: number;
  /**
   * Optional axes plot aspect ratio (w/h) for the main plot box.
   * Note: this should only be used when SpectrumPlot has no secondary (peak) subplot,
   * otherwise the main plot area will not preserve the requested aspect ratio.
   */
  aspectRatio?: { w: number; h: number };
  children: (size: { width: number; height: number }) => React.ReactNode;
};

export function PlotContainer({ height, aspectRatio, children }: PlotContainerProps) {
  const fillContainer = height == null;
  const minHeight = PLOT_CONFIG.fillContainerMinHeight;
  const lastStableRef = useRef<{ width: number; height: number } | null>(null);

  const content = (
    <ParentSize debounceTime={200}>
      {({ width, height: sizeHeight }) => {
        const rawHeight = sizeHeight ?? 0;
        const isAspectRatioMode =
          aspectRatio != null &&
          Number.isFinite(aspectRatio.w) &&
          Number.isFinite(aspectRatio.h) &&
          aspectRatio.w > 0 &&
          aspectRatio.h > 0;

        let effectiveHeight = fillContainer
          ? rawHeight > 0
            ? Math.max(rawHeight, minHeight)
            : minHeight
          : height ?? minHeight;

        if (isAspectRatioMode && width > 0 && aspectRatio != null) {
          const plotAreaWidth = Math.max(0, width - PLOT_MARGIN_LEFT - PLOT_MARGIN_RIGHT);
          if (plotAreaWidth > 0) {
            const ratio = aspectRatio.w / aspectRatio.h;
            const plotAreaHeight = plotAreaWidth / ratio;
            const totalHeight =
              plotAreaHeight +
              PLOT_MARGIN_TOP +
              PLOT_MARGIN_BOTTOM +
              PLOT_CONFIG.toolbarHeight +
              PLOT_CONFIG.overviewGap;

            effectiveHeight = Math.max(totalHeight, minHeight);
          }
        }

        if (width === 0 || effectiveHeight === 0) return null;
        const prev = lastStableRef.current;
        const dw = prev ? Math.abs(width - prev.width) : Infinity;
        const dh = prev ? Math.abs(effectiveHeight - prev.height) : Infinity;
        if (prev && dw <= SIZE_STABLE_THRESHOLD && dh <= SIZE_STABLE_THRESHOLD) {
          return <>{children(prev)}</>;
        }
        const next = { width, height: effectiveHeight };
        lastStableRef.current = next;
        return <>{children(next)}</>;
      }}
    </ParentSize>
  );

  if (fillContainer) {
    return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col self-stretch overflow-hidden">
        <div
          className="relative min-h-0 w-full min-w-0 flex-1 self-stretch overflow-hidden"
          style={{ minHeight }}
        >
          <div className="absolute inset-0 min-h-0 min-w-0">{content}</div>
        </div>
      </div>
    );
  }

  return content;
}
