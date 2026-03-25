"use client";

import Link from "next/link";
import {
  BoltIcon,
  CalendarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export type NexafsDatasetCardCompactProps = {
  href: string;
  moleculeName: string;
  moleculeFormula: string;
  sampleIdentifier: string | null;
  edgeLabel: string;
  instrumentName: string;
  facilityName: string | null;
  uploadedAtLabel: string;
  pointCount: number;
  experimentTypeLabel: string | null;
};

export function NexafsDatasetCardCompact({
  href,
  moleculeName,
  moleculeFormula,
  sampleIdentifier,
  edgeLabel,
  instrumentName,
  facilityName,
  uploadedAtLabel,
  pointCount,
  experimentTypeLabel,
}: NexafsDatasetCardCompactProps) {
  const facilityLine = facilityName ?? "Facility unknown";

  return (
    <Link
      href={href}
      className="group border-border bg-surface flex w-full items-center gap-4 overflow-hidden rounded-xl border p-4 shadow-lg transition-all hover:shadow-xl"
    >
      <div className="bg-accent/10 text-accent dark:bg-accent-soft-hover flex h-12 w-12 shrink-0 items-center justify-center rounded-lg dark:text-accent">
        <BoltIcon className="h-6 w-6 stroke-[1.5]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate text-lg font-bold">
              {moleculeName}
            </h3>
            <p className="text-muted mt-0.5 font-mono text-sm tabular-nums">
              {moleculeFormula}
            </p>
            <div className="text-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-foreground font-medium">{edgeLabel}</span>
              <span aria-hidden className="text-muted">
                |
              </span>
              <span>{instrumentName}</span>
              <span aria-hidden className="text-muted">
                |
              </span>
              <span>{facilityLine}</span>
            </div>
            {sampleIdentifier && (
              <p className="text-muted mt-1 text-xs">
                Sample:{" "}
                <span className="text-foreground font-medium">
                  {sampleIdentifier}
                </span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-4 w-4 shrink-0 stroke-[1.5]" aria-hidden />
              <span className="tabular-nums">{uploadedAtLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <ChartBarIcon className="h-4 w-4 shrink-0 stroke-[1.5]" aria-hidden />
              <span className="font-semibold tabular-nums text-foreground">
                {pointCount}
              </span>
              <span className="text-xs">points</span>
            </span>
            {experimentTypeLabel && (
              <span className="border-border bg-default text-foreground mt-1 rounded-full border px-2 py-0.5 text-xs font-medium">
                {experimentTypeLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
