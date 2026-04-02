import type { ReactNode } from "react";
import { cn } from "@heroui/styles";

export function formatCompactMetricCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export function CompactCardMetricsColumn({
  className,
  children,
  distribution = "stack",
}: {
  className?: string;
  children: ReactNode;
  distribution?: "stack" | "even";
}) {
  return (
    <div
      className={cn(
        "flex min-w-[56px] shrink-0 flex-col items-end",
        distribution === "even"
          ? "gap-1.5 md:justify-between md:gap-0 md:self-stretch md:py-0.5"
          : "gap-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CompactCardMetricStat({
  icon,
  value,
  textClassName,
  title,
}: {
  icon: ReactNode;
  value: ReactNode;
  textClassName: string;
  title?: string;
}) {
  return (
    <span
      className={cn("flex items-center gap-1 tabular-nums", textClassName)}
      title={title}
    >
      {icon}
      {value}
    </span>
  );
}
