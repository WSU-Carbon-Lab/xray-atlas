declare module "react-plotly.js" {
  import type { ComponentType, CSSProperties } from "react";
  import type { Layout, Config, Data } from "plotly.js";

  export interface PlotParams {
    data: Partial<Data>[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    onSelected?: (event: unknown) => void;
    onDeselect?: () => void;
    style?: CSSProperties;
    useResizeHandler?: boolean;
  }

  const PlotlyComponent: ComponentType<PlotParams>;
  export default PlotlyComponent;
}
