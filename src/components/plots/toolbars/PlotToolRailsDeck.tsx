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
  topRailLeadingExtras?: ReactNode;
  displayTools?: ReactNode;
  analysisTools?: ReactNode;
  bottomTools?: ReactNode;
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
  displayTools,
  analysisTools,
  bottomTools,
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
            <Button
              type="button"
              isIconOnly
              aria-label="Reset zoom"
              onPress={onResetZoom}
              className={plotToolbarIconToolClass}
            >
              <HomeIcon className="h-5 w-5" aria-hidden />
            </Button>
            {topRailLeadingExtras != null
              ? Children.toArray(topRailLeadingExtras)
              : null}
            {!topRailLeadingExtras && onExportClick ? (
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
            className="overflow-hidden rounded-full"
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
            <ToggleButton
              isIconOnly
              id="inspect"
              aria-label="Inspect values"
              className={plotToolbarGlyphToggleGroupItemHorizontalClass}
              isDisabled={isCursorDisabled}
            >
              <EyeIcon className="h-5 w-5" aria-hidden />
            </ToggleButton>
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
          </ToggleButtonGroup>
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
          <ButtonGroup orientation="vertical" variant="tertiary" aria-label="Rail handle">
            <Button
              type="button"
              isIconOnly
              aria-label="Analysis tools"
              className={plotToolbarIconToolClass}
            >
              <GripVertical className="h-5 w-5" />
            </Button>
          </ButtonGroup>
          <Separator orientation="horizontal" className="my-1 w-full shrink-0" />
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
      <Button
        isIconOnly
        aria-label={isTrayMode ? "Show all plot toolbars" : "Hide plot toolbars"}
        onPress={() => setIsTrayMode((prev) => !prev)}
        className="pointer-events-auto absolute left-3 top-3 z-40 h-11 w-11 min-w-11 rounded-xl border border-(--border-default) bg-(--surface-glass)/70 text-(--text-secondary) shadow-md backdrop-blur-sm hover:bg-(--surface-2)/70 hover:text-(--text-primary)"
      >
        <Grip className="h-5 w-5" />
      </Button>

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
              <div className="flex flex-col items-center gap-2">
                {leftRail.render()}
              </div>
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
          <Button
            isIconOnly
            aria-label="Top toolbar handle"
            className={HANDLE_BUTTON_CLASS}
          >
            <GripHorizontal className="h-6 w-6" />
          </Button>
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
          <Button
            isIconOnly
            aria-label="Bottom toolbar handle"
            className={HANDLE_BUTTON_CLASS}
          >
            <GripHorizontal className="h-6 w-6" />
          </Button>
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
            <Button
              isIconOnly
              aria-label="Left toolbar handle"
              className={HANDLE_BUTTON_CLASS}
            >
              <GripVertical className="h-6 w-6" />
            </Button>
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
          <Button
            isIconOnly
            aria-label="Right toolbar handle"
            className={HANDLE_BUTTON_CLASS}
          >
            <GripVertical className="h-6 w-6" />
          </Button>
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
