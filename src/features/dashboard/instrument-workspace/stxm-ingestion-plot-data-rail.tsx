"use client";

import { useCallback, useMemo } from "react";
import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { BareAtomStepEdgeIcon } from "~/components/icons";
import { PlotToolbarGroupSeparator } from "~/components/plots/toolbars";
import {
  plotToolbarAttachedToggleGroupVerticalClass,
  plotToolbarAttachedToolbarVerticalClass,
  plotToolbarGlyphToggleGroupItemVerticalClass,
  PlotToolbarRichHint,
} from "~/components/plots/toolbars";
import { SpectrumYChannelRail } from "~/components/plots/toolbars/spectrum-y-channel-rail";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import {
  ingestionChannelUsesRawSignal,
  type StxmI0PlotScaleMode,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import { StxmI0PlotScaleToggle } from "./stxm-i0-plot-scale-toggle";

export type StxmIngestionPlotDataRailProps = {
  displayChannel: StxmIngestionPlotChannel;
  onDisplayChannelChange: (channel: StxmIngestionPlotChannel) => void;
  hasRawSpectra: boolean;
  hasReducedResult: boolean;
  i0PlotScale: StxmI0PlotScaleMode;
  onI0PlotScaleChange: (mode: StxmI0PlotScaleMode) => void;
  showBareAtomOverlay: boolean;
  onShowBareAtomOverlayChange: (show: boolean) => void;
  bareAtomOverlayDisabled: boolean;
  bareAtomOverlayDisabledReason: string;
  formulaLoading?: boolean;
};

/**
 * STXM ingestion left vertical rail: I0 signal tray, spectroscopy Rw, optical constants, bare-atom toggle.
 */
export function StxmIngestionPlotDataRail({
  displayChannel,
  onDisplayChannelChange,
  hasRawSpectra,
  hasReducedResult,
  i0PlotScale,
  onI0PlotScaleChange,
  showBareAtomOverlay,
  onShowBareAtomOverlayChange,
  bareAtomOverlayDisabled,
  bareAtomOverlayDisabledReason,
  formulaLoading = false,
}: StxmIngestionPlotDataRailProps) {
  const isChannelAvailable = useCallback(
    (id: StxmIngestionPlotChannel) => {
      if (ingestionChannelUsesRawSignal(id)) {
        return hasRawSpectra;
      }
      return hasReducedResult;
    },
    [hasRawSpectra, hasReducedResult],
  );

  const showI0ScaleToggle = ingestionChannelUsesRawSignal(displayChannel);

  const bareAtomHint = useMemo(() => {
    if (formulaLoading) {
      return "Loading molecule formula.";
    }
    return bareAtomOverlayDisabledReason;
  }, [bareAtomOverlayDisabledReason, formulaLoading]);

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <Toolbar
        isAttached
        orientation="vertical"
        aria-label="Bare atom reference"
        className={plotToolbarAttachedToolbarVerticalClass}
      >
        <ToggleButtonGroup
          aria-label="Bare atom step-edge overlay"
          selectionMode="multiple"
          orientation="vertical"
          className={plotToolbarAttachedToggleGroupVerticalClass}
          selectedKeys={showBareAtomOverlay ? ["bare-atom"] : []}
          onSelectionChange={(keys) => {
            onShowBareAtomOverlayChange(keys.has("bare-atom"));
          }}
        >
          <PlotToolbarRichHint
            title="Bare atom step edge"
            description="Overlay tabulated bare-atom reference on the current energy grid."
            whenDisabledDescription={bareAtomHint}
            placement="right"
            disabled={bareAtomOverlayDisabled || formulaLoading}
          >
            <ToggleButton
              isIconOnly
              aria-label={
                bareAtomOverlayDisabled
                  ? "Bare atom overlay (link a molecule with a chemical formula first)"
                  : "Bare atom step-edge reference"
              }
              id="bare-atom"
              isDisabled={bareAtomOverlayDisabled || formulaLoading}
              className={plotToolbarGlyphToggleGroupItemVerticalClass}
            >
              <BareAtomStepEdgeIcon className="h-6 w-6" aria-hidden />
            </ToggleButton>
          </PlotToolbarRichHint>
        </ToggleButtonGroup>
      </Toolbar>

      <PlotToolbarGroupSeparator orientation="horizontal" />

      <SpectrumYChannelRail
        definition={STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION}
        activeChannelId={displayChannel}
        onActiveChannelChange={onDisplayChannelChange}
        isChannelAvailable={isChannelAvailable}
        ariaLabel="STXM spectrum Y channels"
        hintPlacement="right"
      />

      {showI0ScaleToggle ? (
        <>
          <PlotToolbarGroupSeparator orientation="horizontal" />
          <StxmI0PlotScaleToggle
            mode={i0PlotScale}
            onModeChange={onI0PlotScaleChange}
          />
        </>
      ) : null}
    </div>
  );
}
