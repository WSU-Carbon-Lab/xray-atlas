"use client";

import { useCallback } from "react";
import { Button, Separator, ToggleButton, ToggleButtonGroup } from "@heroui/react";

import type { ViewTool } from "../molecule-structure-editor-types";

const PIVOT_ROTATE_STEP_DEG = 15;

const VIEW_TOOL_IDS = new Set<string>(["draw", "translate", "rotate", "align", "pivot"]);

export interface MoleculeStructureEditorToolbarProps {
  editorDerivedOk: boolean;
  viewTool: ViewTool;
  onViewTool: (tool: ViewTool) => void;
  alignAtomCount: number;
  pivotAtomCount: number;
  onRunAlignAxis: (axis: "x" | "y") => void;
  onClearAlignPicks: () => void;
  onClearPivotPicks: () => void;
  onRunPivotFlip: () => void;
  onRunPivotRotate: (deg: number) => void;
  onAbbreviateAlkyl: () => void;
  onExpandAlkyl: () => void;
  onAbbreviateNitrile: () => void;
  onCleanupSpacing: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  threeD: {
    busy: boolean;
    error: string | null;
    hasSession: boolean;
    onCompute: () => void;
    onClear: () => void;
    onResetView: () => void;
    onSaveSnapshot: () => void;
    onClearSnapshot: () => void;
    hasSnapshot: boolean;
    snapshotError: string | null;
    omittedBondCount: number | null;
  };
}

export function MoleculeStructureEditorToolbar({
  editorDerivedOk,
  viewTool,
  onViewTool,
  alignAtomCount,
  pivotAtomCount,
  onRunAlignAxis,
  onClearAlignPicks,
  onClearPivotPicks,
  onRunPivotFlip,
  onRunPivotRotate,
  onAbbreviateAlkyl,
  onExpandAlkyl,
  onAbbreviateNitrile,
  onCleanupSpacing,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  threeD,
}: MoleculeStructureEditorToolbarProps) {
  const handleViewToolChange = useCallback(
    (keys: "all" | Iterable<string | number>) => {
      if (keys === "all") {
        return;
      }
      for (const key of keys) {
        const id = String(key);
        if (VIEW_TOOL_IDS.has(id)) {
          onViewTool(id as ViewTool);
        }
        return;
      }
    },
    [onViewTool],
  );

  return (
    <div className="border-border space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleButtonGroup
          aria-label="Structure editor tools"
          selectionMode="single"
          selectedKeys={viewTool === "draw" ? new Set(["draw"]) : new Set<string>()}
          onSelectionChange={handleViewToolChange}
        >
          <ToggleButton id="draw" size="sm" aria-label="Draw">
            Draw
          </ToggleButton>
        </ToggleButtonGroup>
        <Separator className="bg-border h-6" orientation="vertical" />
        <Button type="button" size="sm" variant="secondary" onPress={onUndo} isDisabled={!canUndo}>
          Undo
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={onRedo} isDisabled={!canRedo}>
          Redo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="text-muted text-xs font-medium">Layout</span>
        <ToggleButtonGroup
          aria-label="Layout tools"
          selectionMode="single"
          selectedKeys={
            viewTool === "translate" ||
            viewTool === "rotate" ||
            viewTool === "align" ||
            viewTool === "pivot"
              ? new Set([viewTool])
              : new Set<string>()
          }
          onSelectionChange={handleViewToolChange}
        >
          <ToggleButton id="translate" size="sm" aria-label="Move">
            Move
          </ToggleButton>
          <ToggleButton id="rotate" size="sm" aria-label="Rotate">
            Rotate
          </ToggleButton>
          <ToggleButton id="align" size="sm" aria-label="Align">
            Align
          </ToggleButton>
          <ToggleButton id="pivot" size="sm" aria-label="Pivot bond">
            Pivot
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => onRunAlignAxis("x")}
          isDisabled={viewTool !== "align" || alignAtomCount !== 2}
        >
          Along X
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => onRunAlignAxis("y")}
          isDisabled={viewTool !== "align" || alignAtomCount !== 2}
        >
          Along Y
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={onClearAlignPicks}
          isDisabled={viewTool !== "align" || alignAtomCount === 0}
        >
          Clear picks
        </Button>
        <Separator className="bg-border h-6" orientation="vertical" />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={onClearPivotPicks}
          isDisabled={viewTool !== "pivot" || pivotAtomCount === 0}
        >
          Clear pivot
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={onRunPivotFlip}
          isDisabled={viewTool !== "pivot" || pivotAtomCount !== 2}
        >
          Flip across bond
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => onRunPivotRotate(-PIVOT_ROTATE_STEP_DEG)}
          isDisabled={viewTool !== "pivot" || pivotAtomCount !== 2}
        >
          Rotate -{PIVOT_ROTATE_STEP_DEG}°
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => onRunPivotRotate(PIVOT_ROTATE_STEP_DEG)}
          isDisabled={viewTool !== "pivot" || pivotAtomCount !== 2}
        >
          Rotate +{PIVOT_ROTATE_STEP_DEG}°
        </Button>
        <Separator className="bg-border h-6" orientation="vertical" />
        <span className="text-muted text-xs font-medium">Labels</span>
        <Button type="button" size="sm" variant="secondary" onPress={onAbbreviateAlkyl}>
          Abbreviate alkyl tails
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={onExpandAlkyl}>
          Expand abbreviated tails
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={onAbbreviateNitrile}>
          Abbreviate nitriles (CN)
        </Button>
        <Separator className="bg-border h-6" orientation="vertical" />
        <span className="text-muted text-xs font-medium">Cleanup</span>
        <Button type="button" size="sm" variant="secondary" onPress={onCleanupSpacing}>
          Clean up spacing
        </Button>
      </div>

      <div className="border-border bg-surface-2/20 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-md border border-dashed px-2 py-2">
        <span className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">
          3D preview
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={threeD.onCompute}
          isDisabled={threeD.busy || !editorDerivedOk}
        >
          {threeD.busy
            ? "Computing 3D…"
            : threeD.hasSession
              ? "Recompute conformer"
              : "Compute conformer"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={threeD.onClear}
          isDisabled={!threeD.hasSession}
        >
          Clear 3D
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={threeD.onResetView}
          isDisabled={!threeD.hasSession}
        >
          Reset view
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          onPress={threeD.onSaveSnapshot}
          isDisabled={!threeD.hasSession}
        >
          Save snapshot
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={threeD.onClearSnapshot}
          isDisabled={!threeD.hasSnapshot}
        >
          Clear snapshot
        </Button>
        {threeD.snapshotError ? (
          <span className="text-danger max-w-md text-xs" role="alert">
            {threeD.snapshotError}
          </span>
        ) : threeD.omittedBondCount !== null ? (
          <span className="text-muted max-w-md text-xs">
            Snapshot: {threeD.omittedBondCount} bond
            {threeD.omittedBondCount === 1 ? "" : "s"} omitted (occluded).
          </span>
        ) : threeD.error ? (
          <span className="text-danger max-w-md text-xs" role="alert">
            {threeD.error}
          </span>
        ) : (
          <span className="text-muted max-w-md text-xs">
            Orbit-only preview with perspective depth. 2D molfile stays canonical; edit clears 3D.
          </span>
        )}
      </div>
    </div>
  );
}
