"use client";

import { User } from "lucide-react";
import type { ComponentProps } from "react";
import { ContributorAvatarGroup } from "~/components/attribution/contributor-avatar-group";
import type { UserWithOrcid } from "~/components/ui/avatar";

export type ContributorsOrEmptyProps = {
  users: UserWithOrcid[];
  overlay?: boolean;
  empty?: "placeholder" | "hidden";
} & Pick<ComponentProps<typeof ContributorAvatarGroup>, "size" | "max">;

/**
 * Renders stacked contributor avatars, or a muted empty placeholder when `empty` is `placeholder`.
 */
export function ContributorsOrEmpty({
  users,
  overlay,
  empty = "placeholder",
  size = "sm",
  max,
}: ContributorsOrEmptyProps) {
  if (users.length > 0) {
    return <ContributorAvatarGroup users={users} size={size} max={max} />;
  }
  if (empty === "hidden") {
    return null;
  }
  return (
    <span
      className={`flex items-center gap-1.5 text-xs ${
        overlay ? "text-slate-700 dark:text-slate-200" : "text-text-tertiary"
      }`}
      title="No contributors"
    >
      <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
      No contributors
    </span>
  );
}
