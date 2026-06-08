"use client";

import { Label, ListBox, Select } from "@heroui/react";
import {
  STXM_PREVIEW_COMPARE_CHANNELS,
  type StxmPreviewCompareChannel,
} from "./stxm-preview-styled-traces";
import { channelDefinitionById } from "~/components/plots/data-rail";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";

export type StxmPreviewChannelSelectProps = {
  channel: StxmPreviewCompareChannel;
  onChannelChange: (channel: StxmPreviewCompareChannel) => void;
  disabled?: boolean;
};

/**
 * Compact Y-channel selector for the STXM preview compare plot header.
 */
export function StxmPreviewChannelSelect({
  channel,
  onChannelChange,
  disabled = false,
}: StxmPreviewChannelSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
        Channel
      </Label>
      <Select
        selectedKey={channel}
        isDisabled={disabled}
        onSelectionChange={(key) => {
          if (typeof key !== "string") {
            return;
          }
          if (
            STXM_PREVIEW_COMPARE_CHANNELS.includes(
              key as StxmPreviewCompareChannel,
            )
          ) {
            onChannelChange(key as StxmPreviewCompareChannel);
          }
        }}
        aria-label="Preview compare y channel"
        className="min-w-[9.5rem]"
      >
        <Select.Trigger className="border-border bg-field-background min-h-8 rounded-lg border px-2 shadow-none">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STXM_PREVIEW_COMPARE_CHANNELS.map((optionId) => (
              <ListBox.Item
                key={optionId}
                id={optionId}
                textValue={channelDefinitionById(
                  STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
                  optionId,
                ).label}
              >
                {channelDefinitionById(
                  STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
                  optionId,
                ).label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
