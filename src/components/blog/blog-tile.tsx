import { cn } from "@heroui/styles";
import type { ReactElement } from "react";

function hashSlug(slug: string): number {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function tilePalette(slug: string): { primary: string; secondary: string } {
  const hash = hashSlug(slug);
  const hueA = hash % 360;
  const hueB = (hueA + 40 + (hash % 80)) % 360;
  return {
    primary: `oklch(0.62 0.14 ${hueA})`,
    secondary: `oklch(0.78 0.08 ${hueB})`,
  };
}

/**
 * Renders a deterministic abstract tile from a blog slug when no hero image exists.
 */
export function BlogTile({
  slug,
  title,
  className,
}: {
  slug: string;
  title: string;
  className?: string;
}): ReactElement {
  const { primary, secondary } = tilePalette(slug);
  const hash = hashSlug(slug);
  const variant = hash % 3;

  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label={title}
      className={cn("bg-surface h-full w-full", className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`blog-tile-${slug}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill={`url(#blog-tile-${slug})`} />
      {variant === 0 ? (
        <>
          <circle cx="520" cy="80" r="120" fill="oklch(1 0 0 / 0.12)" />
          <circle cx="120" cy="280" r="90" fill="oklch(0 0 0 / 0.08)" />
        </>
      ) : null}
      {variant === 1 ? (
        <path
          d="M0 220 C 160 120, 320 320, 640 180 L 640 360 L 0 360 Z"
          fill="oklch(1 0 0 / 0.14)"
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
            fill="oklch(1 0 0 / 0.12)"
          />
          <rect
            x="360"
            y="132"
            width="220"
            height="96"
            rx="16"
            fill="oklch(0 0 0 / 0.08)"
          />
        </>
      ) : null}
    </svg>
  );
}
