"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BeakerIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";

export function BrowseTabs() {
  const pathname = usePathname();
  const isMolecules = pathname?.startsWith("/browse/molecules") || pathname === "/browse";
  const isFacilities = pathname?.startsWith("/browse/facilities");

  return (
    <div className="border-border mb-8 border-b">
      <nav className="-mb-px flex space-x-8">
        <Link
          href="/browse/molecules"
          className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
            isMolecules
              ? "border-accent text-accent"
              : "text-muted border-transparent hover:border-border-strong hover:text-foreground"
          }`}
        >
          <BeakerIcon
            className={`-ml-0.5 mr-2 h-5 w-5 ${
              isMolecules ? "text-accent" : "text-muted group-hover:text-foreground"
            }`}
          />
          Molecules
        </Link>
        <Link
          href="/browse/facilities"
          className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
            isFacilities
              ? "border-accent text-accent"
              : "text-muted border-transparent hover:border-border-strong hover:text-foreground"
          }`}
        >
          <BuildingOfficeIcon
            className={`-ml-0.5 mr-2 h-5 w-5 ${
              isFacilities ? "text-accent" : "text-muted group-hover:text-foreground"
            }`}
          />
          Facilities
        </Link>
      </nav>
    </div>
  );
}
