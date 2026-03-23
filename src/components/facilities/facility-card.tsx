"use client";

import Link from "next/link";
import { BuildingOfficeIcon, BeakerIcon } from "@heroicons/react/24/outline";

interface FacilityCardCompactProps {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  facilityType: "SYNCHROTRON" | "FREE_ELECTRON_LASER" | "LAB_SOURCE";
  instrumentCount: number;
}

export function FacilityCardCompact({
  id,
  name,
  city,
  country,
  facilityType,
  instrumentCount,
}: FacilityCardCompactProps) {
  const location = [city, country].filter(Boolean).join(", ") || "Location unknown";

  const facilityTypeLabel = {
    SYNCHROTRON: "Synchrotron",
    FREE_ELECTRON_LASER: "Free Electron Laser",
    LAB_SOURCE: "Lab Source",
  }[facilityType];

  return (
    <Link
      href={`/facilities/${id}`}
      className="group border-border bg-surface flex w-full items-center gap-4 overflow-hidden rounded-xl border p-4 shadow-lg transition-all hover:shadow-xl"
    >
      <div className="bg-accent/10 text-accent dark:bg-accent-soft-hover flex h-12 w-12 shrink-0 items-center justify-center rounded-lg dark:text-accent">
        <BuildingOfficeIcon className="h-6 w-6 stroke-[1.5]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate text-lg font-bold">{name}</h3>
            <div className="text-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span>{location}</span>
              <span aria-hidden className="text-muted">
                |
              </span>
              <span className="border-border bg-default text-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
                {facilityTypeLabel}
              </span>
            </div>
          </div>
          <div className="text-muted flex shrink-0 items-center gap-1.5 text-sm">
            <BeakerIcon className="h-4 w-4 shrink-0 stroke-[1.5]" aria-hidden />
            <span className="text-foreground font-semibold tabular-nums">
              {instrumentCount}
            </span>
            <span className="text-xs">instruments</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
