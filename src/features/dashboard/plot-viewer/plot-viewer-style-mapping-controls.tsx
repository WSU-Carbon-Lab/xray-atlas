"use client";

import { memo } from "react";
import { Label, ListBox, Select, Separator } from "@heroui/react";
import { PlotViewerDescriptorChip } from "./plot-viewer-descriptor-chip";
import { PlotViewerPaletteSwatch } from "./plot-viewer-fixed-color-panel";
import { isPlotViewerPaletteId } from "./plot-viewer-palette-catalog";
import {
  PLOT_VIEWER_LINE_DASH_OPTIONS,
  PLOT_VIEWER_LINE_STYLE_BY_OPTIONS,
  PLOT_VIEWER_MARKER_OPTIONS,
  PLOT_VIEWER_PALETTE_OPTIONS,
  PLOT_VIEWER_STYLE_MAPPING_FIELD_OPTIONS,
  type PlotViewerLineDash,
  type PlotViewerLineStyleBy,
  type PlotViewerMarkerSymbol,
  type PlotViewerPaletteId,
  type PlotViewerStyleMappingField,
} from "./plot-viewer-trace-styles";
import type { PlotViewerDescriptorField } from "./plot-viewer-legend";
import type { PlotViewerStyleOverrideRow } from "./plot-viewer-style-mapping-chip";

function mappingSelectClassName(): string {
  return "min-w-[9.5rem]";
}

function mappingTriggerClassName(): string {
  return "border-border bg-field-background min-h-8 rounded-lg border px-2 shadow-none";
}

export type PlotViewerStyleMappingControlsProps = {
  paletteId: PlotViewerPaletteId;
  isDark?: boolean;
  colorBy: PlotViewerStyleMappingField;
  lineStyleBy: PlotViewerLineStyleBy;
  markerBy: PlotViewerStyleMappingField;
  descriptorFields: readonly PlotViewerDescriptorField[];
  lineOverrideRows: readonly PlotViewerStyleOverrideRow[];
  markerOverrideRows: readonly PlotViewerStyleOverrideRow[];
  lineDashOverrides: Readonly<Record<string, PlotViewerLineDash>>;
  markerOverrides: Readonly<Record<string, PlotViewerMarkerSymbol>>;
  onPaletteChange: (paletteId: PlotViewerPaletteId) => void;
  onColorByChange: (field: PlotViewerStyleMappingField) => void;
  onLineStyleByChange: (field: PlotViewerLineStyleBy) => void;
  onMarkerByChange: (field: PlotViewerStyleMappingField) => void;
  onToggleDescriptorField: (field: PlotViewerDescriptorField) => void;
  onLineDashOverrideChange: (
    fieldValue: string,
    lineDash: PlotViewerLineDash,
  ) => void;
  onMarkerOverrideChange: (
    fieldValue: string,
    markerSymbol: PlotViewerMarkerSymbol,
  ) => void;
};

/**
 * Inline global trace style encodings: palette, color/line/marker mapping, and legend columns.
 */
