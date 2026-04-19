"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Button, ErrorMessage, Label } from "@heroui/react";
import { MolfileSvgEditor } from "react-ocl";
import { Molecule, Resources } from "openchemlib";
import { applyMoleculeSvgCpkThemeToElement } from "~/lib/molecule-svg-cpk-theme";
import { getBaseUrl } from "~/utils/getBaseUrl";
import {
  expandAllAbbreviatedAlkylLabels,
  scrubMolfileCustomLabels,
} from "../utils/alkyl-label-expand";
import { abbreviateTerminalAlkylChains } from "../utils/carbon-chain-abbr";
import { abbreviateNitrileGroups } from "../utils/depiction-coalescence";
import {
  findBondIndex,
  flipSmallerFragmentAcrossBond,
  heavyAtomsAreBonded,
  rotateFragmentAroundBondPivot,
} from "../utils/bond-fragment-transforms";
import {
  alignBondVectorToAxis,
  cleanupMolecule2DSpacing,
  heavyAtomCentroid2D,
  rotateAllCoordsAroundPoint,
  translateAllCoords,
} from "../utils/molecule-2d-transforms";
import { LAB_STRUCTURE_PANE_HEIGHT_PX } from "../constants";
import type { ViewTool } from "../molecule-structure-editor-types";
import { useMolfileHistory } from "../hooks/use-molfile-history";
import { useMolecule3dPreview } from "../hooks/use-molecule-3d-preview";
import { MoleculeStructureEditorToolbar } from "./molecule-structure-editor-toolbar";

const EDITOR_WIDTH = 480;
const EDITOR_HEIGHT = LAB_STRUCTURE_PANE_HEIGHT_PX;
const SPLIT_PANEL_WIDTH = Math.floor(EDITOR_WIDTH / 2);

const TRANSLATE_SCALE = 0.045;

function defaultMolfileV3(): string {
  return scrubMolfileCustomLabels(Molecule.fromSmiles("C").toMolfileV3());
}

function molfileV3FromMolecule(mol: Molecule): string {
  return scrubMolfileCustomLabels(mol.toMolfileV3());
}

export interface MoleculeStructureEditorLabProps {
  seedSmiles?: string | null;
}

