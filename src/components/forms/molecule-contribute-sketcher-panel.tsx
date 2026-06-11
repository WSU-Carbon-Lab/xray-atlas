"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button, ErrorMessage } from "@heroui/react";
import {
  DATABASE_DEPICTION_HEIGHT_PX,
  LAB_STRUCTURE_PANE_CLASS,
} from "~/features/molecule-sketcher/constants";
import { DatabaseBuildWorkflowHint } from "~/features/molecule-sketcher/components/database-build-workflow-hint";
import { MoleculeDrawCanvas } from "~/features/molecule-sketcher/components/molecule-draw-canvas";
import { MoleculeDrawToolbar } from "~/features/molecule-sketcher/components/molecule-draw-toolbar";
import type { BookendMarksState } from "~/features/molecule-sketcher";
import { useMoleculeDrawState } from "~/features/molecule-sketcher/hooks/use-molecule-draw-state";
import type { StructureLookupComponent } from "~/features/molecule-sketcher/utils/structure-lookup-components";
import { ensureOclResourcesBrowser } from "~/features/molecule-sketcher/utils/ocl-resources.browser";

export type StructureLookupContext = {
  registrySmiles: string;
  lookupSmiles: string;
  components: StructureLookupComponent[];
};

export type MoleculeContributeSketcherPanelProps = {
  initialSmiles: string;
  isDark: boolean;
  onSmilesChange: (smiles: string) => void;
  onSnapshot: (svgMarkup: string, canonicalSmiles: string) => void;
  onBookendsChange?: (bookends: BookendMarksState) => void;
  /** Fires when registry or lookup SMILES / component fragments change. */
  onStructureLookupContextChange?: (context: StructureLookupContext) => void;
};

/** Imperative handle for committing a database SVG from a hidden sketcher instance. */
export type MoleculeContributeSketcherPanelHandle = {
  commitSnapshot: () => boolean;
};

/**
 * Compact embedded molecule sketcher for registry contribute: loads SMILES,
 * allows edits, and exports a database SVG snapshot.
 */
export const MoleculeContributeSketcherPanel = forwardRef<
  MoleculeContributeSketcherPanelHandle,
  MoleculeContributeSketcherPanelProps
