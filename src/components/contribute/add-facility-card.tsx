"use client";

import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { ContributionCard } from "./contribution-card";

type AddFacilityCardProps = {
  className?: string;
  onClick: () => void;
};

export function AddFacilityCard({
  className = "",
  onClick,
}: AddFacilityCardProps) {
  return (
    <ContributionCard
      label="Link Facility and Instrument"
      description="Add a missing facility and its instruments to the database."
      icon={BuildingOfficeIcon}
      className={className}
      onClick={onClick}
    />
  );
}