export function MoleculeStructureEditorLab({
  seedSmiles,
}: MoleculeStructureEditorLabProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const wire3dSvgId = useId().replace(/:/g, "");
  const toolHintId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewDragSnapshotRef = useRef<string | null>(null);

  const [stableInitialMolfile] = useState(() => defaultMolfileV3());
  const {
    molfile,
    setMolfile,
    molfileRef,
    displayedMolRef,
    commitHistoryPoint,
    onEditorChange,
    undo,
    redo,
    undoStack,
    redoStack,
  } = useMolfileHistory(stableInitialMolfile);

  const preview3d = useMolecule3dPreview({
    molfile,
    molfileRef,
    isDark,
    wire3dSvgId,
    panelWidth: SPLIT_PANEL_WIDTH,
    panelHeight: EDITOR_HEIGHT,
  });

  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [viewTool, setViewTool] = useState<ViewTool>("draw");
  const [alignAtoms, setAlignAtoms] = useState<number[]>([]);
  const [pivotAtoms, setPivotAtoms] = useState<number[]>([]);
  const [viewError, setViewError] = useState<string | null>(null);
  const [abbrDone, setAbbrDone] = useState<number | null>(null);
  const [expandDone, setExpandDone] = useState<number | null>(null);
  const [nitrileDone, setNitrileDone] = useState<number | null>(null);
  const [layoutNote, setLayoutNote] = useState<string | null>(null);

  const dragRef = useRef<{
    lastAngle: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = `${getBaseUrl()}/api/ocl-resources`;
        await Resources.registerFromUrl(url);
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : "Failed to load OpenChemLib resources.";
          setResourcesError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (seedSmiles === undefined || seedSmiles === null) {
      return;
    }
    const trimmed = seedSmiles.trim();
    if (!trimmed) {
      return;
    }
    try {
      const mol = Molecule.fromSmiles(trimmed);
      commitHistoryPoint(molfileRef.current);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
      setSeedError(null);
    } catch {
      setSeedError(
        "Catalog SMILES could not be parsed into the editor. Draw or paste a molfile instead.",
      );
    }
  }, [seedSmiles, commitHistoryPoint, molfileRef, displayedMolRef, setMolfile]);

  useEffect(() => {
    if (viewTool !== "align") {
      setAlignAtoms([]);
    }
  }, [viewTool]);

  useEffect(() => {
    if (viewTool !== "pivot") {
      setPivotAtoms([]);
    }
  }, [viewTool]);

  const recolorEditorSvg = useCallback(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (svg) {
      applyMoleculeSvgCpkThemeToElement(svg, isDark);
    }
  }, [isDark]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    recolorEditorSvg();
    const obs = new MutationObserver(() => {
      requestAnimationFrame(() => recolorEditorSvg());
    });
    obs.observe(host, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [
    molfile,
    recolorEditorSvg,
    preview3d.session3d,
    preview3d.wire3dBusy,
    preview3d.wire3dError,
  ]);

  const mutateMolFromRef = useCallback(
    (mutate: (m: Molecule) => void, options?: { skipHistory?: boolean }) => {
      setViewError(null);
      try {
        if (!options?.skipHistory) {
          commitHistoryPoint(molfileRef.current);
        }
        const mol = Molecule.fromMolfile(molfileRef.current);
        mutate(mol);
        const next = molfileV3FromMolecule(mol);
        molfileRef.current = next;
        displayedMolRef.current = next;
        setMolfile(next);
      } catch (e) {
        setViewError(e instanceof Error ? e.message : "Structure update failed.");
      }
    },
    [commitHistoryPoint, molfileRef, displayedMolRef, setMolfile],
  );

  const onAtomClickLab = useCallback(
    (atomId: number, event: ReactMouseEvent<SVGElement>) => {
      if (viewTool === "align") {
        event.preventDefault();
        setViewError(null);
        setAlignAtoms((prev) => {
          if (prev.length === 0) return [atomId];
          if (prev.length === 1) {
            if (prev[0] === atomId) return prev;
            return [prev[0]!, atomId];
          }
          return [atomId];
        });
        return;
      }
      if (viewTool === "pivot") {
        event.preventDefault();
        setViewError(null);
        setPivotAtoms((prev) => {
          if (prev.length === 0) return [atomId];
          if (prev.length === 1) {
            if (prev[0] === atomId) return prev;
            const a = prev[0]!;
            let mol: Molecule;
            try {
              mol = Molecule.fromMolfile(molfile);
            } catch (err) {
              queueMicrotask(() =>
                setViewError(
                  err instanceof Error
                    ? err.message
                    : "Could not read the structure from the molfile.",
                ),
              );
              return [a];
            }
            if (!heavyAtomsAreBonded(mol, a, atomId)) {
              queueMicrotask(() =>
                setViewError(
                  "Pivot: pick a bonded atom for the second click, or click a bond.",
                ),
              );
              return [a];
            }
            return [a, atomId];
          }
          return [atomId];
        });
      }
    },
    [viewTool, molfile],
  );

  const onBondClickLab = useCallback(
    (bondId: number, event: ReactMouseEvent<SVGElement>) => {
      if (viewTool !== "pivot") return;
      event.preventDefault();
      setViewError(null);
      try {
        const mol = Molecule.fromMolfile(molfile);
        const a = mol.getBondAtom(0, bondId);
        const b = mol.getBondAtom(1, bondId);
        setPivotAtoms([a, b]);
      } catch (e) {
        setViewError(e instanceof Error ? e.message : "Bond pick failed.");
      }
    },
    [viewTool, molfile],
  );

  const runAlignAxis = useCallback(
    (axis: "x" | "y") => {
      if (alignAtoms.length !== 2) return;
      mutateMolFromRef((mol) => {
        alignBondVectorToAxis(mol, alignAtoms[0]!, alignAtoms[1]!, axis);
      });
      setAlignAtoms([]);
    },
    [alignAtoms, mutateMolFromRef],
  );

  const endViewDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onViewOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (viewTool !== "rotate" && viewTool !== "translate") return;
      const el = containerRef.current;
      if (!el) return;
      viewDragSnapshotRef.current = molfileRef.current;
      e.currentTarget.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
      dragRef.current = { lastAngle: a0, pointerId: e.pointerId };
    },
    [viewTool, molfileRef],
  );

  const onViewOverlayPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const st = dragRef.current;
      if (st?.pointerId !== e.pointerId) return;
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (viewTool === "translate") {
        mutateMolFromRef(
          (mol) => {
            translateAllCoords(mol, e.movementX * TRANSLATE_SCALE, e.movementY * TRANSLATE_SCALE);
          },
          { skipHistory: true },
        );
        return;
      }
      if (viewTool === "rotate") {
        const a1 = Math.atan2(e.clientY - cy, e.clientX - cx);
        const delta = a1 - st.lastAngle;
        st.lastAngle = a1;
        mutateMolFromRef(
          (mol) => {
            const c = heavyAtomCentroid2D(mol);
            rotateAllCoordsAroundPoint(mol, c.x, c.y, delta);
          },
          { skipHistory: true },
        );
      }
    },
    [mutateMolFromRef, viewTool],
  );

  const onViewOverlayPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current?.pointerId !== e.pointerId) return;
      if (viewTool === "translate" || viewTool === "rotate") {
        const snap = viewDragSnapshotRef.current;
        viewDragSnapshotRef.current = null;
        if (snap !== null && snap !== molfileRef.current) {
          commitHistoryPoint(snap);
        }
      }
      endViewDrag();
    },
    [commitHistoryPoint, endViewDrag, viewTool, molfileRef],
  );

  const abbreviateChains = useCallback(() => {
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setNitrileDone(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromMolfile(molfileRef.current);
      const n = abbreviateTerminalAlkylChains(mol);
      setAbbrDone(n);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Abbreviation failed.");
    }
  }, [commitHistoryPoint, molfileRef, displayedMolRef, setMolfile]);

  const expandAbbreviatedChains = useCallback(() => {
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setNitrileDone(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromMolfile(molfileRef.current);
      const n = expandAllAbbreviatedAlkylLabels(mol);
      setExpandDone(n);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Expand failed.");
    }
  }, [commitHistoryPoint, molfileRef, displayedMolRef, setMolfile]);

  const abbreviateNitriles = useCallback(() => {
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setNitrileDone(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromMolfile(molfileRef.current);
      const n = abbreviateNitrileGroups(mol);
      setNitrileDone(n);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Nitrile abbreviation failed.");
    }
  }, [commitHistoryPoint, molfileRef, displayedMolRef, setMolfile]);

  const runPivotFlip = useCallback(() => {
    if (pivotAtoms.length !== 2) return;
    setViewError(null);
    setLayoutNote(null);
    mutateMolFromRef((mol) => {
      flipSmallerFragmentAcrossBond(mol, pivotAtoms[0]!, pivotAtoms[1]!);
    });
    setLayoutNote(
      "Mirrored the smaller substituent across the bond (symmetric flip).",
    );
  }, [pivotAtoms, mutateMolFromRef]);

  const runPivotRotate = useCallback(
    (deg: number) => {
      if (pivotAtoms.length !== 2) return;
      setViewError(null);
      setLayoutNote(null);
      const rad = (deg * Math.PI) / 180;
      mutateMolFromRef((mol) => {
        rotateFragmentAroundBondPivot(mol, pivotAtoms[0]!, pivotAtoms[1]!, rad);
      });
      setLayoutNote(
        `Rotated the side beyond the second atom by ${deg}° around the first atom (hinge).`,
      );
    },
    [pivotAtoms, mutateMolFromRef],
  );

  const cleanupSpacing = useCallback(() => {
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setNitrileDone(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromMolfile(molfileRef.current);
      cleanupMolecule2DSpacing(mol);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
      setLayoutNote("Scaled the drawing slightly about its centroid.");
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Spacing cleanup failed.");
    }
  }, [commitHistoryPoint, molfileRef, displayedMolRef, setMolfile]);

  const resetFromOriginalSmiles = useCallback(() => {
    const trimmed = seedSmiles?.trim();
    if (!trimmed) return;
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setNitrileDone(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromSmiles(trimmed);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Could not reset from SMILES.");
    }
  }, [commitHistoryPoint, seedSmiles, molfileRef, displayedMolRef, setMolfile]);

  const editorAtomHighlight = useMemo(() => {
    if (viewTool === "align" && alignAtoms.length > 0) return alignAtoms;
    if (viewTool === "pivot" && pivotAtoms.length > 0) return pivotAtoms;
    return undefined;
  }, [viewTool, alignAtoms, pivotAtoms]);

  const pivotBondHighlight = useMemo(() => {
    if (viewTool !== "pivot" || pivotAtoms.length !== 2) return undefined;
    try {
      const mol = Molecule.fromMolfile(molfile);
      const bi = findBondIndex(mol, pivotAtoms[0]!, pivotAtoms[1]!);
      return bi >= 0 ? [bi] : undefined;
    } catch {
      return undefined;
    }
  }, [viewTool, pivotAtoms, molfile]);

  const toolHint = useMemo(() => {
    if (preview3d.session3d) {
      return "2D molfile is canonical. The 3D panel is a preview: drag to orbit only.";
    }
    switch (viewTool) {
      case "draw":
        return "Draw and edit bonds and atoms. Click an abbreviated alkyl label to type a formula (e.g. C4H9); valid CnH2n+1 labels render with true subscripts in the SVG; a leading bracket from the editor is removed automatically.";
      case "translate":
        return "Drag on the structure to move it.";
      case "rotate":
        return "Drag around the center of the pane to rotate the structure.";
      case "align":
        return alignAtoms.length === 0
          ? "Click a first atom."
          : alignAtoms.length === 1
            ? "Click a second atom (bonded or not), then choose Along X or Along Y."
            : "Choose Along X or Along Y, or Clear picks to start over.";
      case "pivot":
        return pivotAtoms.length === 0
          ? "Click the hinge atom first, then a bonded neighbor, or click a bond. Then use Flip or Rotate to reposition a wing."
          : pivotAtoms.length === 1
            ? "Click a bonded neighbor of the first atom, or click the bond between them."
            : "Flip mirrors the smaller fragment across the bond. Rotate turns the mate side around the first-picked atom (hinge).";
      default:
        return "";
    }
  }, [alignAtoms.length, pivotAtoms.length, preview3d.session3d, viewTool]);

  const editorDerived = useMemo(() => {
    try {
      const mol = Molecule.fromMolfile(molfile);
      return {
        ok: true as const,
        isomericSmiles: mol.toIsomericSmiles(),
        formula: mol.getMolecularFormula().formula,
      };
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not read the current structure.";
      return { ok: false as const, message };
    }
  }, [molfile]);

  const showViewOverlay = viewTool === "translate" || viewTool === "rotate";

  const editorCanvasWidth = preview3d.session3d ? SPLIT_PANEL_WIDTH : EDITOR_WIDTH;

  return (
    <div className="space-y-4">
      {resourcesError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          OpenChemLib resources failed to load ({resourcesError}). The editor may
          not work correctly until this succeeds.
        </ErrorMessage>
      ) : null}
      {seedError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {seedError}
        </ErrorMessage>
      ) : null}

      <div className="space-y-2">
        <div className="min-w-0">
          <Label className="text-foreground text-xs font-medium">SMILES (editor)</Label>
          {editorDerived.ok ? (
            <p className="text-foreground mt-0.5 font-mono text-xs break-all">
              {editorDerived.isomericSmiles}
            </p>
          ) : (
            <p className="text-muted mt-0.5 text-xs" role="status">
              {editorDerived.message}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <Label className="text-foreground text-xs font-medium">
            Formula (calculated)
          </Label>
          {editorDerived.ok ? (
            <p className="text-foreground mt-0.5 font-mono text-xs break-all">
              {editorDerived.formula}
            </p>
          ) : (
            <p className="text-muted mt-0.5 text-xs">—</p>
          )}
        </div>
      </div>

      <MoleculeStructureEditorToolbar
        editorDerivedOk={editorDerived.ok}
        viewTool={viewTool}
        onViewTool={setViewTool}
        alignAtomCount={alignAtoms.length}
        pivotAtomCount={pivotAtoms.length}
        onRunAlignAxis={runAlignAxis}
        onClearAlignPicks={() => setAlignAtoms([])}
        onClearPivotPicks={() => setPivotAtoms([])}
        onRunPivotFlip={runPivotFlip}
        onRunPivotRotate={runPivotRotate}
        onAbbreviateAlkyl={abbreviateChains}
        onExpandAlkyl={expandAbbreviatedChains}
        onAbbreviateNitrile={abbreviateNitriles}
        onCleanupSpacing={cleanupSpacing}
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        threeD={{
          busy: preview3d.wire3dBusy,
          error: preview3d.wire3dError,
          hasSession: preview3d.session3d !== null,
          onCompute: preview3d.runCompute3dConformer,
          onClear: preview3d.clear3dConformer,
          onResetView: preview3d.resetView3d,
        }}
      />

      <p id={toolHintId} className="text-muted text-xs" aria-live="polite">
        {toolHint}
        {abbrDone !== null && abbrDone > 0 ? ` Abbreviated ${abbrDone} tail(s).` : null}
        {expandDone !== null && expandDone > 0 ? ` Expanded ${expandDone} tail(s).` : null}
        {nitrileDone !== null && nitrileDone > 0
          ? ` Abbreviated ${nitrileDone} nitrile group(s) as CN.`
          : null}
        {layoutNote ? ` ${layoutNote}` : null}
      </p>
      {viewError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {viewError}
        </ErrorMessage>
      ) : null}

      <div
        className="border-border bg-surface-2/10 flex w-full max-w-full flex-col overflow-hidden rounded-lg border"
        style={{
          height: LAB_STRUCTURE_PANE_HEIGHT_PX,
          minHeight: LAB_STRUCTURE_PANE_HEIGHT_PX,
        }}
        aria-describedby={toolHintId}
      >
        <div className="flex min-h-0 w-full max-w-full flex-1 items-stretch justify-center overflow-hidden">
          <div
            ref={containerRef}
            className={`relative flex min-h-0 items-center justify-center overflow-auto ${
              preview3d.session3d
                ? "border-border min-w-0 flex-1 flex-col border-r"
                : "h-full w-full max-w-full flex-col"
            }`}
          >
            {showViewOverlay ? (
              <div
                className="touch-none absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
                style={{ touchAction: "none" }}
                onPointerDown={onViewOverlayPointerDown}
                onPointerMove={onViewOverlayPointerMove}
                onPointerUp={onViewOverlayPointerUp}
                onPointerCancel={onViewOverlayPointerUp}
                aria-hidden
              />
            ) : null}
            <MolfileSvgEditor
              molfile={molfile}
              width={editorCanvasWidth}
              height={EDITOR_HEIGHT}
              onChange={onEditorChange}
              mdlFormat="V3000"
              suppressChiralText
              suppressCIPParity
              suppressESR
              noStereoProblem
              onAtomClick={onAtomClickLab}
              onBondClick={onBondClickLab}
              atomHighlight={editorAtomHighlight}
              bondHighlight={pivotBondHighlight}
              atomHighlightStrategy="merge"
            />
          </div>
          {preview3d.session3d && preview3d.wire3dSvgRendered ? (
            <div
              role="application"
              aria-label="3D structure preview. Drag to orbit."
              className="relative flex min-h-0 min-w-0 flex-1 touch-none flex-col items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing [&_svg]:max-h-full [&_svg]:max-w-full"
              style={{ touchAction: "none" }}
              onPointerDown={preview3d.on3dPointerDown}
              onPointerMove={preview3d.on3dPointerMove}
              onPointerUp={preview3d.on3dPointerUp}
              onPointerCancel={preview3d.on3dPointerUp}
            >
              <div
                className="flex max-h-full max-w-full items-center justify-center"
                dangerouslySetInnerHTML={{ __html: preview3d.wire3dSvgRendered }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {seedSmiles?.trim() ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onPress={resetFromOriginalSmiles}
          >
            Reset from loaded SMILES
          </Button>
        </div>
      ) : null}
    </div>
  );
}
