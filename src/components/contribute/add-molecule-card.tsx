"use client";

import { BeakerIcon } from "@heroicons/react/24/outline";
import { ContributionCard } from "./contribution-card";

type AddMoleculeCardProps = {
  className?: string;
  onClick: () => void;
};

export function AddMoleculeCard({
  className = "",
  onClick,
}: AddMoleculeCardProps) {
  return (
    <ContributionCard
      label="Contribute Molecule"
      description="Add a new molecule with its chemical properties, structure, and related data."
      icon={BeakerIcon}
      className={className}
      onClick={onClick}
    />
  );
}
