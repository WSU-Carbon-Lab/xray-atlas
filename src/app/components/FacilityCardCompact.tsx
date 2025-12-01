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
      className="group flex w-full items-center gap-4 overflow-hidden rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:border-gray-700/50 dark:bg-gray-800/80"
    >
      {/* Icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-wsu-crimson/10 text-wsu-crimson dark:bg-wsu-crimson/20">
        <BuildingOfficeIcon className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
              {name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {location}
              </span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {facilityTypeLabel}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <BeakerIcon className="h-4 w-4" />
            <span className="font-semibold">{instrumentCount}</span>
            <span className="text-xs">instruments</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
