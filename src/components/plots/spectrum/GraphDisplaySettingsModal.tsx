"use client";

import { memo } from "react";
import { SimpleDialog } from "~/components/ui/dialog";
import { Label } from "@heroui/react";

type GraphDisplaySettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const GraphDisplaySettingsModal = memo(function GraphDisplaySettingsModal({
  isOpen,
  onClose,
}: GraphDisplaySettingsModalProps) {
  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Graph display settings"
      maxWidth="max-w-lg"
    >
      <div className="space-y-6 text-sm text-(--text-secondary)">
        <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
          <div className="px-3 py-2">
            <Label className="mb-2 block font-medium text-(--text-primary)">Legend</Label>
            <p className="text-(--text-tertiary)">
              Options for in-plot legend position, title, and visibility will appear here.
            </p>
          </div>
        </section>
        <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
          <div className="px-3 py-2">
            <Label className="mb-2 block font-medium text-(--text-primary)">Axes</Label>
            <p className="text-(--text-tertiary)">
              Axis label and unit overrides, tick count, and grid visibility will appear here.
            </p>
          </div>
        </section>
        <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
          <div className="px-3 py-2">
            <Label className="mb-2 block font-medium text-(--text-primary)">Appearance</Label>
            <p className="text-(--text-tertiary)">
              Line weights, font sizes, and color theme options will appear here.
            </p>
          </div>
        </section>
      </div>
    </SimpleDialog>
  );
});
