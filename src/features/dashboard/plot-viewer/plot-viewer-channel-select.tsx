"use client";

import { Label, ListBox, Select } from "@heroui/react";
import {
  PLOT_VIEWER_CHANNELS,
  type PlotViewerChannelId,
} from "./plot-viewer-url-state";

export type PlotViewerChannelSelectProps = {
  channel: PlotViewerChannelId;
  onChannelChange: (channel: PlotViewerChannelId) => void;
  disabled?: boolean;
};

/**
 * Compact Y-channel selector for the plot viewer sticky header.
 */
export function PlotViewerChannelSelect({
  channel,
  onChannelChange,
  disabled = false,
}: PlotViewerChannelSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
        Channel
      </Label>
      <Select
        selectedKey={channel}
        isDisabled={disabled}
        onSelectionChange={(key) => {
          if (typeof key === "string") {
            const match = PLOT_VIEWER_CHANNELS.find((option) => option.id === key);
            if (match) {
              onChannelChange(match.id);
            }
          }
        }}
        aria-label="Plot y channel"
        className="min-w-[9.5rem]"
      >
        <Select.Trigger className="border-border bg-field-background min-h-8 rounded-lg border px-2 shadow-none">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {PLOT_VIEWER_CHANNELS.map((option) => (
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
  );
}
