import type { DrawBondKind } from "../molecule-draw-types";

/** Props for {@link BondKindGlyph}. */
export interface BondKindGlyphProps {
  /** Bond kind to depict as a miniature line icon. */
  kind: DrawBondKind;
}

/**
 * Renders a compact SVG icon for a bond kind in the bond-type popover.
 */
export function BondKindGlyph({ kind }: BondKindGlyphProps) {
  const stroke = "currentColor";
  const common = {
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
  };
  switch (kind) {
    case "single":
      return (
        <svg width={28} height={16} viewBox="0 0 28 16" aria-hidden>
          <line x1={4} y1={8} x2={24} y2={8} {...common} />
        </svg>
      );
    case "double":
      return (
        <svg width={28} height={16} viewBox="0 0 28 16" aria-hidden>
          <line x1={4} y1={6} x2={24} y2={6} {...common} />
          <line x1={4} y1={10} x2={24} y2={10} {...common} />
        </svg>
      );
    case "triple":
      return (
        <svg width={28} height={16} viewBox="0 0 28 16" aria-hidden>
          <line x1={4} y1={5} x2={24} y2={5} {...common} />
          <line x1={4} y1={8} x2={24} y2={8} {...common} />
          <line x1={4} y1={11} x2={24} y2={11} {...common} />
        </svg>
      );
    case "dative":
      return (
        <svg width={28} height={16} viewBox="0 0 28 16" aria-hidden>
          <line
            x1={4}
            y1={8}
            x2={20}
            y2={8}
            stroke={stroke}
            strokeWidth={1.5}
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <path d="M 20 5 L 24 8 L 20 11 z" fill={stroke} />
        </svg>
      );
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
