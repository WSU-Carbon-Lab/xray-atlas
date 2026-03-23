"use client";

import type { ReactNode } from "react";

export type PlotRailId = "navigation" | "display" | "analysis";

export type PlotRailAxis = "vertical" | "horizontal";

export type PlotRailDefinition = {
  id: PlotRailId;
  axis: PlotRailAxis;
  render: () => ReactNode;
  isAvailable?: boolean;
};

export type PlotRailExpansionState = Record<PlotRailId, boolean>;
