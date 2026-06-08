"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Chip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { registeredInstrumentStatusPresentation } from "./instrument-status";
import type { RegisteredInstrumentStatusChipColor } from "./types";

const STATUS_CHIP_ICON: Record<
  RegisteredInstrumentStatusChipColor,
  typeof CheckCircleIcon
> = {
  success: CheckCircleIcon,
  default: XCircleIcon,
  warning: ClockIcon,
};

const STATUS_CHIP_CLASS: Record<RegisteredInstrumentStatusChipColor, string> = {
  success:
    "border-success/30 bg-success/10 text-success dark:border-success/40 dark:bg-success/15",
  default: "",
  warning: "border-warning/30 bg-warning/10 text-warning dark:border-warning/40 dark:bg-warning/15",
};

type InstrumentStatusChipProps = {
  status: string;
  className?: string;
};

/**
 * Compact instrument lifecycle chip for facility browse and contribution surfaces.
 * Active status uses semantic success tokens for readable contrast on dark themes.
 */
export function InstrumentStatusChip({ status, className }: InstrumentStatusChipProps) {
  const { label, chipColor } = registeredInstrumentStatusPresentation(status);
  const Icon = STATUS_CHIP_ICON[chipColor];

  return (
    <Chip
      size="sm"
      variant="secondary"
      color={chipColor}
      className={cn(
        "h-6 shrink-0 gap-1 px-2 text-xs font-medium",
        STATUS_CHIP_CLASS[chipColor],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
