/**
 * Hook for generating normalization region shapes
 */

import { useMemo } from "react";
import type { Layout } from "plotly.js";
import type { NormalizationRegions } from "../core/types";
import { NORMALIZATION_COLORS } from "../core/constants";

/**
 * Generate Plotly shapes for normalization regions
 */
export function useNormalizationShapes(
  normalizationRegions: NormalizationRegions | undefined,
): Layout["shapes"] {
  return useMemo(() => {
    if (!normalizationRegions) return [];

    const shapes: Layout["shapes"] = [];
    const { pre, post } = normalizationRegions;

    if (pre && pre[0] !== pre[1]) {
      shapes.push({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: pre[0],
        x1: pre[1],
        y0: 0,
        y1: 1,
        fillcolor: NORMALIZATION_COLORS.pre,
        line: { width: 0 },
      });
    }

    if (post && post[0] !== post[1]) {
      shapes.push({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: post[0],
        x1: post[1],
        y0: 0,
        y1: 1,
        fillcolor: NORMALIZATION_COLORS.post,
        line: { width: 0 },
      });
    }

    return shapes;
  }, [normalizationRegions]);
}
