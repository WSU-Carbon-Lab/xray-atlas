"use client";

import { memo } from "react";
import { Area } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import type { ChartScales } from "./types";
import type { LinkedOpticalAreaBand } from "../utils/linked-optical-area-bands";

const LINKED_AREA_FILL_OPACITY = 0.38;

export const ChartLinkedOpticalAreaBands = memo(
  function ChartLinkedOpticalAreaBands({
    bands,
    scales,
    idPrefix = "linked-area",
  }: {
    bands: readonly LinkedOpticalAreaBand[];
    scales: ChartScales;
    idPrefix?: string;
  }) {
    if (!scales || bands.length === 0) {
      return null;
    }

    return (
      <g>
        {bands.map((band, index) => {
          if (band.points.length === 0) {
            return null;
          }
          return (
            <Area
              key={`${idPrefix}-${band.geometryKey}-${index}`}
              data={[...band.points]}
              x={(d) => scales.xScale(d.x)}
              y0={(d) => scales.yScale(d.y0)}
              y1={(d) => scales.yScale(d.y1)}
              fill={band.color}
              fillOpacity={LINKED_AREA_FILL_OPACITY}
              curve={curveLinear}
            />
          );
        })}
      </g>
    );
  },
);
