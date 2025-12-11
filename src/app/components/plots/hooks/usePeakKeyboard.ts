/**
 * Hook for handling keyboard interactions with peaks
 */

import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Set up keyboard handlers for peak deletion
 */
export function usePeakKeyboard(
  plotRef: RefObject<HTMLDivElement>,
  selectedPeakId: string | null,
  onPeakDelete: ((peakId: string) => void) | undefined,
): void {
  useEffect(() => {
    if (!plotRef.current) return;

    // Handle keyboard Delete key - use global listener to work during drag operations
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if a peak is selected and we're not typing in an input
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedPeakId &&
        onPeakDelete &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        event.stopPropagation();
        onPeakDelete(selectedPeakId);
      }
    };

    // Make plot container focusable for keyboard events
    if (plotRef.current instanceof HTMLElement) {
      plotRef.current.setAttribute("tabindex", "0");
      plotRef.current.addEventListener("keydown", handleKeyDown);
    }

    // Also add global keyboard listener to catch Delete key even during drag operations
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (plotRef.current instanceof HTMLElement) {
        plotRef.current.removeEventListener("keydown", handleKeyDown);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [plotRef, selectedPeakId, onPeakDelete]);
}
