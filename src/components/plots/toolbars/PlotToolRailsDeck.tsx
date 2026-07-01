"use client";

/**
 * Edge-mounted plot tool rails (left data, top navigation, right analysis, optional bottom).
 *
 * Layout invariant: parents pass the **full plotting canvas** `plotWidth` x `plotHeight` (SVG or
 * host box), not inner margin-subtracted plot area. Optional `railInsets` align rails with axis
 * spines (left/right/top/bottom margins) so controls sit inside the plot frame and avoid tick labels.
 */

import {
  Children,
  memo,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Button,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
} from "@heroui/react";
import {
  ArrowDownTrayIcon,
  EyeIcon,
  HandRaisedIcon,
  HomeIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Grip, GripHorizontal, GripVertical } from "lucide-react";
import type { CursorMode } from "../spectrum/ModeBar";
import type { PlotRailDefinition } from "./types";
import {
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarAttachedToolbarVerticalScrollClass,
  plotToolbarAttachedToggleGroupHorizontalClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  plotToolbarIconToolClass,
} from "./plot-toolbar-chrome";
import { PlotToolbarGroupSeparator } from "./plot-toolbar-group-separator";
import { PlotToolbarRichHint } from "./plot-toolbar-rich-hint";

/** Pixel insets that align rails with axis spines (inside the canvas, not on the outer border). */
export type PlotToolRailInsets = {
  left: number;
  right: number;
  top: number;
  /** Bottom margin height (x-axis band); bottom rail sits above this band inside the plot frame. */
  bottom: number;
};

/** Lifts the bottom rail slightly above the bottom spine into the inner plot area. */
const BOTTOM_RAIL_ABOVE_SPINE_PX = 8;

type PlotToolRailsDeckProps = {
  plotWidth: number;
  plotHeight: number;
  /** When set, left/top/right rails sit inside the plot frame at these offsets from the canvas edge. */
  railInsets?: PlotToolRailInsets;
  currentMode: CursorMode;
  isCursorDisabled: boolean;
  isPanDisabled: boolean;
  onCursorModeChange: (mode: CursorMode) => void;
  onResetZoom: () => void;
  onExportClick?: () => void;
  /**
   * Optional buttons or menus to the left of export in the top `ButtonGroup` (for example spectrum CSV download and copy). This deck does not modify unknown children; callers should wrap controls with `PlotToolbarRichHint` when hints are needed.
   */
  topRailLeadingExtras?: ReactNode;
  /**
   * Optional controls rendered in the top rail to the right of the cursor mode toggle group (inspect/zoom/pan). Each child becomes a direct sibling inside the same `Toolbar`, separated from the cursor cluster by a vertical divider.
   */
  topRailTrailingExtras?: ReactNode;
  displayTools?: ReactNode;
  analysisTools?: ReactNode;
  bottomTools?: ReactNode;
  /**
   * When true, omits the decorative vertical-rail grip `ButtonGroup` above the analysis stack so
   * dataset-style rails show only real tools. Tray mode still uses its own hover handles.
   */
  suppressAnalysisRailLeadingGrip?: boolean;
  /**
   * When true, rails begin collapsed in tray mode (hover edge handles to reveal toolbars).
   */
  initialTrayMode?: boolean;
};

type TraySide = "top" | "bottom" | "left" | "right";

const HANDLE_BUTTON_CLASS =
  "pointer-events-auto h-8 w-8 min-w-8 rounded-lg border border-(--border-default) bg-(--surface-glass)/55 text-(--text-secondary) shadow-sm backdrop-blur-sm opacity-75 transition duration-200 hover:bg-(--surface-2)/70 hover:text-(--text-primary) hover:opacity-100";

const TRAY_MODE_TOGGLE_CLASS =
  "pointer-events-auto absolute z-40 h-8 w-8 min-w-8 rounded-lg border border-(--border-default) bg-(--surface-glass)/55 text-(--text-secondary) shadow-sm backdrop-blur-sm opacity-80 hover:bg-(--surface-2)/70 hover:text-(--text-primary) hover:opacity-100";

const RAIL_EDGE_PAD = 4;

