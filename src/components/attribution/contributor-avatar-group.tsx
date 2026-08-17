"use client";

import type { ComponentProps } from "react";
import { AvatarGroup } from "~/components/ui/avatar";

export type ContributorAvatarGroupProps = Omit<
  ComponentProps<typeof AvatarGroup>,
  "tooltipVariant" | "tooltipMode" | "contributorAvatars"
>;

/**
 * Stacked contributor avatars with a shared hover popover, default max of three
 * visible faces, circular charcoal `+N` overflow with knockout rings, and
 * expand-on-hover for the rest.
 */
export function ContributorAvatarGroup({
  max = 3,
  expandOnHover = true,
  ...props
}: ContributorAvatarGroupProps) {
  return (
    <AvatarGroup
      {...props}
      max={max}
      expandOnHover={expandOnHover}
      tooltipVariant="name-orcid"
      tooltipMode="shared"
      contributorAvatars
    />
  );
}
