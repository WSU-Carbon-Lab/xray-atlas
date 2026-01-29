/**
 * Cursor mode selector component for plot overlay
 * Provides quick access to different interaction modes
 */

import { THEME_COLORS } from "../constants";
import {
  HandRaisedIcon,
  MagnifyingGlassIcon,
  CursorArrowRaysIcon,
  PencilIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

export type CursorMode = "pan" | "zoom" | "select" | "peak" | "inspect";

type CursorModeSelectorProps = {
  dimensions: { width: number; height: number };
  isDark: boolean;
  currentMode: CursorMode;
  onModeChange: (mode: CursorMode) => void;
  availableModes?: CursorMode[];
  showLabels?: boolean;
};

const MODE_CONFIG: Record<
  CursorMode,
  {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    tooltip: string;
  }
> = {
  pan: {
    icon: HandRaisedIcon,
    label: "Pan",
    tooltip: "Pan horizontally (drag left/right)",
  },
  zoom: {
    icon: MagnifyingGlassIcon,
    label: "Zoom",
    tooltip: "Zoom with marquee selection (Shift+drag)",
  },
  select: {
    icon: CursorArrowRaysIcon,
    label: "Select",
    tooltip: "Select region for normalization",
  },
  peak: {
    icon: PencilIcon,
    label: "Peak",
    tooltip: "Add or edit peaks (click on plot)",
  },
  inspect: {
    icon: EyeIcon,
    label: "Inspect",
    tooltip: "Inspect values (hover to see data)",
  },
};

export function CursorModeSelector({
  dimensions,
  isDark,
  currentMode,
  onModeChange,
  availableModes = ["pan", "zoom", "select", "peak", "inspect"],
  showLabels = false,
}: CursorModeSelectorProps) {
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  // Position centered horizontally at top
  const controlsX = (dimensions.width - (showLabels ? 280 : 120)) / 2;
  const controlsY = 10;

  return (
    <g>
      <foreignObject
        x={controlsX}
        y={controlsY}
        width={showLabels ? 280 : 120}
        height={40}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 8px",
            backgroundColor: themeColors.legendBg,
            border: `1px solid ${themeColors.legendBorder}`,
            borderRadius: "8px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "11px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
            backdropFilter: "blur(8px)",
          }}
        >
          {availableModes.map((mode) => {
            const config = MODE_CONFIG[mode];
            if (!config) return null;

            const Icon = config.icon;
            const isActive = currentMode === mode;

            return (
              <button
                key={mode}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onModeChange(mode);
                }}
                title={config.tooltip}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  backgroundColor: isActive ? themeColors.plot : "transparent",
                  border: `1px solid ${
                    isActive ? themeColors.text : "transparent"
                  }`,
                  borderRadius: "6px",
                  color: isActive ? themeColors.text : themeColors.text,
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.2s ease",
                  opacity: isActive ? 1 : 0.7,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.backgroundColor = themeColors.plot;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.opacity = "0.7";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{
                    strokeWidth: isActive ? 2.5 : 2,
                  }}
                />
                {showLabels && (
                  <span style={{ whiteSpace: "nowrap" }}>{config.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </foreignObject>
    </g>
  );
}
