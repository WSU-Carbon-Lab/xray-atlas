import { cpkHexForElementSymbol } from "~/lib/molecule-svg-cpk-theme";
import { MOLECULE_SVG_FONT_FAMILY_INLINE } from "~/lib/molecule-svg-typography";
import { parseAbbreviatedAlkylFormula } from "../utils/alkyl-label-expand";
import {
  atomLabelHaloStrokeHex,
  MOLECULE_2D_ATOM_LABEL_FONT_SIZE,
  MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT,
  MOLECULE_2D_ATOM_LABEL_HALO_STROKE_WIDTH,
  MOLECULE_2D_ATOM_LABEL_Y_OFFSET,
  MOLECULE_2D_SUBSCRIPT_BASELINE_SHIFT_EM,
  MOLECULE_2D_SUBSCRIPT_FONT_SCALE,
} from "../utils/molecule-2d-depiction-style";

interface Molecule2dFormulaLabelProps {
  x: number;
  y: number;
  label: string;
  isDark: boolean;
}

/**
 * Renders an abbreviated CnH2n+1 alkyl label with uniform atom-label sizing,
 * CPK element colors, and true subscripts on the draw canvas.
 */
export function Molecule2dAlkylFormulaLabel({
  x,
  y,
  label,
  isDark,
}: Molecule2dFormulaLabelProps) {
  const parsed = parseAbbreviatedAlkylFormula(label);
  const halo = atomLabelHaloStrokeHex(isDark);
  const baseY = y + MOLECULE_2D_ATOM_LABEL_Y_OFFSET;
  const subSize = `${MOLECULE_2D_SUBSCRIPT_FONT_SCALE}em`;
  const subShift = `${MOLECULE_2D_SUBSCRIPT_BASELINE_SHIFT_EM}em`;

  if (parsed === null) {
    return (
      <text
        x={x}
        y={baseY}
        textAnchor="middle"
        fontFamily={MOLECULE_SVG_FONT_FAMILY_INLINE}
        fontSize={MOLECULE_2D_ATOM_LABEL_FONT_SIZE}
        fontWeight={MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT}
        fill={cpkHexForElementSymbol("C", isDark)}
        style={{ paintOrder: "stroke" }}
        stroke={halo}
        strokeWidth={MOLECULE_2D_ATOM_LABEL_HALO_STROKE_WIDTH}
      >
        {label}
      </text>
    );
  }

  const nText = String(parsed.n);
  const hText = String(parsed.h);

  return (
    <text
      x={x}
      y={baseY}
      textAnchor="middle"
      fontFamily={MOLECULE_SVG_FONT_FAMILY_INLINE}
      fontSize={MOLECULE_2D_ATOM_LABEL_FONT_SIZE}
      fontWeight={MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT}
      style={{ paintOrder: "stroke" }}
      stroke={halo}
      strokeWidth={MOLECULE_2D_ATOM_LABEL_HALO_STROKE_WIDTH}
    >
      <tspan fill={cpkHexForElementSymbol("C", isDark)}>C</tspan>
      <tspan
        fill={cpkHexForElementSymbol("C", isDark)}
        fontSize={subSize}
        baselineShift={subShift}
      >
        {nText}
      </tspan>
      <tspan fill={cpkHexForElementSymbol("H", isDark)}>H</tspan>
      <tspan
        fill={cpkHexForElementSymbol("H", isDark)}
        fontSize={subSize}
        baselineShift={subShift}
      >
        {hText}
      </tspan>
    </text>
  );
}
