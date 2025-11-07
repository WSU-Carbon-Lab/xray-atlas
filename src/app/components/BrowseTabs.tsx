"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BeakerIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";

export function BrowseTabs() {
  const pathname = usePathname();
  const isMolecules = pathname?.startsWith("/browse/molecules") || pathname === "/browse";
  const isFacilities = pathname?.startsWith("/browse/facilities");

  return (
    <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        <Link
          href="/browse/molecules"
          className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
            isMolecules
              ? "border-wsu-crimson text-wsu-crimson"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          <BeakerIcon
            className={`-ml-0.5 mr-2 h-5 w-5 ${
              isMolecules ? "text-wsu-crimson" : "text-gray-400 group-hover:text-gray-500"
            }`}
          />
          Molecules
        </Link>
        <Link
          href="/browse/facilities"
          className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
            isFacilities
              ? "border-wsu-crimson text-wsu-crimson"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          <BuildingOfficeIcon
            className={`-ml-0.5 mr-2 h-5 w-5 ${
              isFacilities ? "text-wsu-crimson" : "text-gray-400 group-hover:text-gray-500"
            }`}
          />
          Facilities
        </Link>
      </nav>
    </div>
  );
}
