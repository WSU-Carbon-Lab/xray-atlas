import { cn } from "@heroui/styles";

/** Props for {@link PivotAngleIcon}. */
export interface PivotAngleIconProps {
  /** Optional Tailwind class names merged onto the root SVG. */
  className?: string;
}

/**
 * Renders a compact pivot/angle glyph for layout toolbar controls: two rays meeting at
 * a vertex, a small interior arc marking the angle, and a single curved arrow between
 * the rays suggesting rotation about the vertex.
 */
export function PivotAngleIcon({ className }: PivotAngleIconProps) {
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
      <line x1={5} y1={14} x2={15} y2={14} {...common} />
      <line x1={5} y1={14} x2={13} y2={6} {...common} />
      <path d="M 8.5 14 A 3.5 3.5 0 0 0 6.4 11.1" {...common} />
      <path d="M 10.8 13.7 A 5.5 5.5 0 0 0 11.3 7.8" {...common} />
      <path d="M 11.3 7.8 L 9.9 8.4" {...common} />
      <path d="M 11.3 7.8 L 10.7 9.2" {...common} />
    </svg>
  );
}
