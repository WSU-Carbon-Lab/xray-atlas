"use client";

import { useCallback, useMemo } from "react";
import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { BareAtomStepEdgeIcon } from "~/components/icons";
import { PlotDataViewRail } from "~/components/plots/data-rail";
import { PlotToolbarGroupSeparator } from "~/components/plots/toolbars";
import {
  plotToolbarAttachedToggleGroupVerticalClass,
  plotToolbarAttachedToolbarVerticalClass,
  plotToolbarGlyphToggleGroupItemVerticalClass,
  PlotToolbarRichHint,
} from "~/components/plots/toolbars";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import {
  ingestionChannelUsesRawIntensity,
  isStxmDerivedOpticalPlotChannel,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import {
  isStxmImaginaryChannel,
  isStxmRealChannel,
  resolveStxmLinkedCompanionChannel,
  STXM_IMAGINARY_REAL_LINK_ID,
  STXM_LINKED_IMAGINARY_TO_REAL,
} from "~/lib/stxm/stxm-optical-link";
import type { StxmRawSignalTransformMode } from "~/lib/stxm/stxm-raw-signal-transform";
import { StxmRawSignalTransformToggle } from "./stxm-raw-signal-transform-toggle";

export type StxmIngestionPlotDataRailProps = {
  displayChannel: StxmIngestionPlotChannel;
  onDisplayChannelChange: (channel: StxmIngestionPlotChannel) => void;
  hasRawSpectra: boolean;
  hasReducedResult: boolean;
  derivedOpticalAvailable: boolean;
  hasIeData: boolean;
  isTeyExperiment: boolean;
  rawSignalTransform: StxmRawSignalTransformMode;
  onRawSignalTransformChange: (mode: StxmRawSignalTransformMode) => void;
  linkImaginaryReal: boolean;
  onLinkImaginaryRealChange: (linked: boolean) => void;
  showBareAtomOverlay: boolean;
  onShowBareAtomOverlayChange: (show: boolean) => void;
  bareAtomOverlayDisabled: boolean;
  bareAtomOverlayDisabledReason: string;
  formulaLoading?: boolean;
};

/**
 * STXM ingestion left vertical rail: unified raw spectroscopy tray, optical constants, and link toggle.
 */
export function StxmIngestionPlotDataRail({
  displayChannel,
  onDisplayChannelChange,
  hasRawSpectra,
  hasReducedResult,
  derivedOpticalAvailable,
  hasIeData,
  isTeyExperiment,
  rawSignalTransform,
  onRawSignalTransformChange,
  linkImaginaryReal,
  onLinkImaginaryRealChange,
  showBareAtomOverlay,
  onShowBareAtomOverlayChange,
  bareAtomOverlayDisabled,
  bareAtomOverlayDisabledReason,
  formulaLoading = false,
}: StxmIngestionPlotDataRailProps) {
  const isChannelAvailable = useCallback(
    (id: StxmIngestionPlotChannel) => {
      if (id === "signal_ie") {
        return hasRawSpectra && isTeyExperiment && hasIeData;
      }
      if (ingestionChannelUsesRawIntensity(id)) {
        return hasRawSpectra;
      }
      if (isStxmDerivedOpticalPlotChannel(id)) {
        return hasReducedResult && derivedOpticalAvailable;
      }
      return hasReducedResult;
    },
    [derivedOpticalAvailable, hasIeData, hasRawSpectra, hasReducedResult, isTeyExperiment],
  );

  const channelUnavailableDescription = useCallback(
    (id: StxmIngestionPlotChannel) => {
      if (isStxmDerivedOpticalPlotChannel(id) && !derivedOpticalAvailable) {
        return hasReducedResult
          ? "Set a chemical formula and run KK reduction to unlock f, epsilon, and chi views."
          : "Run reduction with beta and delta to unlock derived optical constants.";
      }
      if (id !== "signal_ie") {
        return undefined;
      }
      if (!isTeyExperiment) {
        return "Ie is available only for TEY experiments.";
      }
      if (!hasIeData) {
        return "No TEY drain-current monitor column in this scan header.";
      }
      return undefined;
    },
    [derivedOpticalAvailable, hasIeData, hasReducedResult, isTeyExperiment],
  );

  const bareAtomHint = useMemo(() => {
    if (formulaLoading) {
      return "Loading molecule formula.";
    }
    return bareAtomOverlayDisabledReason;
  }, [bareAtomOverlayDisabledReason, formulaLoading]);

  const links = useMemo(
    () => [
      {
        id: STXM_IMAGINARY_REAL_LINK_ID,
        insertAfterTrayId: "imaginary" as const,
        title: "Link real and imaginary",
        descriptionLinked:
          "Overlay the paired channel (for example delta with beta) on the same plot.",
        descriptionUnlinked: "Plot only the active tray channel.",
        whenDisabledDescription:
          "Select an imaginary or real optical constant to enable linking.",
        isLinkEnabled: (id: StxmIngestionPlotChannel) =>
          isStxmImaginaryChannel(id) || isStxmRealChannel(id),
        resolveCompanionId: (id: StxmIngestionPlotChannel) =>
          resolveStxmLinkedCompanionChannel(id, true) ??
          (isStxmRealChannel(id)
            ? (Object.entries(STXM_LINKED_IMAGINARY_TO_REAL).find(
                ([, real]) => real === id,
              )?.[0] as StxmIngestionPlotChannel | undefined) ?? null
            : null),
      },
    ],
    [],
  );

  const renderTrayPopoverTrailing = useCallback(
    (trayId: "spectroscopy" | "imaginary" | "real") => {
      if (trayId !== "spectroscopy") {
        return null;
      }
      if (!ingestionChannelUsesRawIntensity(displayChannel)) {
        return null;
      }
      return (
        <StxmRawSignalTransformToggle
          mode={rawSignalTransform}
          onModeChange={onRawSignalTransformChange}
        />
      );
    },
    [displayChannel, onRawSignalTransformChange, rawSignalTransform],
  );

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

      <PlotDataViewRail
        definition={STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION}
        activeChannelId={displayChannel}
        onActiveChannelChange={onDisplayChannelChange}
        isChannelAvailable={isChannelAvailable}
        channelUnavailableDescription={channelUnavailableDescription}
        renderTrayPopoverTrailing={renderTrayPopoverTrailing}
        links={links}
        linkState={{ [STXM_IMAGINARY_REAL_LINK_ID]: linkImaginaryReal }}
        onLinkStateChange={(_id, linked) => onLinkImaginaryRealChange(linked)}
        hintPlacement="right"
        ariaLabel="STXM spectrum Y channels"
      />
    </div>
  );
}
