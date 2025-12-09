"use client";

import { useEffect } from "react";
import { getCursorForType, type CursorType } from "../utils/cursorUtils";

/**
 * Custom hook that applies a custom cursor to the document body based on the active tool state.
 * The cursor changes to match the icon of the active button in AnalysisToolbar.
 *
 * @param cursorType - The type of cursor to display, or null/undefined to use default cursor
 *
 * @example
 * ```tsx
 * useCustomCursor(isSelectingPreEdge ? "pre-edge" : null);
 * ```
 */
export function useCustomCursor(
  cursorType: CursorType | null | undefined,
): void {
  useEffect(() => {
    // SSR safety check - only run in browser
    if (typeof document === "undefined") {
      return;
    }

    const body = document.body;
    if (!body) {
      return;
    }

    // Apply cursor if type is provided
    if (cursorType) {
      const cursorValue = getCursorForType(cursorType);
      body.style.cursor = cursorValue;
    } else {
      // Reset to default cursor
      body.style.cursor = "";
    }

    // Cleanup function to reset cursor when component unmounts or cursor type changes
    return () => {
      if (body) {
        body.style.cursor = "";
      }
    };
  }, [cursorType]);
}
