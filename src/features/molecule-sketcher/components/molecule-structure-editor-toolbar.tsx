import { Button, Separator } from "@heroui/react";
import type { ViewTool } from "../molecule-structure-editor-types";

const PIVOT_ROTATE_STEP_DEG = 15;

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
  return (
    <div className="border-border space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="text-muted text-xs font-medium">Draw</span>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "draw" ? "primary" : "secondary"}
          onPress={() => onViewTool("draw")}
        >
          Draw
        </Button>
        <Separator className="bg-border h-6" orientation="vertical" />
        <span className="text-muted text-xs font-medium">Layout</span>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "translate" ? "primary" : "secondary"}
          onPress={() => onViewTool("translate")}
        >
          Move
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "rotate" ? "primary" : "secondary"}
          onPress={() => onViewTool("rotate")}
        >
          Rotate
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "align" ? "primary" : "secondary"}
          onPress={() => onViewTool("align")}
        >
          Align
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => onRunAlignAxis("x")}
          isDisabled={alignAtomCount !== 2}
        >
          Along X
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => onRunAlignAxis("y")}
          isDisabled={alignAtomCount !== 2}
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
        <span className="text-muted text-xs font-medium">Pivot</span>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "pivot" ? "primary" : "secondary"}
          onPress={() => onViewTool("pivot")}
        >
          Pivot bond
        </Button>
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
        <Separator className="bg-border h-6" orientation="vertical" />
        <span className="text-muted text-xs font-medium">History</span>
        <Button type="button" size="sm" variant="secondary" onPress={onUndo} isDisabled={!canUndo}>
          Undo
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={onRedo} isDisabled={!canRedo}>
          Redo
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
        {threeD.error ? (
          <span className="text-danger max-w-md text-xs" role="alert">
            {threeD.error}
          </span>
        ) : (
          <span className="text-muted max-w-md text-xs">
            Orbit-only preview. 2D molfile stays canonical; edit clears 3D.
          </span>
        )}
      </div>
    </div>
  );
}