>(function MoleculeContributeSketcherPanel(
  {
    initialSmiles,
    isDark,
    onSmilesChange,
    onSnapshot,
    onBookendsChange,
    onStructureLookupContextChange,
  },
  ref,
) {
  const state = useMoleculeDrawState();
  const {
    loadSmiles,
    smiles: drawSmiles,
    structureLookupSmiles,
    structureLookupComponents,
  } = state;
  const loadedSmilesRef = useRef<string | null>(null);
  const onSmilesChangeRef = useRef(onSmilesChange);
  const lastSyncedSmilesRef = useRef<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const canvasHeight = Math.min(DATABASE_DEPICTION_HEIGHT_PX, 280);

  useEffect(() => {
    onSmilesChangeRef.current = onSmilesChange;
  }, [onSmilesChange]);

  useEffect(() => {
    void ensureOclResourcesBrowser().catch(() => undefined);
  }, []);

  useEffect(() => {
    const trimmed = initialSmiles.trim();
    if (trimmed.length === 0) {
      return;
    }
    if (loadedSmilesRef.current === trimmed) {
      return;
    }
    if (lastSyncedSmilesRef.current === trimmed) {
      loadedSmilesRef.current = trimmed;
      return;
    }
    loadedSmilesRef.current = trimmed;
    loadSmiles(trimmed);
  }, [initialSmiles, loadSmiles]);

  useEffect(() => {
    const canonical = drawSmiles.trim();
    if (canonical.length === 0 || lastSyncedSmilesRef.current === canonical) {
      return;
    }
    lastSyncedSmilesRef.current = canonical;
    onSmilesChangeRef.current(canonical);
  }, [drawSmiles]);

  const onBookendsChangeRef = useRef(onBookendsChange);
  useEffect(() => {
    onBookendsChangeRef.current = onBookendsChange;
  }, [onBookendsChange]);

  useEffect(() => {
    onBookendsChangeRef.current?.(state.bookends);
  }, [state.bookends]);

  const onStructureLookupContextChangeRef = useRef(
    onStructureLookupContextChange,
  );
  useEffect(() => {
    onStructureLookupContextChangeRef.current = onStructureLookupContextChange;
  }, [onStructureLookupContextChange]);

  useEffect(() => {
    onStructureLookupContextChangeRef.current?.({
      registrySmiles: drawSmiles.trim(),
      lookupSmiles: structureLookupSmiles.trim(),
      components: structureLookupComponents,
    });
  }, [drawSmiles, structureLookupSmiles, structureLookupComponents]);

  const commitSnapshot = useCallback(() => {
    const result = state.generateDatabaseSnapshot(isDark);
    if (!result.ok) {
      setSnapshotError(result.message);
      return false;
    }
    setSnapshotError(null);
    const canonical = result.smiles.trim();
    if (canonical.length > 0) {
      loadedSmilesRef.current = canonical;
      lastSyncedSmilesRef.current = canonical;
    }
    onSnapshot(result.svg, result.smiles);
    return true;
  }, [isDark, onSnapshot, state]);

  useImperativeHandle(
    ref,
    () => ({
      commitSnapshot,
    }),
    [commitSnapshot],
  );

  const hasStructure = state.molecule.getAllAtoms() > 0;

  return (
    <div className={`${LAB_STRUCTURE_PANE_CLASS} gap-2 p-2`}>
      <DatabaseBuildWorkflowHint variant="compact" />
      <MoleculeDrawToolbar
        tool={state.tool}
        onTool={state.setTool}
        drawBondKind={state.drawBondKind}
        onDrawBondKind={state.setDrawBondKind}
        layoutTool={state.layoutTool}
        onLayoutTool={state.setLayoutTool}
        alignAtomCount={state.alignAtoms.length}
        pivotAtomCount={state.pivotAtoms.length}
        onRunAlignAxis={state.alignAlongAxis}
        onClearAlignPicks={state.clearAlignPicks}
        onClearPivotPicks={state.clearPivotPicks}
        onRunPivotFlip={state.pivotFlip}
        onRunPivotRotate={state.pivotRotate}
        onPrepareForDatabase={state.prepareForDatabase}
        onRegenerateFromSmiles={state.regenerateFromSmiles}
        canRegenerateFromSmiles={drawSmiles.trim().length > 0}
        onTidySpacing={state.cleanupSpacing}
        onStabilize={state.stabilize}
        onUndo={state.undo}
        onRedo={state.redo}
        onClear={state.clearAll}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
        hasStructure={hasStructure}
        selectedRingTemplate={state.selectedRingTemplate}
        onSelectRingTemplate={state.selectRingTemplate}
        onSelectCageByCarbonCount={state.selectCageByCarbonCount}
        cageDepictionMode={state.cageDepictionMode}
        onCageDepictionMode={state.setCageDepictionMode}
        showCageOrbitTool={
          state.cageDepictionMode === "3d" &&
          (state.hasCageDepiction ||
            state.selectedRingTemplate.category === "cage")
        }
        onResetCageView={state.resetCageView}
      />
      <div
        className="relative w-full overflow-hidden"
        style={{ height: canvasHeight }}
      >
        <MoleculeDrawCanvas state={state} heightPx={canvasHeight} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
        {snapshotError ? (
          <ErrorMessage className="text-xs">{snapshotError}</ErrorMessage>
        ) : (
          <span className="text-muted text-xs">
            Tweak the structure, then generate the registry SVG.
          </span>
        )}
        <Button type="button" variant="primary" size="sm" onPress={commitSnapshot}>
          Use sketch as SVG
        </Button>
      </div>
    </div>
  );
});
