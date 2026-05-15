"use client";

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
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
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
  plotToolbarAttachedShellClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  plotToolbarIconToolClass,
  plotToolbarTooltipContentClass,
} from "./plot-toolbar-chrome";

type PlotToolRailsDeckProps = {
  plotWidth: number;
  plotHeight: number;
  currentMode: CursorMode;
  isCursorDisabled: boolean;
  isPanDisabled: boolean;
  onCursorModeChange: (mode: CursorMode) => void;
  onResetZoom: () => void;
  onExportClick?: () => void;
  /**
   * Optional buttons or menus to the left of export in the top `ButtonGroup` (for example spectrum CSV download and copy). Pass `Tooltip`-wrapped controls; this deck does not modify unknown children.
   */
  topRailLeadingExtras?: ReactNode;
  /**
   * Optional controls rendered in the top rail to the right of the cursor mode toggle group (inspect/zoom/pan). Each child becomes a direct sibling inside the same `Toolbar`, separated from the cursor cluster by a vertical divider. Use for standalone affordances such as a dataset Edit toggle.
   *
   * Wrap each interactive control in `Tooltip` with `Tooltip.Content` so hover help stays consistent; arbitrary `ReactNode` children are not auto-wrapped here.
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
};

type TraySide = "top" | "bottom" | "left" | "right";

const HANDLE_BUTTON_CLASS =
  "pointer-events-auto h-11 w-11 min-w-11 rounded-xl border border-(--border-default) bg-(--surface-glass)/70 text-(--text-secondary) shadow-md backdrop-blur-sm opacity-90 transition duration-200 hover:bg-(--surface-2)/70 hover:text-(--text-primary) hover:opacity-100";

export const PlotToolRailsDeck = memo(function PlotToolRailsDeck({
  plotWidth,
  plotHeight,
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
}: PlotToolRailsDeckProps) {
  const [isTrayMode, setIsTrayMode] = useState(false);
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
          className={`${plotToolbarAttachedShellClass} items-stretch gap-2`}
        >
          <ButtonGroup
            orientation="horizontal"
            variant="tertiary"
            aria-label="Reset zoom, data export, and plot export"
          >
            <Tooltip delay={0}>
              <Button
                type="button"
                isIconOnly
                aria-label="Reset zoom"
                onPress={onResetZoom}
                className={plotToolbarIconToolClass}
              >
                <HomeIcon className="h-5 w-5" aria-hidden />
              </Button>
              <Tooltip.Content
                placement="bottom"
                className={plotToolbarTooltipContentClass}
              >
                Reset zoom: Fit the plot back to the full energy range.
              </Tooltip.Content>
            </Tooltip>
            {topRailLeadingExtras != null
              ? Children.toArray(topRailLeadingExtras)
              : null}
            {!topRailLeadingExtras && onExportClick ? (
              <Tooltip delay={0}>
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
                <Tooltip.Content
                  placement="bottom"
                  className={plotToolbarTooltipContentClass}
                >
                  Export plot: Open options to save the figure as an image.
                </Tooltip.Content>
              </Tooltip>
            ) : null}
          </ButtonGroup>
          <Separator
            orientation="vertical"
            className="mx-1 h-6 min-h-6 w-px shrink-0 self-center bg-(--border-default)"
          />
          <ToggleButtonGroup
            aria-label="Cursor interaction mode"
            selectionMode="single"
            orientation="horizontal"
            className="rounded-full"
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
            <Tooltip delay={0}>
              <ToggleButton
                isIconOnly
                id="inspect"
                aria-label="Inspect values"
                className={plotToolbarGlyphToggleGroupItemHorizontalClass}
                isDisabled={isCursorDisabled}
              >
                <EyeIcon className="h-5 w-5" aria-hidden />
              </ToggleButton>
              <Tooltip.Content
                placement="bottom"
                className={plotToolbarTooltipContentClass}
              >
                Inspect: Hover the spectrum to read coordinates and values.
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0}>
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
              <Tooltip.Content
                placement="bottom"
                className={plotToolbarTooltipContentClass}
              >
                Zoom: Drag a box on the plot to magnify that energy region.
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0}>
              <ToggleButton
                isIconOnly
                id="pan"
                aria-label="Pan horizontally"
                className={plotToolbarGlyphToggleGroupItemHorizontalClass}
                isDisabled={isCursorDisabled || isPanDisabled}
              >
                <ToggleButtonGroup.Separator />
                <HandRaisedIcon className="h-5 w-5" aria-hidden />
              </ToggleButton>
              <Tooltip.Content
                placement="bottom"
                className={plotToolbarTooltipContentClass}
              >
                Pan: Drag the plot left or right after you have zoomed in.
              </Tooltip.Content>
            </Tooltip>
          </ToggleButtonGroup>
          {topRailTrailingExtras != null ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-6 min-h-6 w-px shrink-0 self-center bg-(--border-default)"
              />
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
          className={`${plotToolbarAttachedShellClass} flex max-h-[24rem] flex-col items-center overflow-auto`}
        >
          {!suppressAnalysisRailLeadingGrip ? (
            <>
              <ButtonGroup orientation="vertical" variant="tertiary" aria-label="Rail handle">
                <Tooltip delay={0}>
                  <Button
                    type="button"
                    isIconOnly
                    aria-label="Analysis rail grip"
                    className={plotToolbarIconToolClass}
                  >
                    <GripVertical className="h-5 w-5" />
                  </Button>
                  <Tooltip.Content
                    placement="left"
                    className={plotToolbarTooltipContentClass}
                  >
                    Analysis rail: Vertical stack for peaks, normalization, and
                    related tools.
                  </Tooltip.Content>
                </Tooltip>
              </ButtonGroup>
              <Separator orientation="horizontal" className="my-1 w-full shrink-0" />
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

  return (
    <div
      className="pointer-events-none relative"
      style={{ width: plotWidth, height: plotHeight }}
    >
      <Tooltip delay={0}>
        <Button
          isIconOnly
          aria-label={isTrayMode ? "Dock plot toolbars" : "Float plot toolbars in tray mode"}
          onPress={() => setIsTrayMode((prev) => !prev)}
          className="pointer-events-auto absolute left-3 top-3 z-40 h-11 w-11 min-w-11 rounded-xl border border-(--border-default) bg-(--surface-glass)/70 text-(--text-secondary) shadow-md backdrop-blur-sm hover:bg-(--surface-2)/70 hover:text-(--text-primary)"
        >
          <Grip className="h-5 w-5" />
        </Button>
        <Tooltip.Content
          placement="bottom"
          className={plotToolbarTooltipContentClass}
        >
          {isTrayMode
            ? "Dock toolbars: Pin rails back to the plot edges."
            : "Tray mode: Hide rails until you hover a side handle."}
        </Tooltip.Content>
      </Tooltip>

      {!isTrayMode ? (
        <>
          <div className="pointer-events-auto absolute left-1/2 top-3 z-30 -translate-x-1/2">
            {topRail?.isAvailable ? topRail.render() : null}
          </div>
          <div className="pointer-events-auto absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
            {bottomRail?.isAvailable ? bottomRail.render() : null}
          </div>
          {leftRail?.isAvailable ? (
            <div className="pointer-events-none absolute left-3 top-1/2 z-30 -translate-y-1/2">
              {leftRail.render()}
            </div>
          ) : null}
          <div className="pointer-events-auto absolute right-3 top-1/2 z-30 -translate-y-1/2">
            {rightRail?.isAvailable ? rightRail.render() : null}
          </div>
        </>
      ) : null}

      {isTrayMode ? (
        <>
      <div
        className="pointer-events-auto absolute left-1/2 top-3 z-30 -translate-x-1/2"
        onMouseEnter={() => setHoveredSide("top")}
        onMouseLeave={() => setHoveredSide((prev) => (prev === "top" ? null : prev))}
      >
        {hoveredSide !== "top" ? (
          <Tooltip delay={0}>
            <Button
              isIconOnly
              aria-label="Reveal top plot toolbar"
              className={HANDLE_BUTTON_CLASS}
            >
              <GripHorizontal className="h-6 w-6" />
            </Button>
            <Tooltip.Content
              placement="bottom"
              className={plotToolbarTooltipContentClass}
            >
              Top handle: Hover here to show the top plot toolbar.
            </Tooltip.Content>
          </Tooltip>
        ) : null}
        {hoveredSide === "top" && topRail?.isAvailable ? (
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            {topRail.render()}
          </div>
        ) : null}
      </div>

      <div
        className="pointer-events-auto absolute bottom-3 left-1/2 z-30 -translate-x-1/2"
        onMouseEnter={() => setHoveredSide("bottom")}
        onMouseLeave={() =>
          setHoveredSide((prev) => (prev === "bottom" ? null : prev))
        }
      >
        {hoveredSide !== "bottom" ? (
          <Tooltip delay={0}>
            <Button
              isIconOnly
              aria-label="Reveal bottom plot toolbar"
              className={HANDLE_BUTTON_CLASS}
            >
              <GripHorizontal className="h-6 w-6" />
            </Button>
            <Tooltip.Content
              placement="top"
              className={plotToolbarTooltipContentClass}
            >
              Bottom handle: Hover here to show the bottom plot toolbar when present.
            </Tooltip.Content>
          </Tooltip>
        ) : null}
        {hoveredSide === "bottom" && bottomRail?.isAvailable ? (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            {bottomRail.render()}
          </div>
        ) : null}
      </div>

      {leftRail?.isAvailable ? (
        <div
          className="pointer-events-auto absolute left-3 top-1/2 z-30 -translate-y-1/2"
          onMouseEnter={() => setHoveredSide("left")}
          onMouseLeave={() => setHoveredSide((prev) => (prev === "left" ? null : prev))}
        >
          {hoveredSide !== "left" ? (
            <Tooltip delay={0}>
              <Button
                isIconOnly
                aria-label="Reveal left plot toolbar"
                className={HANDLE_BUTTON_CLASS}
              >
                <GripVertical className="h-6 w-6" />
              </Button>
              <Tooltip.Content
                placement="right"
                className={plotToolbarTooltipContentClass}
              >
                Left handle: Hover here to show the left data-view rail.
              </Tooltip.Content>
            </Tooltip>
          ) : null}
          {hoveredSide === "left" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              {leftRail.render()}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className="pointer-events-auto absolute right-3 top-1/2 z-30 -translate-y-1/2"
        onMouseEnter={() => setHoveredSide("right")}
        onMouseLeave={() =>
          setHoveredSide((prev) => (prev === "right" ? null : prev))
        }
      >
        {hoveredSide !== "right" ? (
          <Tooltip delay={0}>
            <Button
              isIconOnly
              aria-label="Reveal right plot toolbar"
              className={HANDLE_BUTTON_CLASS}
            >
              <GripVertical className="h-6 w-6" />
            </Button>
            <Tooltip.Content
              placement="left"
              className={plotToolbarTooltipContentClass}
            >
              Right handle: Hover here to show the right analysis rail.
            </Tooltip.Content>
          </Tooltip>
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
