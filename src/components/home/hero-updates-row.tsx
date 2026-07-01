import type { ReactElement, ReactNode } from "react";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { AccentNavChip } from "@/components/ui/accent-nav-chip";
import { cn } from "@heroui/styles";

/**
 * Hero onboarding rail: wiki quick-start as the primary accent chip, optional blog
 * announcement as a secondary typographic link stacked below with vertical spacing.
 */
export function HeroUpdatesRow({
  blogAnnouncement,
  className,
}: {
  blogAnnouncement?: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={cn(
        "flex w-full max-w-2xl flex-col items-center gap-2 sm:gap-2.5",
        className,
      )}
    >
      <AccentNavChip
        href="/wiki/nexafs"
        label="Quick start: NEXAFS terminology & data guide"
        icon={BookOpenIcon}
      />
      {blogAnnouncement ? (
        <div className="flex min-w-0 max-w-full justify-center">
          {blogAnnouncement}
        </div>
      ) : null}
    </div>
  );
}