export const PlotToolRailsDeck = memo(function PlotToolRailsDeck({
  plotWidth,
  plotHeight,
  railInsets,
  currentMode,
  isCursorDisabled,
  isPanDisabled,
  onCursorModeChange,
  onResetZoom,
  onExportClick,
  topRailLeadingExtras,
  topRailTrailingExtras,
  displayTools,
  analysisTools,
  bottomTools,
  suppressAnalysisRailLeadingGrip = false,
  initialTrayMode = false,
}: PlotToolRailsDeckProps) {
  const [isTrayMode, setIsTrayMode] = useState(initialTrayMode);
  const [hoveredSide, setHoveredSide] = useState<TraySide | null>(null);

  const rails = useMemo<PlotRailDefinition[]>(() => {
    const leftRail: PlotRailDefinition = {
      id: "navigation",
      axis: "vertical",
      isAvailable: displayTools != null,
      render: () => displayTools,
    };

    const topRail: PlotRailDefinition = {
      id: "display",
      axis: "horizontal",
      isAvailable: true,
      render: () => (
        <Toolbar
          isAttached
          orientation="horizontal"
          aria-label="Plot navigation and cursor"
          className={plotToolbarAttachedToolbarHorizontalClass}
        >
          <ButtonGroup
            orientation="horizontal"
            variant="tertiary"
            aria-label="Reset zoom, data export, and plot export"
          >
            <PlotToolbarRichHint
              title="Reset zoom"
              description="Fit energy and absorption axes back to the data range."
            >
              <Button
                type="button"
                isIconOnly
                aria-label="Reset zoom"
                onPress={onResetZoom}
                className={plotToolbarIconToolClass}
              >
                <HomeIcon className="h-5 w-5" aria-hidden />
              </Button>
            </PlotToolbarRichHint>
            {topRailLeadingExtras != null
              ? Children.toArray(topRailLeadingExtras)
              : null}
            {!topRailLeadingExtras && onExportClick ? (
              <PlotToolbarRichHint
                title="Export plot"
                description="Open options to save the figure as an image."
              >
                <Button
                  type="button"
                  isIconOnly
                  aria-label="Export plot"
                  onPress={onExportClick}
                  className={plotToolbarIconToolClass}
                >
                  <ButtonGroup.Separator />
                  <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
                </Button>
              </PlotToolbarRichHint>
            ) : null}
          </ButtonGroup>
          <PlotToolbarGroupSeparator orientation="vertical" />
          <ToggleButtonGroup
            aria-label="Cursor interaction mode"
            selectionMode="single"
            orientation="horizontal"
            className={plotToolbarAttachedToggleGroupHorizontalClass}
            selectedKeys={
              new Set([
                currentMode === "inspect" ||
                currentMode === "zoom" ||
                currentMode === "pan"
                  ? currentMode
                  : "inspect",
              ])
            }
            onSelectionChange={(keys) => {
              if (isCursorDisabled) return;
              const next = keys.values().next().value;
              if (next === "inspect" || next === "zoom" || next === "pan") {
                onCursorModeChange(next);
              }
            }}
          >
            <PlotToolbarRichHint
              title="Inspect"
              description="Hover the spectrum to read coordinates and values."
              whenDisabledDescription="Exit normalization region editing to use plot cursors."
            >
              <ToggleButton
                isIconOnly
                id="inspect"
                aria-label="Inspect values"
                className={plotToolbarGlyphToggleGroupItemHorizontalClass}
                isDisabled={isCursorDisabled}
              >
                <EyeIcon className="h-5 w-5" aria-hidden />
              </ToggleButton>
            </PlotToolbarRichHint>
            <PlotToolbarRichHint
              title="Zoom"
              description="Drag horizontally to magnify energy or vertically to magnify absorption. Wheel over the left y-axis or bottom x-axis margin zooms absorption or energy at the cursor."
              whenDisabledDescription="Exit normalization region editing to use plot cursors."
            >
              <ToggleButton
                isIconOnly
                id="zoom"
                aria-label="Zoom region"
                className={plotToolbarGlyphToggleGroupItemHorizontalClass}
                isDisabled={isCursorDisabled}
              >
                <ToggleButtonGroup.Separator />
                <MagnifyingGlassIcon className="h-5 w-5" aria-hidden />
              </ToggleButton>
            </PlotToolbarRichHint>
            <PlotToolbarRichHint
              title="Pan"
              description="Drag to shift the visible energy and absorption window."
              whenDisabledDescription="Exit normalization region editing to use plot cursors."
              disabled={isCursorDisabled || isPanDisabled}
            >
              <ToggleButton
                isIconOnly
                id="pan"
                aria-label="Pan plot axes"
                className={plotToolbarGlyphToggleGroupItemHorizontalClass}
                isDisabled={isCursorDisabled || isPanDisabled}
              >
                <ToggleButtonGroup.Separator />
                <HandRaisedIcon className="h-5 w-5" aria-hidden />
              </ToggleButton>
            </PlotToolbarRichHint>
          </ToggleButtonGroup>
          {topRailTrailingExtras != null ? (
            <>
              <PlotToolbarGroupSeparator orientation="vertical" />
              {Children.toArray(topRailTrailingExtras)}
            </>
          ) : null}
        </Toolbar>
      ),
    };

    const rightRail: PlotRailDefinition = {
      id: "analysis",
      axis: "vertical",
      isAvailable: analysisTools != null,
      render: () => (
        <Toolbar
          isAttached
          aria-label="Analysis tools"
          orientation="vertical"
          className={plotToolbarAttachedToolbarVerticalScrollClass}
        >
          {!suppressAnalysisRailLeadingGrip ? (
            <>
              <ButtonGroup
                orientation="vertical"
                variant="tertiary"
                aria-label="Rail handle"
              >
                <PlotToolbarRichHint
                  title="Analysis rail"
                  description="Vertical stack for peaks, normalization, and related tools."
                  placement="left"
                >
                  <Button
                    type="button"
                    isIconOnly
                    aria-label="Analysis rail grip"
                    className={plotToolbarIconToolClass}
                  >
                    <GripVertical className="h-5 w-5" />
                  </Button>
                </PlotToolbarRichHint>
              </ButtonGroup>
              <PlotToolbarGroupSeparator orientation="horizontal" />
            </>
          ) : null}
          <div className="flex w-full flex-col items-center gap-1">{analysisTools}</div>
        </Toolbar>
      ),
    };

    const bottomRail: PlotRailDefinition = {
      id: "display",
      axis: "horizontal",
      isAvailable: bottomTools != null,
      render: () => bottomTools,
    };

    return [leftRail, topRail, rightRail, bottomRail];
  }, [
    analysisTools,
    bottomTools,
    currentMode,
    displayTools,
    isCursorDisabled,
    isPanDisabled,
    onCursorModeChange,
    onExportClick,
    onResetZoom,
    topRailLeadingExtras,
    topRailTrailingExtras,
    suppressAnalysisRailLeadingGrip,
  ]);

  const leftRail = rails[0];
  const topRail = rails[1];
  const rightRail = rails[2];
  const bottomRail = rails[3];

  const insetLeft = (railInsets?.left ?? RAIL_EDGE_PAD) + RAIL_EDGE_PAD;
  const insetRight = (railInsets?.right ?? RAIL_EDGE_PAD) + RAIL_EDGE_PAD;
  const insetTop = (railInsets?.top ?? RAIL_EDGE_PAD) + RAIL_EDGE_PAD;
  const insetBottom =
    (railInsets?.bottom ?? RAIL_EDGE_PAD) +
    RAIL_EDGE_PAD +
    BOTTOM_RAIL_ABOVE_SPINE_PX;
  const topRailLeft = insetLeft;
  const topRailRight = insetRight;
  const topRailWidth =
    plotWidth > topRailLeft + topRailRight
      ? plotWidth - topRailLeft - topRailRight
      : plotWidth;
  const bottomRailLeft = insetLeft;
  const bottomRailWidth = topRailWidth;

  return (
    <div
      className="pointer-events-none relative"
      style={{ width: plotWidth, height: plotHeight }}
    >
      <PlotToolbarRichHint
        title={isTrayMode ? "Dock toolbars" : "Tray mode"}
        description={
          isTrayMode
            ? "Pin rails back to the plot edges."
            : "Hide rails until you hover a side handle."
        }
        placement="bottom"
      >
        <Button
          isIconOnly
          aria-label={isTrayMode ? "Dock plot toolbars" : "Float plot toolbars in tray mode"}
          onPress={() => setIsTrayMode((prev) => !prev)}
          className={TRAY_MODE_TOGGLE_CLASS}
          style={{ left: insetLeft, top: insetTop }}
        >
          <Grip className="h-4 w-4" />
        </Button>
      </PlotToolbarRichHint>

      {!isTrayMode ? (
        <>
          <div
            className="pointer-events-auto absolute z-30 flex justify-center"
            style={{ left: topRailLeft, top: insetTop, width: topRailWidth }}
          >
            {topRail?.isAvailable ? topRail.render() : null}
          </div>
          <div
            className="pointer-events-auto absolute z-30 flex justify-center"
            style={{
              left: bottomRailLeft,
              bottom: insetBottom,
              width: bottomRailWidth,
            }}
          >
            {bottomRail?.isAvailable ? bottomRail.render() : null}
          </div>
          {leftRail?.isAvailable ? (
            <div
              className="pointer-events-none absolute top-1/2 z-30 -translate-y-1/2"
              style={{ left: insetLeft }}
            >
              {leftRail.render()}
            </div>
          ) : null}
          <div
            className="pointer-events-auto absolute top-1/2 z-30 -translate-y-1/2"
            style={{ right: insetRight }}
          >
            {rightRail?.isAvailable ? rightRail.render() : null}
          </div>
        </>
      ) : null}

      {isTrayMode ? (
        <>
      <div
        className="pointer-events-auto absolute z-30 flex justify-center"
        style={{ left: topRailLeft, top: insetTop, width: topRailWidth }}
        onMouseEnter={() => setHoveredSide("top")}
        onMouseLeave={() => setHoveredSide((prev) => (prev === "top" ? null : prev))}
      >
        {hoveredSide !== "top" ? (
          <PlotToolbarRichHint
            title="Top handle"
            description="Hover here to show the top plot toolbar."
            placement="bottom"
          >
            <Button
              isIconOnly
              aria-label="Reveal top plot toolbar"
              className={HANDLE_BUTTON_CLASS}
            >
              <GripHorizontal className="h-4 w-4" />
            </Button>
          </PlotToolbarRichHint>
        ) : null}
        {hoveredSide === "top" && topRail?.isAvailable ? (
          <div className="flex w-full justify-center">{topRail.render()}</div>
        ) : null}
      </div>

      <div
        className="pointer-events-auto absolute z-30 flex justify-center"
        style={{
          left: bottomRailLeft,
          bottom: insetBottom,
          width: bottomRailWidth,
        }}
        onMouseEnter={() => setHoveredSide("bottom")}
        onMouseLeave={() =>
          setHoveredSide((prev) => (prev === "bottom" ? null : prev))
        }
      >
        {hoveredSide !== "bottom" ? (
          <PlotToolbarRichHint
            title="Bottom handle"
            description="Hover here to show the bottom plot toolbar when present."
            placement="top"
          >
            <Button
              isIconOnly
              aria-label="Reveal bottom plot toolbar"
              className={HANDLE_BUTTON_CLASS}
            >
              <GripHorizontal className="h-4 w-4" />
            </Button>
          </PlotToolbarRichHint>
        ) : null}
        {hoveredSide === "bottom" && bottomRail?.isAvailable ? (
          <div className="flex w-full justify-center">{bottomRail.render()}</div>
        ) : null}
      </div>

      {leftRail?.isAvailable ? (
        <div
          className="pointer-events-auto absolute top-1/2 z-30 -translate-y-1/2"
          style={{ left: insetLeft }}
          onMouseEnter={() => setHoveredSide("left")}
          onMouseLeave={() => setHoveredSide((prev) => (prev === "left" ? null : prev))}
        >
          {hoveredSide !== "left" ? (
            <PlotToolbarRichHint
              title="Left handle"
              description="Hover here to show the left data-view rail."
              placement="right"
            >
              <Button
                isIconOnly
                aria-label="Reveal left plot toolbar"
                className={HANDLE_BUTTON_CLASS}
              >
                <GripVertical className="h-4 w-4" />
              </Button>
            </PlotToolbarRichHint>
          ) : null}
          {hoveredSide === "left" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              {leftRail.render()}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className="pointer-events-auto absolute top-1/2 z-30 -translate-y-1/2"
        style={{ right: insetRight }}
        onMouseEnter={() => setHoveredSide("right")}
        onMouseLeave={() =>
          setHoveredSide((prev) => (prev === "right" ? null : prev))
        }
      >
        {hoveredSide !== "right" ? (
          <PlotToolbarRichHint
            title="Right handle"
            description="Hover here to show the right analysis rail."
            placement="left"
          >
            <Button
              isIconOnly
              aria-label="Reveal right plot toolbar"
              className={HANDLE_BUTTON_CLASS}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          </PlotToolbarRichHint>
        ) : null}
        {hoveredSide === "right" && rightRail?.isAvailable ? (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            {rightRail.render()}
          </div>
        ) : null}
      </div>
        </>
      ) : null}
    </div>
  );
});
