"use client";

import type { ComponentProps } from "react";
import { AvatarGroup } from "~/components/ui/avatar";

export type ContributorAvatarGroupProps = Omit<
  ComponentProps<typeof AvatarGroup>,
  "tooltipVariant" | "tooltipMode" | "contributorAvatars"
>;

/**
 * Stacked contributor avatars with a shared hover popover (caret tracks the hovered avatar; avatars stay fixed).
 */
export function ContributorAvatarGroup(props: ContributorAvatarGroupProps) {
  return (
    <AvatarGroup
      {...props}
      tooltipVariant="name-orcid"
      tooltipMode="shared"
      contributorAvatars
    />
  );
}
