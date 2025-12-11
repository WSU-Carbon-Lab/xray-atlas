/**
 * Zoom controls component for plot interaction
 * Provides reset button and zoom instructions
 * Positioned in top right corner near legend
 */

import { THEME_COLORS } from "../../core/constants";

type ZoomControlsProps = {
  dimensions: { width: number; height: number };
  isDark: boolean;
  isZoomed?: boolean;
  onReset?: () => void;
};

export function ZoomControls({
  dimensions,
  isDark,
  isZoomed = false,
  onReset,
}: ZoomControlsProps) {
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  // Position in top right corner with margin (120px from right, 10px from top)
  const controlsX = dimensions.width - 160;
  const controlsY = 10;

  return (
    <g>
      <foreignObject
        x={controlsX}
        y={controlsY}
        width={150}
        height={32}
        style={{ overflow: "hidden" }}
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
          <span
            style={{
              color: themeColors.text,
              fontSize: "11px",
              opacity: 0.7,
              whiteSpace: "nowrap",
            }}
          >
            Pan: Drag | Zoom: Scroll
          </span>
        </div>
      </foreignObject>
    </g>
  );
}
