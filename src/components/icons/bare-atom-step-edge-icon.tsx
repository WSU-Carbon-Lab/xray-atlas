import type { SVGProps } from "react";

export type BareAtomStepEdgeIconProps = SVGProps<SVGSVGElement>;

/**
 * Renders a minimal NEXAFS-style bare-atom step-edge motif for toolbar toggles; strokes use `currentColor` so theme and state styles apply.
 */
export function BareAtomStepEdgeIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...rest
}: BareAtomStepEdgeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 134.82 88.2"
      className={className}
      fill="none"
      aria-hidden={ariaHidden}
      {...rest}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={5}
        vectorEffect="nonScalingStroke"
      >
        <path d="M10 70.56 L36.55 74.38" />
        <path d="M36.86 78.03 L37.16 10" />
        <path d="M38.81 10.67 L124.81 69.8" />
      </g>
    </svg>
  );
}
