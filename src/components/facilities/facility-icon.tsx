"use client";

import { useEffect, useState } from "react";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";

interface FacilityIconProps {
  name: string;
  faviconUrl?: string | null;
  className?: string;
  iconClassName?: string;
}

function FacilityBuildingFallback({
  name,
  className,
  iconClassName,
}: {
  name: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "bg-accent/10 text-accent dark:bg-accent-soft-hover flex shrink-0 items-center justify-center rounded-lg dark:text-accent",
        className,
      )}
      aria-label={`${name} icon`}
    >
      <BuildingOfficeIcon
        className={cn("h-6 w-6 stroke-[1.5]", iconClassName)}
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
  className,
  iconClassName,
}: FacilityIconProps) {
  const trimmed = faviconUrl?.trim() ?? "";
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [trimmed]);

  if (!trimmed || imageFailed) {
    return (
      <FacilityBuildingFallback
        name={name}
        className={className}
        iconClassName={iconClassName}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-accent/10 flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
        className,
      )}
      aria-label={`${name} icon`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={trimmed}
        alt=""
        width={24}
        height={24}
        className={cn("h-6 w-6 object-contain", iconClassName)}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}
