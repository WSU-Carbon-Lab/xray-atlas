import type { ReactElement, ReactNode } from "react";
import { NexafsCoreAbsorptionSchematic } from "~/components/nexafs/nexafs-core-absorption-schematic";

/**
 * Renders the wiki landing hero card with introductory copy and the animated
 * NEXAFS core-absorption schematic from the legacy `/wiki/home` layout.
 *
 * @param props.title - Page heading rendered as `h1` inside the hero card.
 * @param props.children - Introductory MDX prose shown beside the schematic on large viewports.
 */
export function WikiLandingHero({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <header className="border-border bg-surface/80 @container relative mb-6 overflow-hidden rounded-2xl border px-6 py-8 sm:px-8 lg:py-10">
      <h1 className="text-foreground mb-6 text-3xl font-bold sm:text-4xl">
        {title}
      </h1>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
      >
        <div className="from-accent/40 absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br to-transparent blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-violet-500/30 to-transparent blur-3xl" />
      </div>
      <div className="relative flex w-full min-w-0 flex-col gap-6 @lg:flex-row @lg:items-center @lg:gap-8">
        <div className="min-w-0 space-y-4 @lg:min-w-0 @lg:flex-[1.05_1_0] [&_p]:max-w-[65ch] [&_p]:text-base [&_p]:leading-relaxed sm:[&_p]:text-lg @lg:[&_p]:max-w-none">
          {children}
        </div>
        <div className="w-full min-w-0 @lg:flex-[1.22_1_0]">
          <NexafsCoreAbsorptionSchematic
            presentation="hero"
            className="min-h-0"
          />
        </div>
      </div>
    </header>
  );
}
