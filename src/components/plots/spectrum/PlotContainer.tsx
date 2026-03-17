"use client";

import { useRef, useState } from "react";
import { ParentSize } from "@visx/responsive";
import { PLOT_CONFIG } from "../config";

const SIZE_STABLE_THRESHOLD = 2;
const WIDTH_GROWTH_THRESHOLD = 10;

type PlotContainerProps = {
  height?: number;
  children: (size: { width: number; height: number }) => React.ReactNode;
};

export function PlotContainer({ height, children }: PlotContainerProps) {
  const fillContainer = height == null;
  const minHeight = PLOT_CONFIG.fillContainerMinHeight;
  const lastStableRef = useRef<{ width: number; height: number } | null>(null);
  const [allocatedHeight, setAllocatedHeight] = useState<number | null>(null);

  const content = (
    <ParentSize debounceTime={200}>
      {({ width, height: sizeHeight }) => {
        const rawHeight = sizeHeight ?? 0;
        let effectiveHeight = fillContainer
          ? rawHeight > 0
            ? Math.max(rawHeight, minHeight)
            : minHeight
          : height ?? minHeight;
        if (width === 0 || effectiveHeight === 0) return null;
        const prev = lastStableRef.current;
        if (fillContainer && prev != null && effectiveHeight > prev.height) {
          const widthGrew = width >= prev.width + WIDTH_GROWTH_THRESHOLD;
          if (!widthGrew) effectiveHeight = prev.height;
        }
        const dw = prev ? Math.abs(width - prev.width) : Infinity;
        const dh = prev ? Math.abs(effectiveHeight - prev.height) : Infinity;
        if (prev && dw <= SIZE_STABLE_THRESHOLD && dh <= SIZE_STABLE_THRESHOLD) {
          return <>{children(prev)}</>;
        }
        const next = { width, height: effectiveHeight };
        lastStableRef.current = next;
        if (fillContainer && next.height !== allocatedHeight) {
          queueMicrotask(() => setAllocatedHeight(next.height));
        }
        return <>{children(next)}</>;
      }}
    </ParentSize>
  );

  if (fillContainer) {
    return (
      <div
        className="min-h-0 w-full flex-1 flex flex-col min-w-0 self-stretch overflow-hidden"
        style={{
          minHeight,
          height: allocatedHeight ?? undefined,
          maxHeight: allocatedHeight ?? undefined,
        }}
      >
        <div className="flex-1 min-h-0 w-full self-stretch min-w-0 overflow-hidden" style={{ minHeight }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
