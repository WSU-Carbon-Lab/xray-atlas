import { cn } from "@heroui/styles";
import type { ReactElement } from "react";
import { getBlogCategory } from "~/lib/content/blog-categories";
import type { BlogTeaserEntry } from "~/lib/content/blog-loader";

function hashSlugHash(slugHash: string): number {
  let hash = 0;
  for (let index = 0; index < slugHash.length; index += 1) {
    hash = (hash * 31 + slugHash.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function teaserTilePalette(slugHash: string): { primary: string; secondary: string } {
  const hash = hashSlugHash(slugHash);
  const hueA = hash % 360;
  const hueB = (hueA + 40 + (hash % 80)) % 360;
  return {
    primary: `oklch(0.52 0.1 ${hueA})`,
    secondary: `oklch(0.68 0.06 ${hueB})`,
  };
}

function TeaserTile({ slugHash, title }: { slugHash: string; title: string }): ReactElement {
  const { primary, secondary } = teaserTilePalette(slugHash);
  const hash = hashSlugHash(slugHash);
  const variant = hash % 3;
  const gradientId = `teaser-tile-${slugHash}`;

  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label={title}
      className="bg-surface h-full w-full opacity-60"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill={`url(#${gradientId})`} />
      {variant === 0 ? (
        <>
          <circle cx="520" cy="80" r="120" fill="oklch(1 0 0 / 0.08)" />
          <circle cx="120" cy="280" r="90" fill="oklch(0 0 0 / 0.06)" />
        </>
      ) : null}
      {variant === 1 ? (
        <path
          d="M0 220 C 160 120, 320 320, 640 180 L 640 360 L 0 360 Z"
          fill="oklch(1 0 0 / 0.1)"
        />
      ) : null}
      {variant === 2 ? (
        <>
          <rect
            x="48"
            y="48"
            width="180"
            height="180"
            rx="24"
            fill="oklch(1 0 0 / 0.08)"
          />
          <rect
            x="360"
            y="132"
            width="220"
            height="96"
            rx="16"
            fill="oklch(0 0 0 / 0.06)"
          />
        </>
      ) : null}
    </svg>
  );
}

function TeaserCard({ entry }: { entry: BlogTeaserEntry }): ReactElement {
  const category = getBlogCategory(entry.category);
  const kicker = category?.kicker ?? entry.category;

  return (
    <article
      className={cn(
        "border-border bg-surface/60 overflow-hidden rounded-xl border opacity-80",
      )}
      aria-label={`${entry.displayTitle} (in progress)`}
    >
      <div className="aspect-[16/10] overflow-hidden">
        <TeaserTile slugHash={entry.slugHash} title={entry.displayTitle} />
      </div>
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-muted font-semibold tracking-[0.14em] uppercase">
            {kicker}
          </span>
          <span className="border-border bg-surface text-muted rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.12em] uppercase">
            In progress
          </span>
        </div>
        <h2 className="text-muted text-lg font-semibold tracking-tight">
          {entry.displayTitle}
        </h2>
      </div>
    </article>
  );
}

/**
 * Renders non-interactive work-in-progress teaser cards at the bottom of blog indexes.
 */
export function BlogTeaserSection({
  teasers,
}: {
  teasers: BlogTeaserEntry[];
}): ReactElement | null {
  if (teasers.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="blog-in-the-works-heading" className="mt-10 space-y-6 pt-4">
      <div className="space-y-2">
        <h2
          id="blog-in-the-works-heading"
          className="font-display text-foreground text-2xl font-semibold tracking-tight"
        >
          In the works
        </h2>
        <p className="text-muted text-sm leading-6">
          Topics we are drafting now. These previews are not published posts yet.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {teasers.map((entry) => (
          <TeaserCard key={entry.slugHash} entry={entry} />
        ))}
      </div>
    </section>
  );
}
