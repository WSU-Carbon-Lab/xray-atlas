import type { ReactElement, ReactNode } from "react";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { AccentNavChip } from "@/components/ui/accent-nav-chip";
import { cn } from "@heroui/styles";

/**
 * Hero onboarding rail: wiki quick-start as the primary accent chip, optional blog
 * announcement as a secondary typographic link separated by a vertical rule on md+.
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
        "flex w-full max-w-2xl flex-col items-center gap-2 sm:gap-2.5 md:flex-row md:flex-wrap md:justify-center md:gap-x-3",
        className,
      )}
    >
      <AccentNavChip
        href="/wiki/nexafs"
        label="Quick start: NEXAFS terminology & data guide"
        icon={BookOpenIcon}
      />
      {blogAnnouncement ? (
        <>
          <span
            className="bg-border hidden h-4 w-px shrink-0 md:block"
            aria-hidden
          />
          <div className="flex min-w-0 max-w-full justify-center md:justify-start">
            {blogAnnouncement}
          </div>
        </>
      ) : null}
    </div>
  );
}
