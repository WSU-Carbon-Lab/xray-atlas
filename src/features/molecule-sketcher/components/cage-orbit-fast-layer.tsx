"use client";

import { useMemo } from "react";

import { bondDepthTierStyles } from "~/lib/molecule-svg-3d-perspective";

import type { CageOrbitWireframeFrame } from "../utils/cage-template-placement";
import { MOLECULE_2D_BOND_LINE_CAP, MOLECULE_2D_BOND_STROKE_WIDTH } from "../utils/molecule-2d-depiction-style";
import {
  moleculeToScreen,
  type DrawViewTransform,
} from "../utils/molecule-draw-geometry";

export interface CageOrbitFastLayerProps {
  frame: CageOrbitWireframeFrame;
  baseTransform: DrawViewTransform;
  isDark: boolean;
}

/**
 * Renders cage bonds as direct SVG line segments during orbit drag.
 *
 * Bond endpoints are mapped with the frozen base transform only; the parent
 * pan/zoom group applies viewport motion so coordinates stay aligned with OCL
 * depiction. Uses the same depth-tier stroke colors as OpenChemLib 3D mode
 * while skipping `toSVG` regeneration on every animation frame.
 */
export function CageOrbitFastLayer({
  frame,
  baseTransform,
  isDark,
}: CageOrbitFastLayerProps) {
  const tierStyles = useMemo(() => bondDepthTierStyles(isDark), [isDark]);

  const bondElements = useMemo(() => {
    const sorted = [...frame.bonds].sort((left, right) => {
      if (left.tier === right.tier) {
        return 0;
      }
      return left.tier === "back" ? -1 : 1;
    });
    return sorted.map((bond, index) => {
      const start = moleculeToScreen(baseTransform, { x: bond.x0, y: bond.y0 });
      const end = moleculeToScreen(baseTransform, { x: bond.x1, y: bond.y1 });
      const style = tierStyles[bond.tier];
      const strokeWidth = MOLECULE_2D_BOND_STROKE_WIDTH * style.strokeWidthScale;
      return (
        <line
          key={`${bond.atom0}:${bond.atom1}:${index}`}
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={style.stroke}
          strokeOpacity={bond.tier === "back" ? style.opacity : undefined}
          strokeWidth={strokeWidth}
          strokeLinecap={MOLECULE_2D_BOND_LINE_CAP}
          pointerEvents="none"
        />
      );
    });
  }, [frame.bonds, tierStyles, baseTransform]);

  return <g pointerEvents="none">{bondElements}</g>;
}
