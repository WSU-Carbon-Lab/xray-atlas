/**
 * Main hook coordinating all peak interaction handlers
 */

import { useRef, type RefObject } from "react";
import type { Layout } from "plotly.js";
import type { Peak } from "../core/types";
import { usePeakKeyboard } from "./usePeakKeyboard";
import { usePeakClickHandler } from "./usePeakClickHandler";
import { usePeakDragHandler } from "./usePeakDragHandler";

export type PeakInteractionsResult = {
  plotRef: RefObject<HTMLDivElement>;
};

/**
 * Coordinate all peak interaction handlers
 */
export function usePeakInteractions(
  peaks: Peak[],
  selectedPeakId: string | null,
  isManualPeakMode: boolean,
  onPeakAdd: ((energy: number) => void) | undefined,
  onPeakSelect: ((peakId: string | null) => void) | undefined,
  onPeakDelete: ((peakId: string) => void) | undefined,
  onPeakUpdate: ((peakId: string, energy: number) => void) | undefined,
  combinedLayout: Layout,
): PeakInteractionsResult {
  const plotRef = useRef<HTMLDivElement>(null);

  // Set up keyboard handlers
  usePeakKeyboard(plotRef, selectedPeakId, onPeakDelete);

  // Set up click handlers
  usePeakClickHandler(
    plotRef,
    peaks,
    selectedPeakId,
    isManualPeakMode,
    onPeakAdd,
    onPeakSelect,
    combinedLayout,
  );

  // Set up drag handlers
  usePeakDragHandler(plotRef, peaks, onPeakUpdate, combinedLayout);

  return {
    plotRef,
  };
}
