"use client";

import { PlotDataViewRail } from "~/components/plots/data-rail";
import type { PlotDataViewRailProps } from "~/components/plots/data-rail";

export type SpectrumYChannelRailProps<
  TChannelId extends string,
  TTrayId extends string,
> = PlotDataViewRailProps<TChannelId, TTrayId>;

/**
 * Vertical left-side spectrum Y-channel rail: one attached toolbar with tray segments
 * and horizontal channel pickers, matching NEXAFS browse plot data-rail anatomy.
 */
export function SpectrumYChannelRail<
  TChannelId extends string,
  TTrayId extends string,
>({
  hintPlacement = "right",
  ariaLabel = "Spectrum Y channels",
  ...props
}: SpectrumYChannelRailProps<TChannelId, TTrayId>) {
  return (
    <PlotDataViewRail
      {...props}
      hintPlacement={hintPlacement}
      ariaLabel={ariaLabel}
    />
  );
}
