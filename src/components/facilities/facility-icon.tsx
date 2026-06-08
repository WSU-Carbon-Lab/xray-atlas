"use client";

import { useEffect, useState } from "react";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";

/** Preset tile dimensions for browse list, detail header, and admin preview surfaces. */
export type FacilityIconSize = "sm" | "md" | "lg";

interface FacilityIconProps {
  name: string;
  faviconUrl?: string | null;
  /** Tile preset; `md` suits browse facility cards. */
  size?: FacilityIconSize;
  /** When true, hides the tile from assistive tech (use beside visible facility name). */
  decorative?: boolean;
  className?: string;
  iconClassName?: string;
}

const facilityIconSizeClasses: Record<
  FacilityIconSize,
  { tile: string; padding: string; building: string }
> = {
  sm: {
    tile: "h-9 w-9 rounded-lg",
    padding: "p-1.5",
    building: "h-5 w-5",
  },
  md: {
    tile: "h-11 w-11 rounded-xl sm:h-12 sm:w-12",
    padding: "p-2 sm:p-2.5",
    building: "h-6 w-6 sm:h-7 sm:w-7",
  },
  lg: {
    tile: "h-14 w-14 rounded-xl sm:h-16 sm:w-16",
    padding: "p-2.5 sm:p-3",
    building: "h-8 w-8 sm:h-9 sm:w-9",
  },
};

const facilityIconTileClass =
  "border-border bg-surface-secondary ring-border/50 flex shrink-0 items-center justify-center overflow-hidden border ring-1 transition-colors";

function FacilityBuildingFallback({
  name,
  size,
  decorative,
  className,
  iconClassName,
}: {
  name: string;
  size: FacilityIconSize;
  decorative?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const sizeStyles = facilityIconSizeClasses[size];

  return (
    <div
      className={cn(
        facilityIconTileClass,
        "bg-accent/10 text-accent dark:bg-accent-soft-hover dark:text-accent",
        sizeStyles.tile,
        sizeStyles.padding,
        className,
      )}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `${name} icon`}
    >
      <BuildingOfficeIcon
        className={cn("stroke-[1.5]", sizeStyles.building, iconClassName)}
        aria-hidden
      />
    </div>
  );
}

/**
 * Renders a facility list or header icon using a cached favicon when available,
 * otherwise the standard building glyph. Falls back to the building glyph when
 * the favicon URL fails to load in the browser.
 */
export function FacilityIcon({
  name,
  faviconUrl,
  size = "md",
  decorative = false,
  className,
  iconClassName,
}: FacilityIconProps) {
  const trimmed = faviconUrl?.trim() ?? "";
  const [imageFailed, setImageFailed] = useState(false);
  const sizeStyles = facilityIconSizeClasses[size];

  useEffect(() => {
    setImageFailed(false);
  }, [trimmed]);

  if (!trimmed || imageFailed) {
    return (
      <FacilityBuildingFallback
        name={name}
        size={size}
        decorative={decorative}
        className={className}
        iconClassName={iconClassName}
      />
    );
  }

  return (
    <div
      className={cn(
        facilityIconTileClass,
        sizeStyles.tile,
        sizeStyles.padding,
        className,
      )}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `${name} icon`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={trimmed}
        alt=""
        width={48}
        height={48}
        className={cn("h-full w-full object-contain", iconClassName)}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}
