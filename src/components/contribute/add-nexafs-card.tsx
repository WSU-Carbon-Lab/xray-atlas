"use client";

import { BoltIcon } from "@heroicons/react/24/outline";
import { ContributionCard } from "./contribution-card";

type AddNexafsCardProps = {
  className?: string;
  fullWidth?: boolean;
} & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

export function AddNexafsCard(props: AddNexafsCardProps) {
  const { className = "", fullWidth, ...rest } = props;
  const cardProps =
    "href" in rest && rest.href
      ? { href: rest.href }
      : { onClick: rest.onClick! };
  return (
    <ContributionCard
      label="Upload NEXAFS Experiment"
      description="Contribute Near-Edge X-ray Absorption Fine Structure data with geometry and spectral datasets."
      subDescription="Share a new spectrum with the community."
      icon={BoltIcon}
      className={className}
      fullWidth={fullWidth}
      {...cardProps}
    />
  );
}
