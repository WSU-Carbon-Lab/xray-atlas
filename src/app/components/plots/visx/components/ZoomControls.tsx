/**
 * Zoom controls component for plot interaction
 * Provides reset button, zoom mode selector, and zoom instructions
 * Positioned in top right corner near legend
 */

import { useState } from "react";
import { THEME_COLORS } from "../../core/constants";
import type { ZoomMode } from "./MarqueeZoom";

type ZoomControlsProps = {
  dimensions: { width: number; height: number };
  isDark: boolean;
  isZoomed?: boolean;
  zoomMode?: ZoomMode;
  onReset?: () => void;
  onZoomModeChange?: (mode: ZoomMode) => void;
};

export function ZoomControls({
  dimensions,
  isDark,
  isZoomed = false,
  zoomMode = "default",
  onReset,
  onZoomModeChange,
}: ZoomControlsProps) {
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  // Position in top right corner with margin (120px from right, 10px from top)
  const controlsX = dimensions.width - 280;
  const controlsY = 10;

  const zoomModeLabels: Record<ZoomMode, string> = {
    default: "Both",
    horizontal: "Horizontal",
    vertical: "Vertical",
  };

  return (
    <g>
      <foreignObject
        x={controlsX}
        y={controlsY}
        width={270}
        height={32}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            backgroundColor: themeColors.legendBg,
            border: `1px solid ${themeColors.legendBorder}`,
            borderRadius: "6px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "11px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            position: "relative",
          }}
        >
          {isZoomed && onReset && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReset();
              }}
              style={{
                padding: "3px 8px",
                backgroundColor: themeColors.paper,
                border: `1px solid ${themeColors.legendBorder}`,
                borderRadius: "4px",
                color: themeColors.text,
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 500,
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = themeColors.plot;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = themeColors.paper;
              }}
            >
              Reset
            </button>
          )}
          {onZoomModeChange && (
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsModeMenuOpen(!isModeMenuOpen);
                }}
                style={{
                  padding: "3px 8px",
                  backgroundColor: themeColors.paper,
                  border: `1px solid ${themeColors.legendBorder}`,
                  borderRadius: "4px",
                  color: themeColors.text,
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 500,
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = themeColors.plot;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = themeColors.paper;
                }}
              >
                Zoom: {zoomModeLabels[zoomMode]} ▼
              </button>
              {isModeMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "4px",
                    backgroundColor: themeColors.legendBg,
                    border: `1px solid ${themeColors.legendBorder}`,
                    borderRadius: "6px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                    minWidth: "120px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(["default", "horizontal", "vertical"] as ZoomMode[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onZoomModeChange(mode);
                          setIsModeMenuOpen(false);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "6px 12px",
                          textAlign: "left",
                          backgroundColor:
                            zoomMode === mode
                              ? themeColors.plot
                              : "transparent",
                          border: "none",
                          color: themeColors.text,
                          cursor: "pointer",
                          fontSize: "11px",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            themeColors.plot;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            zoomMode === mode
                              ? themeColors.plot
                              : "transparent";
                        }}
                      >
                        {zoomModeLabels[mode]}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
          <span
            style={{
              color: themeColors.text,
              fontSize: "11px",
              opacity: 0.7,
              whiteSpace: "nowrap",
            }}
          >
            Pan: Drag | Zoom: Shift+Drag
          </span>
        </div>
      </foreignObject>
      {isModeMenuOpen && (
        <rect
          x={0}
          y={0}
          width={dimensions.width}
          height={dimensions.height}
          fill="transparent"
          onClick={() => setIsModeMenuOpen(false)}
          style={{ cursor: "default" }}
        />
      )}
    </g>
  );
}
