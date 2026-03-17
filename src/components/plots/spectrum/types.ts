import type { ScaleLinear } from "d3-scale";

export type ChartScales = {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
};
