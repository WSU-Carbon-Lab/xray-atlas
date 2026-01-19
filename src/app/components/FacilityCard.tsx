"use client";

import Link from "next/link";
import { BuildingOfficeIcon, BeakerIcon, MapPinIcon } from "@heroicons/react/24/outline";

interface FacilityCardProps {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  facilityType: "SYNCHROTRON" | "FREE_ELECTRON_LASER" | "LAB_SOURCE";
  instrumentCount: number;
}

export function FacilityCard({
  id,
  name,
  city,
  country,
  facilityType,
  instrumentCount,
}: FacilityCardProps) {
  const location = [city, country].filter(Boolean).join(", ") || "Location unknown";

  const facilityTypeLabel = {
    SYNCHROTRON: "Synchrotron",
    FREE_ELECTRON_LASER: "Free Electron Laser",
    LAB_SOURCE: "Lab Source",
  }[facilityType];

  const facilityTypeColor = {
    SYNCHROTRON: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    FREE_ELECTRON_LASER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    LAB_SOURCE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  }[facilityType];

  return (
    <Link
      href={`/facilities/${id}`}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200/40 bg-white shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gray-300/60 hover:shadow-xl dark:border-gray-700/40 dark:bg-gray-800 dark:hover:border-gray-600/60"
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-6 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light">
              <BuildingOfficeIcon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {name}
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPinIcon className="h-4 w-4" />
                <span>{location}</span>
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${facilityTypeColor}`}>
            {facilityTypeLabel}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200/20 bg-white/60 p-4 backdrop-blur-sm dark:border-gray-700/20 dark:bg-gray-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <BeakerIcon className="h-4 w-4" />
            <span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {instrumentCount}
              </span>{" "}
              {instrumentCount === 1 ? "instrument" : "instruments"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
