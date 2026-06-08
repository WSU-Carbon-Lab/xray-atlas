"use client";

import { memo, useCallback, useState } from "react";
import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import type { PlotViewerExperimentStyleItem } from "./plot-viewer-experiment-styles";
import { PlotViewerExperimentStyleRow } from "./plot-viewer-experiment-style-row";
import { PlotViewerExperimentTraceStyles } from "./plot-viewer-experiment-trace-styles";
import {
  PlotViewerStyleMappingControls,
  type PlotViewerStyleMappingControlsProps,
} from "./plot-viewer-style-mapping-controls";
import {
  readPlotViewerStyleAccordionExpandedKeys,
  writePlotViewerStyleAccordionExpandedKeys,
} from "./plot-viewer-style-accordion-state";
import type {
  PlotViewerExperimentColorMode,
  PlotViewerTraceStyleOverride,
} from "./plot-viewer-style-overrides";
import type { PlotViewerLineDash, PlotViewerMarkerSymbol } from "./plot-viewer-trace-styles";

const ENCODINGS_ITEM_ID = "encodings";

function experimentAccordionId(experimentId: string): string {
  return `plot-viewer-style-${experimentId}`;
}

export type PlotViewerStyleAccordionProps = PlotViewerStyleMappingControlsProps & {
  experimentItems: readonly PlotViewerExperimentStyleItem[];
  onExperimentColorModeChange: (
    experimentId: string,
    mode: PlotViewerExperimentColorMode,
    fixedColor: string | null,
  ) => void;
  onExperimentLineDashChange: (
    experimentId: string,
    lineDash: PlotViewerLineDash | null,
  ) => void;
  onExperimentLineWidthChange: (
    experimentId: string,
    lineWidth: number | null,
  ) => void;
  onExperimentMarkerChange: (
    experimentId: string,
    marker: PlotViewerMarkerSymbol | null,
  ) => void;
  onExperimentMarkerSizeChange: (
    experimentId: string,
    markerSize: number | null,
  ) => void;
  onExperimentMarkerEveryChange: (
    experimentId: string,
    markerEvery: number | null,
  ) => void;
  onTraceStyleOverrideChange: (
    traceKey: string,
    patch: Partial<PlotViewerTraceStyleOverride>,
    clearKeys?: readonly (keyof PlotViewerTraceStyleOverride)[],
  ) => void;
};

/**
 * Collapsible trace style settings: global encodings plus one accordion row per selected experiment.
 * Accordion expansion persists in sessionStorage so parent re-renders do not reset open sections.
 */
export const PlotViewerStyleAccordion = memo(function PlotViewerStyleAccordion({
  experimentItems,
  onExperimentColorModeChange,
  onExperimentLineDashChange,
  onExperimentLineWidthChange,
  onExperimentMarkerChange,
  onExperimentMarkerSizeChange,
  onExperimentMarkerEveryChange,
  onTraceStyleOverrideChange,
  ...mappingProps
}: PlotViewerStyleAccordionProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => readPlotViewerStyleAccordionExpandedKeys(),
  );

  const handleExpandedChange = useCallback((keys: Iterable<string | number>) => {
    const next = new Set([...keys].map(String));
    setExpandedKeys(next);
    writePlotViewerStyleAccordionExpandedKeys(next);
  }, []);

  if (experimentItems.length === 0) {
    return null;
  }

  return (
    <Accordion
      allowsMultipleExpanded
      variant="surface"
      aria-label="Trace style settings"
      expandedKeys={expandedKeys}
      onExpandedChange={handleExpandedChange}
      className="w-full rounded-lg"
    >
      <Accordion.Item
        id={ENCODINGS_ITEM_ID}
        className="rounded-lg first:rounded-t-lg [&+&]:mt-1"
      >
        <Accordion.Heading>
          <Accordion.Trigger className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left">
            <span className="text-foreground text-xs font-medium">
              Global encodings
            </span>
            <Accordion.Indicator>
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="px-3 pb-2.5 pt-0.5">
            <PlotViewerStyleMappingControls {...mappingProps} />
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>

      {experimentItems.map((item) => (
        <Accordion.Item
          key={item.experimentId}
          id={experimentAccordionId(item.experimentId)}
          className="rounded-lg last:rounded-b-lg [&+&]:mt-1"
        >
          <Accordion.Heading>
            <Accordion.Trigger className="flex min-h-9 w-full items-center gap-1 rounded-lg px-2 py-1 text-left">
              <PlotViewerExperimentStyleRow
                item={item}
                paletteId={mappingProps.paletteId}
                isDark={mappingProps.isDark}
                onPaletteChange={mappingProps.onPaletteChange}
                onColorModeChange={onExperimentColorModeChange}
                onExperimentLineDashChange={onExperimentLineDashChange}
                onExperimentLineWidthChange={onExperimentLineWidthChange}
                onExperimentMarkerChange={onExperimentMarkerChange}
                onExperimentMarkerSizeChange={onExperimentMarkerSizeChange}
                onExperimentMarkerEveryChange={onExperimentMarkerEveryChange}
                className="min-w-0 flex-1"
              />
              <Accordion.Indicator className="shrink-0">
                <ChevronDown className="size-4" aria-hidden />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="px-2 pb-2 pt-1">
              <PlotViewerExperimentTraceStyles
                item={item}
                onColorModeChange={onExperimentColorModeChange}
                onExperimentLineDashChange={onExperimentLineDashChange}
                onExperimentMarkerChange={onExperimentMarkerChange}
                onTraceOverrideChange={onTraceStyleOverrideChange}
              />
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
});