export const PlotViewerStyleMappingControls = memo(
  function PlotViewerStyleMappingControls({
    paletteId,
    isDark = false,
    colorBy,
    lineStyleBy,
    markerBy,
    descriptorFields,
    lineOverrideRows,
    markerOverrideRows,
    lineDashOverrides,
    markerOverrides,
    onPaletteChange,
    onColorByChange,
    onLineStyleByChange,
    onMarkerByChange,
    onToggleDescriptorField,
    onLineDashOverrideChange,
    onMarkerOverrideChange,
  }: PlotViewerStyleMappingControlsProps) {
    return (
      <div className="space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <section className="space-y-1.5">
            <p className="text-foreground text-[11px] font-semibold tracking-wide uppercase">
              Color
            </p>
            <div className="grid gap-2">
              <div className="space-y-0.5">
                <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
                  Palette
                </Label>
                <Select
                  selectedKey={paletteId}
                  onSelectionChange={(key) => {
                    if (typeof key === "string" && isPlotViewerPaletteId(key)) {
                      onPaletteChange(key);
                    }
                  }}
                  aria-label="Trace color palette"
                  className={mappingSelectClassName()}
                >
                  <Select.Trigger className={mappingTriggerClassName()}>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <PlotViewerPaletteSwatch
                        paletteId={paletteId}
                        isDark={isDark}
                        className="w-14 shrink-0"
                      />
                      <Select.Value />
                    </span>
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {PLOT_VIEWER_PALETTE_OPTIONS.map((option) => (
                        <ListBox.Item
                          key={option.id}
                          id={option.id}
                          textValue={option.label}
                          className="gap-2"
                        >
                          <PlotViewerPaletteSwatch
                            paletteId={option.id}
                            isDark={isDark}
                            className="w-16 shrink-0"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {option.label}
                          </span>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
                  Color by
                </Label>
                <Select
                  selectedKey={colorBy}
                  onSelectionChange={(key) => {
                    if (typeof key === "string") {
                      const match = PLOT_VIEWER_STYLE_MAPPING_FIELD_OPTIONS.find(
                        (option) => option.id === key,
                      );
                      if (match) {
                        onColorByChange(match.id);
                      }
                    }
                  }}
                  aria-label="Color encoding field"
                  className={mappingSelectClassName()}
                >
                  <Select.Trigger className={mappingTriggerClassName()}>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {PLOT_VIEWER_STYLE_MAPPING_FIELD_OPTIONS.map((option) => (
                        <ListBox.Item
                          key={option.id}
                          id={option.id}
                          textValue={option.label}
                        >
                          {option.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-1.5">
            <p className="text-foreground text-[11px] font-semibold tracking-wide uppercase">
              Line style
            </p>
            <div className="space-y-0.5">
              <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
                Line style by
              </Label>
              <Select
                selectedKey={lineStyleBy}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    const match = PLOT_VIEWER_LINE_STYLE_BY_OPTIONS.find(
                      (option) => option.id === key,
                    );
                    if (match) {
                      onLineStyleByChange(match.id);
                    }
                  }
                }}
                aria-label="Line dash encoding field"
                className={mappingSelectClassName()}
              >
                <Select.Trigger className={mappingTriggerClassName()}>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {PLOT_VIEWER_LINE_STYLE_BY_OPTIONS.map((option) => (
                      <ListBox.Item
                        key={option.id}
                        id={option.id}
                        textValue={option.label}
                      >
                        {option.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            {lineStyleBy !== "none" && lineOverrideRows.length > 0 ? (
              <ul className="border-border max-h-28 space-y-1 overflow-y-auto rounded-lg border p-1.5">
                {lineOverrideRows.map((row) => (
                  <li
                    key={row.value}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-foreground min-w-0 truncate text-xs">
                      {row.label}
                    </span>
                    <Select
                      selectedKey={
                        lineDashOverrides[row.value] ??
                        PLOT_VIEWER_LINE_DASH_OPTIONS[0]?.id ??
                        "solid"
                      }
                      onSelectionChange={(key) => {
                        if (
                          key === "solid" ||
                          key === "dash" ||
                          key === "dot" ||
                          key === "dashdot"
                        ) {
                          onLineDashOverrideChange(row.value, key);
                        }
                      }}
                      aria-label={`Line style for ${row.label}`}
                      className="w-[7rem] shrink-0"
                    >
                      <Select.Trigger className={mappingTriggerClassName()}>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {PLOT_VIEWER_LINE_DASH_OPTIONS.map((option) => (
                            <ListBox.Item
                              key={option.id}
                              id={option.id}
                              textValue={option.label}
                            >
                              {option.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="space-y-1.5 sm:col-span-2 sm:max-w-[calc(50%-0.3125rem)]">
            <p className="text-foreground text-[11px] font-semibold tracking-wide uppercase">
              Marker
            </p>
            <div className="space-y-0.5">
              <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
                Marker by
              </Label>
              <Select
                selectedKey={markerBy}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    const match = PLOT_VIEWER_STYLE_MAPPING_FIELD_OPTIONS.find(
                      (option) => option.id === key,
                    );
                    if (match) {
                      onMarkerByChange(match.id);
                    }
                  }
                }}
                aria-label="Marker encoding field"
                className={mappingSelectClassName()}
              >
                <Select.Trigger className={mappingTriggerClassName()}>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {PLOT_VIEWER_STYLE_MAPPING_FIELD_OPTIONS.map((option) => (
                      <ListBox.Item
                        key={option.id}
                        id={option.id}
                        textValue={option.label}
                      >
                        {option.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            {markerOverrideRows.length > 0 ? (
              <ul className="border-border max-h-28 space-y-1 overflow-y-auto rounded-lg border p-1.5">
                {markerOverrideRows.map((row) => (
                  <li
                    key={row.value}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-foreground min-w-0 truncate text-xs">
                      {row.label}
                    </span>
                    <Select
                      selectedKey={
                        markerOverrides[row.value] ??
                        PLOT_VIEWER_MARKER_OPTIONS[1]?.id ??
                        "circle"
                      }
                      onSelectionChange={(key) => {
                        if (
                          key === "none" ||
                          key === "circle" ||
                          key === "square" ||
                          key === "triangle" ||
                          key === "diamond"
                        ) {
                          onMarkerOverrideChange(row.value, key);
                        }
                      }}
                      aria-label={`Marker for ${row.label}`}
                      className="w-[7rem] shrink-0"
                    >
                      <Select.Trigger className={mappingTriggerClassName()}>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {PLOT_VIEWER_MARKER_OPTIONS.map((option) => (
                            <ListBox.Item
                              key={option.id}
                              id={option.id}
                              textValue={option.label}
                            >
                              {option.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        <Separator className="bg-border" />

        <section className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-foreground text-[11px] font-semibold tracking-wide uppercase">
              Legend display
            </p>
            <p className="text-muted text-[10px] leading-snug">
              Descriptor columns shown in the legend table
            </p>
          </div>
          <PlotViewerDescriptorChip
            selectedFields={descriptorFields}
            onToggle={onToggleDescriptorField}
          />
        </section>
      </div>
    );
  },
);
