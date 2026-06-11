import { cn } from "@heroui/styles";

/** Props for {@link AlignAxesIcon}. */
export interface AlignAxesIconProps {
  /** Optional Tailwind class names merged onto the root SVG. */
  className?: string;
}

/**
 * Renders a compact X/Y coordinate-axis glyph for the layout Align toolbar control:
 * horizontal X and vertical Y axes with stroked arrowheads at the positive ends, plus
 * short horizontal and vertical bond ticks hinting at alignment to those axes.
 */
export function AlignAxesIcon({ className }: AlignAxesIconProps) {
  const stroke = "currentColor";
  const common = {
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 20 20"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden
      fill="none"
    >
      <line x1={5} y1={15} x2={16} y2={15} {...common} />
      <line x1={5} y1={15} x2={5} y2={4} {...common} />
      <path d="M 16 15 L 14.2 13.8" {...common} />
      <path d="M 16 15 L 14.2 16.2" {...common} />
      <path d="M 5 4 L 3.8 5.8" {...common} />
      <path d="M 5 4 L 6.2 5.8" {...common} />
      <line x1={9} y1={11} x2={13} y2={11} {...common} />
      <line x1={8} y1={8} x2={8} y2={12} {...common} />
    </svg>
  );
}
