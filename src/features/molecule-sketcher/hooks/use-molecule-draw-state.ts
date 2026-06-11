"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import type {
  AbbreviatedAlkylTailSpec,
  CageDepictionMode,
  DrawBondKind,
  DrawBondMark,
  DrawTool,
  DoubleBondOffsetMode,
  LayoutTool,
  RingTemplatePreset,
} from "../molecule-draw-types";
import { bondMarkKey } from "../molecule-draw-types";
import type {
  CageBondDepthTierByMark,
  CageOrbitWireframeFrame,
} from "../utils/cage-template-placement";
import { useCageOrbitDrag } from "./use-cage-orbit-drag";
import {
  measureCageFacePlaneScale,
  reapplyCageDepictionModeOnMolecule,
  ringTemplateUsesCageProjection,
} from "../utils/cage-template-placement";
import {
  applyView3dAxisPreset,
  createMolecule3dSession,
  defaultView3d,
  type Molecule3dSession,
  type View3d,
} from "../utils/molecule-3d-depth-wireframe";
import { RING_TEMPLATE_PRESETS } from "../molecule-draw-types";
import {
  cageSmilesForCarbonCount,
  type CageSmilesResult,
} from "../utils/cage-smiles";
import {
  DATABASE_DEPICTION_HEIGHT_PX,
  DATABASE_DEPICTION_WIDTH_PX,
} from "../constants";
import {
  addBondedAtom,
  addIsolatedAtom,
  attachAbbreviatedAlkylTail,
  connectAtoms,
  cycleBondOrder,
  deleteAtomCascade,
  deleteAtomsCascade,
  deleteBondOnly,
  emptyDrawMolfile,
  hasDativeBond,
  parseDrawMolfile,
  fuseRingTemplateOnAtoms,
  addSmilesFragment,
  fuseRingTemplateOnBond,
  placeRingTemplate,
  assessMoleculeDatabasePrep,
  prepareMoleculeForDatabase,
  serializeDrawMolfile,
  setAtomChargeValue,
  setAtomElement,
  setBondKind,
  stabilizeLayout,
  type MoleculeDatabasePrepAssessment,
} from "../utils/molecule-graph-editing";
import { smilesForRegistryExport } from "../utils/polymer-export-smiles";
import { buildDatabasePrepSnapshotSvg } from "../utils/build-database-prep-snapshot-svg";
import { remapBookendMarksAfterMolEdit } from "../utils/remap-draw-bond-marks";
import {
  expandAllAbbreviatedAlkylLabels,
} from "../utils/alkyl-label-expand";
import { abbreviateTerminalAlkylChains } from "../utils/carbon-chain-abbr";
import { abbreviateNitrileGroups } from "../utils/depiction-coalescence";
import {
  flipSmallerFragmentAcrossBond,
  heavyAtomsAreBonded,
  rotateFragmentAroundBondPivot,
} from "../utils/bond-fragment-transforms";
import {
  alignBondVectorToAxis,
  centroidOfAtomIndices,
  cleanupMolecule2DSpacing,
  heavyAtomCentroid2D,
  rotateAllCoordsAroundPoint,
  rotateAtomIndices,
  translateAllCoords,
} from "../utils/molecule-2d-transforms";
import {
  cycleDoubleBondOffsetMode,
  DRAW_STANDARD_BOND_LENGTH,
  snapSproutPosition,
  type DrawPoint,
} from "../utils/molecule-draw-geometry";
import {
  boundaryBondMarksForAtoms,
  bondMarksEqual,
  cutChunkFragments,
  extractBookendRegion,
  resolveBondMark,
  validateMarkableBond,
  type BookendExtraction,
  type ChunkCutResult,
} from "../utils/polymer-bookends";
import { translateAtomIndices } from "../utils/molecule-2d-transforms";
import { useMolfileHistory } from "./use-molfile-history";

/** Bookend marks on the canvas: opening `[` bond and closing `]` bond. */
export interface BookendMarksState {
  open: DrawBondMark | null;
  close: DrawBondMark | null;
}

/** Full state and operations returned by {@link useMoleculeDrawState}. */
export interface MoleculeDrawState {
  /** Current V2000 molfile (editing source of truth). */
  molfile: string;
  /** Parsed molecule for the current molfile; replaced on every edit. */
  molecule: Molecule;
  /** Active interaction tool. */
  tool: DrawTool;
  /** Switches the active tool and clears any transient polymer error. */
  setTool: (tool: DrawTool) => void;
  /** Bond kind used when drawing or retyping bonds from the draw tool. */
  drawBondKind: DrawBondKind;
  /** Sets the active bond kind for the draw tool. */
  setDrawBondKind: (kind: DrawBondKind) => void;
  /** Canonical isomeric SMILES of the full drawing (empty when no atoms). */
  smiles: string;
  /** True when the drawing contains a dative bond (SMILES caveat applies). */
  containsDativeBond: boolean;
  /** Bookend bond marks, or null slots when not yet placed. */
  bookends: BookendMarksState;
  /** Repeat-unit extraction for the current bookends, null until both are set. */
  bookendExtraction: BookendExtraction | null;
  /** Chunk cut bond marks in placement order. */
  chunkMarks: DrawBondMark[];
  /** Block fragments for the current chunk cuts, null when no cuts placed. */
  chunkResult: ChunkCutResult | null;
  /** Inline error from the most recent polymer-tool interaction, if any. */
  polymerError: string | null;
  /** Adds an isolated atom of the given element at a molecule-space point. */
  addAtomAt: (point: DrawPoint, atomicNo: number) => void;
  /** Sprouts a snapped bond plus new atom from an existing atom. */
  sproutBond: (fromAtom: number, toward: DrawPoint, kind: DrawBondKind) => void;
  /**
   * Places a carbon at `start` and sprouts a bond toward `toward` in one edit
   * (ChemDraw-style drag from empty canvas).
   */
  addAtomSproutFromEmpty: (
    start: DrawPoint,
    toward: DrawPoint,
    kind: DrawBondKind,
  ) => void;
  /** Bonds two existing atoms (rewrites kind when already bonded). */
  bondBetween: (atomA: number, atomB: number, kind: DrawBondKind) => void;
  /** Cycles a bond single, double, triple, single. */
  cycleBond: (bond: number) => void;
  /** Rewrites a bond to an explicit kind (used by the dative tool). */
  retypeBond: (bond: number, kind: DrawBondKind) => void;
  /** Reassigns an atom's element symbol; surfaces errors inline. */
  assignElement: (atom: number, symbol: string) => void;
  /** Sets an atom's formal charge. */
  assignCharge: (atom: number, charge: number) => void;
  /** Deletes an atom and its bonds; clears polymer marks. */
  eraseAtom: (atom: number) => void;
  /**
   * Deletes every atom in the current select-tool selection in one undo step;
   * clears the selection and polymer marks on success.
   */
  eraseSelectedAtoms: () => void;
  /** Deletes one bond; clears polymer marks. */
  eraseBond: (bond: number) => void;
  /** Recomputes idealized coordinates for the whole drawing. */
  stabilize: () => void;
  /**
   * Runs {@link prepareForDatabase}: abbreviates alkyl tails and nitriles while
   * preserving orientation; optionally compacts spacing when
   * {@link compactSpacingOnPrep} is true.
   */
  prepareForDatabase: () => void;
  /** Scales coordinates about the centroid without abbreviating labels. */
  tidyLayout: () => void;
  /** Non-blocking upload-prep hints for the current drawing. */
  prepAssessment: MoleculeDatabasePrepAssessment;
  /** When true, {@link prepareForDatabase} and snapshot generation also run spacing compaction. */
  compactSpacingOnPrep: boolean;
  /** Toggles optional whitespace compaction for database prep and snapshots. */
  setCompactSpacingOnPrep: (enabled: boolean) => void;
  /** Clears the canvas and all polymer marks. */
  clearAll: () => void;
  /** Replaces the drawing with a structure parsed from SMILES. */
  loadSmiles: (smiles: string) => void;
  /**
   * Rebuilds the canvas from {@link MoleculeDrawState.smiles}: fresh
   * CoordinateInventor layout, database alkyl/nitrile abbreviations, and cleared
   * polymer marks. Canonical SMILES does not encode repeat-unit bookends, so
   * bookend and block marks are always reset.
   */
  regenerateFromSmiles: () => void;
  /**
   * Merges a SMILES fragment at `centerPoint` without clearing the canvas;
   * surfaces parse errors inline via {@link MoleculeDrawState.polymerError}.
   */
  addSmilesFragmentAt: (smiles: string, centerPoint: DrawPoint) => void;
  /**
   * Queues a SMILES fragment for click-to-place on the canvas; clears on place
   * or {@link cancelPendingSmilesFragment}.
   */
  queueSmilesFragmentPlacement: (smiles: string) => void;
  /** SMILES waiting for a canvas click, or null when not in place mode. */
  pendingSmilesFragment: string | null;
  /** Places the queued fragment at `centerPoint` and clears the queue. */
  placePendingSmilesFragment: (centerPoint: DrawPoint) => void;
  /** Clears click-to-place fragment mode without editing the structure. */
  cancelPendingSmilesFragment: () => void;
  /**
   * Default molecule-space center for a new disconnected fragment: origin on an
   * empty canvas, otherwise offset to the right of the heavy-atom centroid.
   */
  defaultFragmentCenter: () => DrawPoint;
  /** Places the next bookend (open first, then close) on a bond. */
  placeBookend: (bond: number) => void;
  /** Removes both bookends. */
  clearBookends: () => void;
  /** Per-bond manual double-bond line placement overrides. */
  doubleBondOffsetModes: Readonly<Record<string, DoubleBondOffsetMode>>;
  /** Cage bond depth tiers for muted rear bonds, keyed by atom pair. */
  cageBondDepthTierByMark: Readonly<CageBondDepthTierByMark>;
  /** Active fullerene cage depiction mode (`2d` flat or `3d` perspective). */
  cageDepictionMode: CageDepictionMode;
  /** Switches cage depiction mode and re-projects placed cage fragments. */
  setCageDepictionMode: (mode: CageDepictionMode) => void;
  /** Camera orbit for cage 3D depiction and placement preview. */
  cageView3d: View3d;
  /** Resets cage orbit to the default face-on view. */
  resetCageView: () => void;
  /** Applies incremental yaw/pitch during cage-orbit drag without recording undo. */
  orbitCageDuringDrag: (dYaw: number, dPitch: number) => void;
  /** Commits a cage-orbit drag as one undo step when the molfile changed. */
  commitCageOrbitDrag: (snapshotBeforeDrag: string) => void;
  /** True when a cage-orbit drag is active (fast wireframe path). */
  cageOrbitDragging: boolean;
  /** Latest wireframe projection during cage-orbit drag, or null when idle. */
  cageOrbitFastFrame: CageOrbitWireframeFrame | null;
  /** Marks the start of a cage-orbit drag and caches the 3D session for rAF updates. */
  beginCageOrbitDrag: () => void;
  /** Clears orbit-drag transient state after pointerup. */
  endCageOrbitDrag: () => void;
  /** True when the canvas holds cage depth-tier marks. */
  hasCageDepiction: boolean;
  /** Cycles double-bond offset mode for a bond (draw tool). */
  cycleDoubleBondOffset: (bond: number) => void;
  /** Resolves the offset mode for a bond index. */
  doubleBondOffsetForBond: (bond: number) => DoubleBondOffsetMode;
  /** Adds or removes a chunk cut on a bond. */
  toggleChunkCut: (bond: number) => void;
  /** Removes all chunk cuts. */
  clearChunkCuts: () => void;
  /** Undoes the last structural edit; clears polymer marks. */
  undo: () => void;
  /** Redoes the last undone edit; clears polymer marks. */
  redo: () => void;
  /** True when an undo step is available. */
  canUndo: boolean;
  /** True when a redo step is available. */
  canRedo: boolean;
  /** Active layout tool, or null when layout mode is off. */
  layoutTool: LayoutTool | null;
  /** Sets the layout tool; clears align/pivot picks when switching or clearing. */
  setLayoutTool: (tool: LayoutTool | null) => void;
  /** Atom indices picked for align (0, 1, or 2). */
  alignAtoms: number[];
  /** Atom indices picked for pivot (0, 1, or 2). */
  pivotAtoms: number[];
  /** Registers an atom click for align or pivot picking. */
  pickLayoutAtom: (atom: number) => void;
  /** Registers a bond click for pivot picking. */
  pickLayoutBond: (bond: number) => void;
  /** Clears align atom picks. */
  clearAlignPicks: () => void;
  /** Clears pivot atom picks. */
  clearPivotPicks: () => void;
  /** Aligns the vector between two picked atoms along x or y. */
  alignAlongAxis: (axis: "x" | "y") => void;
  /** Flips the smaller fragment across the pivot bond. */
  pivotFlip: () => void;
  /** Rotates the pivot fragment by the given degrees. */
  pivotRotate: (deg: number) => void;
  /** Applies a 2D translation during layout drag (skips history until commit). */
  translateDuringDrag: (dx: number, dy: number) => void;
  /** Applies a 2D rotation during layout drag (skips history until commit). */
  rotateDuringDrag: (deltaRad: number) => void;
  /** Commits a layout drag as one undo step when the molfile changed. */
  commitLayoutDrag: (snapshotBeforeDrag: string) => void;
  /** Abbreviates terminal alkyl chains to CnH2n+1 labels. */
  abbreviateAlkylTails: () => void;
  /** Expands abbreviated alkyl labels back to chains. */
  expandAlkylTails: () => void;
  /** Abbreviates nitrile groups as CN. */
  abbreviateNitriles: () => void;
  /** Attaches an abbreviated CnH2n+1 alkyl tail to an atom. */
  attachAlkylTail: (
    attachAtom: number,
    spec: AbbreviatedAlkylTailSpec,
    toward?: DrawPoint,
  ) => void;
  /** Scales the drawing slightly about its centroid. */
  cleanupSpacing: () => void;
  /** Inline layout-tool error message, if any. */
  layoutError: string | null;
  /** Brief status note after a layout action. */
  layoutNote: string | null;
  /** Selected ring template preset for template placement mode. */
  selectedRingTemplate: RingTemplatePreset;
  /** Switches the active ring template and enables template placement mode. */
  selectRingTemplate: (templateId: string) => void;
  /**
   * Selects a polycyclic cage by carbon count (tabulated SMILES only) and
   * enables template placement mode; returns an error result when N is unsupported.
   */
  selectCageByCarbonCount: (carbonCount: number) => CageSmilesResult;
  /** Places the selected ring template with its centroid at a molecule-space point. */
  placeRingTemplateAt: (point: DrawPoint) => void;
  /** Fuses the selected ring template onto an existing bond (shared edge). */
  fuseRingTemplateOnBond: (bond: number) => void;
  /**
   * Registers an atom for template fusion; when two bonded atoms are picked,
   * fuses the template and clears the pick list.
   */
  pickTemplateFuseAtom: (atom: number) => void;
  /** Atom indices picked for two-click template fusion (0, 1, or 2). */
  templateFuseAtoms: number[];
  /** Clears template fusion atom picks. */
  clearTemplateFusePick: () => void;
  /** Atom indices selected by the select tool (marquee or shift-click). */
  selectedAtoms: number[];
  /** Replaces the current atom selection. */
  setSelectedAtoms: (atoms: number[]) => void;
  /** Toggles one atom in the selection (shift-click). */
  toggleAtomSelection: (atom: number) => void;
  /** Clears the atom selection. */
  clearSelection: () => void;
  /** Translates selected atoms during a drag (skips history until commit). */
  translateSelectedDuringDrag: (dx: number, dy: number) => void;
  /** Commits a selection move as one undo step when the molfile changed. */
  commitSelectionDrag: (snapshotBeforeDrag: string) => void;
  /**
   * Rotates the current atom selection by `deg` degrees about its centroid in
   * one undo step; no-op when nothing is selected.
   */
  rotateSelectedByDegrees: (deg: number) => void;
  /**
   * Marks chunk cuts on every bond crossing the selection boundary so the
   * selected subgraph becomes a block fragment in the SMILES list.
   */
  classifySelectionAsBlock: () => void;
  /**
   * Prepares the drawing for database upload and returns a themed SVG depiction
   * matching catalog `MoleculeImageSVG` styling. Mutates the canvas in one undo
   * step unless the canvas is empty.
   */
  generateDatabaseSnapshot: (isDark: boolean) => DatabaseSnapshotResult;
}

/** Successful database snapshot from {@link MoleculeDrawState.generateDatabaseSnapshot}. */
export interface DatabaseSnapshotSuccess {
  ok: true;
  /** Full SVG document suitable for `molecules.imageurl` upload. */
  svg: string;
  /** Canonical isomeric SMILES after upload prep. */
  smiles: string;
}

/** Failed database snapshot. */
export interface DatabaseSnapshotFailure {
  ok: false;
  message: string;
}

/** Result of {@link MoleculeDrawState.generateDatabaseSnapshot}. */
export type DatabaseSnapshotResult = DatabaseSnapshotSuccess | DatabaseSnapshotFailure;

/**
 * Owns the interactive draw-canvas state: the V2000 molfile source of truth
 * with undo/redo via the shared molfile history hook, the active tool,
 * polymer bookend and chunk marks, and all derived outputs (canonical SMILES,
 * repeat-unit extraction, block fragments).
 *
 * Structural edits parse a fresh molecule from the current molfile, apply one
 * pure operation from `molecule-graph-editing`, and commit the previous
 * molfile as an undo point. Destructive edits (erase, undo, redo, clear,
 * load) also clear polymer marks because OpenChemLib renumbers indices;
 * additive and label edits keep marks valid.
 */
export function useMoleculeDrawState(): MoleculeDrawState {
  const history = useMolfileHistory(emptyDrawMolfile());
  const [tool, setToolState] = useState<DrawTool>("draw");
  const [drawBondKind, setDrawBondKind] = useState<DrawBondKind>("single");
  const [layoutTool, setLayoutToolState] = useState<LayoutTool | null>(null);
  const [alignAtoms, setAlignAtoms] = useState<number[]>([]);
  const [pivotAtoms, setPivotAtoms] = useState<number[]>([]);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [layoutNote, setLayoutNote] = useState<string | null>(null);
  const [bookends, setBookends] = useState<BookendMarksState>({
    open: null,
    close: null,
  });
  const [chunkMarks, setChunkMarks] = useState<DrawBondMark[]>([]);
  const [doubleBondOffsetModes, setDoubleBondOffsetModes] = useState<
    Record<string, DoubleBondOffsetMode>
  >({});
  const [cageBondDepthTierByMark, setCageBondDepthTierByMark] = useState<
    CageBondDepthTierByMark
  >({});
  const [cageDepictionMode, setCageDepictionModeState] = useState<CageDepictionMode>("2d");
  const [cageView3d, setCageView3d] = useState<View3d>(() =>
    applyView3dAxisPreset(defaultView3d(), "face"),
  );
  const cageSessionRef = useRef<{ molfile: string; session: Molecule3dSession } | null>(
    null,
  );
  const cagePlaneScaleRef = useRef<number>(1);
  const [polymerError, setPolymerError] = useState<string | null>(null);
  const [selectedRingTemplateId, setSelectedRingTemplateId] = useState(
    RING_TEMPLATE_PRESETS[0]!.id,
  );
  const [ringTemplateOverride, setRingTemplateOverride] =
    useState<RingTemplatePreset | null>(null);
  const [selectedAtoms, setSelectedAtomsState] = useState<number[]>([]);
  const [templateFuseAtoms, setTemplateFuseAtoms] = useState<number[]>([]);
  const [pendingSmilesFragment, setPendingSmilesFragment] = useState<string | null>(
    null,
  );
  const [compactSpacingOnPrep, setCompactSpacingOnPrep] = useState(false);

  const selectedRingTemplate = useMemo(() => {
    if (ringTemplateOverride !== null) {
      return ringTemplateOverride;
    }
    const match = RING_TEMPLATE_PRESETS.find(
      (preset) => preset.id === selectedRingTemplateId,
    );
    return match ?? RING_TEMPLATE_PRESETS[0]!;
  }, [ringTemplateOverride, selectedRingTemplateId]);

  const molecule = useMemo(() => {
    try {
      return parseDrawMolfile(history.molfile);
    } catch {
      return new MoleculeCtor(0, 0);
    }
  }, [history.molfile]);

  const smiles = useMemo(() => {
    try {
      return smilesForRegistryExport(molecule, bookends);
    } catch {
      return "";
    }
  }, [molecule, bookends]);

  const containsDativeBond = useMemo(() => hasDativeBond(molecule), [molecule]);

  const prepAssessment = useMemo(
    () => assessMoleculeDatabasePrep(molecule),
    [molecule],
  );

  const bookendExtraction = useMemo<BookendExtraction | null>(() => {
    if (bookends.open === null || bookends.close === null) {
      return null;
    }
    return extractBookendRegion(molecule, bookends.open, bookends.close);
  }, [molecule, bookends]);

  const chunkResult = useMemo<ChunkCutResult | null>(() => {
    if (chunkMarks.length === 0) {
      return null;
    }
    return cutChunkFragments(molecule, chunkMarks);
  }, [molecule, chunkMarks]);

  const mergeCageBondDepthTierMarks = useCallback(
    (marks: CageBondDepthTierByMark | undefined) => {
      if (marks === undefined || Object.keys(marks).length === 0) {
        return;
      }
      setCageBondDepthTierByMark((prev) => ({ ...prev, ...marks }));
    },
    [],
  );

  const hasCageDepiction = useMemo(
    () => Object.keys(cageBondDepthTierByMark).length > 0,
    [cageBondDepthTierByMark],
  );

  const resolveCageSession = useCallback((mol: Molecule): Molecule3dSession | null => {
    const molfileKey = serializeDrawMolfile(mol);
    if (cageSessionRef.current?.molfile === molfileKey) {
      return cageSessionRef.current.session;
    }
    const result = createMolecule3dSession(mol);
    if (!result.ok) {
      return null;
    }
    cageSessionRef.current = { molfile: molfileKey, session: result.session };
    return result.session;
  }, []);

  const reprojectCageFragments = useCallback(
    (
      mol: Molecule,
      mode: CageDepictionMode,
      depthMarks: CageBondDepthTierByMark,
      view: View3d,
      sessionOverride?: Molecule3dSession,
      touchCoordinates = true,
    ) => {
      const session = sessionOverride ?? resolveCageSession(mol);
      return reapplyCageDepictionModeOnMolecule(
        mol,
        mode,
        depthMarks,
        view,
        session ?? undefined,
        {
          fixedPlaneScale:
            mode === "3d" && cagePlaneScaleRef.current > 1
              ? cagePlaneScaleRef.current
              : undefined,
          touchCoordinates,
        },
      );
    },
    [resolveCageSession],
  );

  const cacheCagePlaneScaleFromCurrentMolfile = useCallback(() => {
    const mol = parseDrawMolfile(history.molfileRef.current);
    const session = resolveCageSession(mol);
    if (session === null) {
      return;
    }
    cagePlaneScaleRef.current = measureCageFacePlaneScale(session, cageView3d);
  }, [cageView3d, history.molfileRef, resolveCageSession]);

  const cageOrbitDrag = useCageOrbitDrag({
    cageDepictionMode,
    hasCageDepiction,
    cageBondDepthTierByMark,
    setCageBondDepthTierByMark,
    cageView3d,
    setCageView3d,
    resolveCageSession,
    cagePlaneScaleRef,
    cacheCagePlaneScaleFromCurrentMolfile,
    history,
    setPolymerError,
  });

  const clearMarks = useCallback(() => {
    setBookends({ open: null, close: null });
    setChunkMarks([]);
    setDoubleBondOffsetModes({});
    setCageBondDepthTierByMark({});
    setCageView3d(applyView3dAxisPreset(defaultView3d(), "face"));
    cageSessionRef.current = null;
    cagePlaneScaleRef.current = 1;
    cageOrbitDrag.resetOrbitDragTransientState();
    setPolymerError(null);
  }, [cageOrbitDrag]);

  const ringTemplatePlacementOptions = useMemo(
    () =>
      ringTemplateUsesCageProjection(selectedRingTemplate.category)
        ? {
            templateCategory: selectedRingTemplate.category as "cage",
            cageDepictionMode,
            cageView3d,
          }
        : undefined,
    [cageDepictionMode, cageView3d, selectedRingTemplate.category],
  );

  const applyEdit = useCallback(
    (edit: (mol: Molecule) => void, options?: { destructive?: boolean; skipHistory?: boolean }) => {
      const previous = history.molfileRef.current;
      let next: string;
      try {
        const mol = parseDrawMolfile(previous);
        edit(mol);
        next = serializeDrawMolfile(mol);
      } catch (error) {
        setPolymerError(
          error instanceof Error ? error.message : "Edit failed; structure unchanged.",
        );
        return;
      }
      if (next === previous) {
        return;
      }
      if (options?.skipHistory !== true) {
        history.commitHistoryPoint(previous);
      }
      history.molfileRef.current = next;
      history.displayedMolRef.current = next;
      history.setMolfile(next);
      setPolymerError(null);
      if (options?.destructive === true) {
        setBookends({ open: null, close: null });
        setChunkMarks([]);
      }
    },
    [history],
  );

  const setCageDepictionMode = useCallback(
    (mode: CageDepictionMode) => {
      setCageDepictionModeState(mode);
      if (!hasCageDepiction) {
        return;
      }
      if (mode === "3d" && cagePlaneScaleRef.current <= 1) {
        cacheCagePlaneScaleFromCurrentMolfile();
      }
      let nextDepthMarks = cageBondDepthTierByMark;
      applyEdit((mol) => {
        const updated = reprojectCageFragments(
          mol,
          mode,
          cageBondDepthTierByMark,
          cageView3d,
        );
        nextDepthMarks = updated.depthMarks;
        if (mode === "2d") {
          cagePlaneScaleRef.current = 1;
        } else if (cagePlaneScaleRef.current <= 1 && updated.planeScale > 0) {
          cagePlaneScaleRef.current = updated.planeScale;
        }
      });
      setCageBondDepthTierByMark(nextDepthMarks);
      setLayoutNote(
        mode === "2d"
          ? "Cage view: 2D orthographic snapshot (rear bonds muted)."
          : "Cage view: 3D perspective (rear bonds muted).",
      );
    },
    [
      applyEdit,
      cacheCagePlaneScaleFromCurrentMolfile,
      cageBondDepthTierByMark,
      cageView3d,
      hasCageDepiction,
      reprojectCageFragments,
    ],
  );

  const resetCageView = useCallback(() => {
    const faceView = applyView3dAxisPreset(defaultView3d(), "face");
    setCageView3d(faceView);
    if (!hasCageDepiction || cageDepictionMode !== "3d") {
      return;
    }
    let nextDepthMarks = cageBondDepthTierByMark;
    applyEdit((mol) => {
      const updated = reprojectCageFragments(
        mol,
        "3d",
        cageBondDepthTierByMark,
        faceView,
      );
      nextDepthMarks = updated.depthMarks;
      cagePlaneScaleRef.current = updated.planeScale;
    });
    setCageBondDepthTierByMark(nextDepthMarks);
    setLayoutNote("Cage orbit reset to face-on view.");
  }, [
    applyEdit,
    cageBondDepthTierByMark,
    cageDepictionMode,
    hasCageDepiction,
    reprojectCageFragments,
  ]);

  const clearSelection = useCallback(() => {
    setSelectedAtomsState([]);
  }, []);

  const setSelectedAtoms = useCallback((atoms: number[]) => {
    setSelectedAtomsState([...new Set(atoms)].sort((a, b) => a - b));
  }, []);

  const toggleAtomSelection = useCallback((atom: number) => {
    setSelectedAtomsState((prev) => {
      if (prev.includes(atom)) {
        return prev.filter((a) => a !== atom);
      }
      return [...prev, atom].sort((a, b) => a - b);
    });
  }, []);

  const setTool = useCallback((next: DrawTool) => {
    setToolState(next);
    setPolymerError(null);
    setLayoutToolState(null);
    setAlignAtoms([]);
    setPivotAtoms([]);
    setLayoutError(null);
    if (next !== "template") {
      setTemplateFuseAtoms([]);
    }
    if (next !== "select") {
      clearSelection();
    }
  }, [clearSelection]);

  const setLayoutTool = useCallback((next: LayoutTool | null) => {
    setLayoutToolState(next);
    setLayoutError(null);
    setLayoutNote(null);
    if (next !== "align") {
      setAlignAtoms([]);
    }
    if (next !== "pivot") {
      setPivotAtoms([]);
    }
  }, []);

  const pickLayoutAtom = useCallback(
    (atomId: number) => {
      setLayoutError(null);
      if (layoutTool === "align") {
        setAlignAtoms((prev) => {
          if (prev.length === 0) {
            return [atomId];
          }
          if (prev.length === 1) {
            if (prev[0] === atomId) {
              return prev;
            }
            return [prev[0]!, atomId];
          }
          return [atomId];
        });
        return;
      }
      if (layoutTool === "pivot") {
        setPivotAtoms((prev) => {
          if (prev.length === 0) {
            return [atomId];
          }
          if (prev.length === 1) {
            if (prev[0] === atomId) {
              return prev;
            }
            const hinge = prev[0]!;
            if (!heavyAtomsAreBonded(molecule, hinge, atomId)) {
              setLayoutError(
                "Pivot: pick a bonded atom for the second click, or click a bond.",
              );
              return [hinge];
            }
            return [hinge, atomId];
          }
          return [atomId];
        });
      }
    },
    [layoutTool, molecule],
  );

  const pickLayoutBond = useCallback(
    (bond: number) => {
      if (layoutTool !== "pivot") {
        return;
      }
      setLayoutError(null);
      const a = molecule.getBondAtom(0, bond);
      const b = molecule.getBondAtom(1, bond);
      setPivotAtoms([a, b]);
    },
    [layoutTool, molecule],
  );

  const clearAlignPicks = useCallback(() => {
    setAlignAtoms([]);
    setLayoutError(null);
  }, []);

  const clearPivotPicks = useCallback(() => {
    setPivotAtoms([]);
    setLayoutError(null);
  }, []);

  const alignAlongAxis = useCallback(
    (axis: "x" | "y") => {
      if (alignAtoms.length !== 2) {
        return;
      }
      applyEdit((mol) => {
        alignBondVectorToAxis(mol, alignAtoms[0]!, alignAtoms[1]!, axis);
      });
      setAlignAtoms([]);
      setLayoutNote(`Aligned picked atoms along ${axis.toUpperCase()}.`);
    },
    [alignAtoms, applyEdit],
  );

  const pivotFlip = useCallback(() => {
    if (pivotAtoms.length !== 2) {
      return;
    }
    applyEdit((mol) => {
      flipSmallerFragmentAcrossBond(mol, pivotAtoms[0]!, pivotAtoms[1]!);
    });
    setLayoutNote("Mirrored the smaller substituent across the pivot bond.");
  }, [pivotAtoms, applyEdit]);

  const pivotRotate = useCallback(
    (deg: number) => {
      if (pivotAtoms.length !== 2) {
        return;
      }
      const rad = (deg * Math.PI) / 180;
      applyEdit((mol) => {
        rotateFragmentAroundBondPivot(mol, pivotAtoms[0]!, pivotAtoms[1]!, rad);
      });
      setLayoutNote(`Rotated the pivot fragment by ${deg} degrees.`);
    },
    [pivotAtoms, applyEdit],
  );

  const translateDuringDrag = useCallback(
    (dx: number, dy: number) => {
      applyEdit(
        (mol) => {
          if (selectedAtoms.length > 0) {
            translateAtomIndices(mol, selectedAtoms, dx, dy);
          } else {
            translateAllCoords(mol, dx, dy);
          }
        },
        { skipHistory: true },
      );
    },
    [applyEdit, selectedAtoms],
  );

  const rotateDuringDrag = useCallback(
    (deltaRad: number) => {
      applyEdit(
        (mol) => {
          if (selectedAtoms.length > 0) {
            const c = centroidOfAtomIndices(mol, selectedAtoms);
            rotateAtomIndices(mol, selectedAtoms, c.x, c.y, deltaRad);
          } else {
            const c = heavyAtomCentroid2D(mol);
            rotateAllCoordsAroundPoint(mol, c.x, c.y, deltaRad);
          }
        },
        { skipHistory: true },
      );
    },
    [applyEdit, selectedAtoms],
  );

  const commitLayoutDrag = useCallback(
    (snapshotBeforeDrag: string) => {
      const current = history.molfileRef.current;
      if (snapshotBeforeDrag !== current) {
        history.commitHistoryPoint(snapshotBeforeDrag);
      }
    },
    [history],
  );

  const abbreviateAlkylTails = useCallback(() => {
    let abbreviated = 0;
    applyEdit((mol) => {
      abbreviated = abbreviateTerminalAlkylChains(mol);
    });
    if (abbreviated > 0) {
      setLayoutNote(`Abbreviated ${abbreviated} alkyl tail(s).`);
    }
  }, [applyEdit]);

  const expandAlkylTails = useCallback(() => {
    let expanded = 0;
    applyEdit((mol) => {
      expanded = expandAllAbbreviatedAlkylLabels(mol);
    });
    if (expanded > 0) {
      setLayoutNote(`Expanded ${expanded} abbreviated tail(s).`);
    }
  }, [applyEdit]);

  const abbreviateNitriles = useCallback(() => {
    let abbreviated = 0;
    applyEdit((mol) => {
      abbreviated = abbreviateNitrileGroups(mol);
    });
    if (abbreviated > 0) {
      setLayoutNote(`Abbreviated ${abbreviated} nitrile group(s) as CN.`);
    }
  }, [applyEdit]);

  const attachAlkylTail = useCallback(
    (attachAtom: number, spec: AbbreviatedAlkylTailSpec, toward?: DrawPoint) => {
      applyEdit((mol) => {
        attachAbbreviatedAlkylTail(mol, attachAtom, spec, { toward });
      });
      setLayoutNote(`Attached C${spec.carbonCount}H${2 * spec.carbonCount + 1} alkyl tail.`);
    },
    [applyEdit],
  );

  const cleanupSpacing = useCallback(() => {
    applyEdit((mol) => {
      cleanupMolecule2DSpacing(mol);
    });
    setLayoutNote("Scaled the drawing slightly about its centroid.");
  }, [applyEdit]);

  const addAtomAt = useCallback(
    (point: DrawPoint, atomicNo: number) => {
      applyEdit((mol) => {
        addIsolatedAtom(mol, point.x, point.y, atomicNo);
      });
    },
    [applyEdit],
  );

  const sproutBond = useCallback(
    (fromAtom: number, toward: DrawPoint, kind: DrawBondKind) => {
      applyEdit((mol) => {
        const from = { x: mol.getAtomX(fromAtom), y: mol.getAtomY(fromAtom) };
        const snapped = snapSproutPosition(from, toward, DRAW_STANDARD_BOND_LENGTH);
        addBondedAtom(mol, fromAtom, snapped.x, snapped.y, 6, kind);
      });
    },
    [applyEdit],
  );

  const addAtomSproutFromEmpty = useCallback(
    (start: DrawPoint, toward: DrawPoint, kind: DrawBondKind) => {
      applyEdit((mol) => {
        const fromAtom = addIsolatedAtom(mol, start.x, start.y, 6);
        const from = { x: mol.getAtomX(fromAtom), y: mol.getAtomY(fromAtom) };
        const snapped = snapSproutPosition(from, toward, DRAW_STANDARD_BOND_LENGTH);
        addBondedAtom(mol, fromAtom, snapped.x, snapped.y, 6, kind);
      });
    },
    [applyEdit],
  );

  const bondBetween = useCallback(
    (atomA: number, atomB: number, kind: DrawBondKind) => {
      applyEdit((mol) => {
        connectAtoms(mol, atomA, atomB, kind);
      });
    },
    [applyEdit],
  );

  const cycleBond = useCallback(
    (bond: number) => {
      applyEdit((mol) => {
        cycleBondOrder(mol, bond);
      });
    },
    [applyEdit],
  );

  const retypeBond = useCallback(
    (bond: number, kind: DrawBondKind) => {
      applyEdit((mol) => {
        setBondKind(mol, bond, kind);
      });
    },
    [applyEdit],
  );

  const assignElement = useCallback(
    (atom: number, symbol: string) => {
      applyEdit((mol) => {
        setAtomElement(mol, atom, symbol);
      });
    },
    [applyEdit],
  );

  const assignCharge = useCallback(
    (atom: number, charge: number) => {
      applyEdit((mol) => {
        setAtomChargeValue(mol, atom, charge);
      });
    },
    [applyEdit],
  );

  const eraseAtom = useCallback(
    (atom: number) => {
      applyEdit(
        (mol) => {
          deleteAtomCascade(mol, atom);
        },
        { destructive: true },
      );
    },
    [applyEdit],
  );

  const eraseSelectedAtoms = useCallback(() => {
    if (selectedAtoms.length === 0) {
      return;
    }
    const atomsToDelete = [...selectedAtoms];
    applyEdit(
      (mol) => {
        deleteAtomsCascade(mol, atomsToDelete);
      },
      { destructive: true },
    );
    clearSelection();
  }, [applyEdit, clearSelection, selectedAtoms]);

  const eraseBond = useCallback(
    (bond: number) => {
      applyEdit(
        (mol) => {
          deleteBondOnly(mol, bond);
        },
        { destructive: true },
      );
    },
    [applyEdit],
  );

  const stabilize = useCallback(() => {
    applyEdit((mol) => {
      stabilizeLayout(mol);
    });
    setLayoutNote("Stabilized coordinates with CoordinateInventor.");
  }, [applyEdit]);

  const prepareForDatabase = useCallback(() => {
    let alkylAbbreviated = 0;
    let nitrileAbbreviated = 0;
    const previous = history.molfileRef.current;
    const beforeMol = parseDrawMolfile(previous);
    applyEdit((mol) => {
      const counts = prepareMoleculeForDatabase(mol);
      alkylAbbreviated = counts.alkylAbbreviated;
      nitrileAbbreviated = counts.nitrileAbbreviated;
      if (compactSpacingOnPrep) {
        cleanupMolecule2DSpacing(mol);
      }
    });
    const next = history.molfileRef.current;
    if (next !== previous) {
      setBookends((current) =>
        remapBookendMarksAfterMolEdit(beforeMol, parseDrawMolfile(next), current),
      );
    }
    const notes = ["Prepared for database upload (orientation preserved)."];
    if (alkylAbbreviated > 0) {
      notes.push(`Abbreviated ${alkylAbbreviated} alkyl tail(s).`);
    }
    if (nitrileAbbreviated > 0) {
      notes.push(`Abbreviated ${nitrileAbbreviated} nitrile group(s) as CN.`);
    }
    if (alkylAbbreviated === 0 && nitrileAbbreviated === 0) {
      notes.push("No abbreviations were needed.");
    }
    if (compactSpacingOnPrep) {
      notes.push("Compacted layout spacing.");
    }
    setLayoutNote(notes.join(" "));
  }, [applyEdit, compactSpacingOnPrep, history]);

  const tidyLayout = cleanupSpacing;

  const generateDatabaseSnapshot = useCallback(
    (isDark: boolean): DatabaseSnapshotResult => {
      if (molecule.getAllAtoms() === 0) {
        return { ok: false, message: "Draw a structure before generating a snapshot." };
      }
      const previous = history.molfileRef.current;
      let next = previous;
      let svg: string | null = null;
      let smiles = "";
      let snapshotBookends = bookends;
      try {
        const beforeMol = parseDrawMolfile(previous);
        const mol = parseDrawMolfile(previous);
        prepareMoleculeForDatabase(mol);
        if (compactSpacingOnPrep) {
          cleanupMolecule2DSpacing(mol);
        }
        const hasCageMarks = Object.keys(cageBondDepthTierByMark).length > 0;
        if (hasCageMarks) {
          const sessionResult = createMolecule3dSession(mol);
          if (sessionResult.ok) {
            reapplyCageDepictionModeOnMolecule(
              mol,
              "2d",
              cageBondDepthTierByMark,
              cageView3d,
              sessionResult.session,
            );
          }
        }
        snapshotBookends = remapBookendMarksAfterMolEdit(
          beforeMol,
          mol,
          bookends,
        );
        next = serializeDrawMolfile(mol);
        smiles = smilesForRegistryExport(mol, snapshotBookends);
        const svgId = `atlas-db-snap-${Date.now()}`;
        svg = buildDatabasePrepSnapshotSvg({
          mol,
          width: DATABASE_DEPICTION_WIDTH_PX,
          height: DATABASE_DEPICTION_HEIGHT_PX,
          svgId,
          isDark,
          bookends: snapshotBookends,
          cageBondDepthTierByMark,
          cageDepictionMode,
        });
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error ? error.message : "Snapshot generation failed.",
        };
      }
      if (svg === null) {
        return { ok: false, message: "Could not render database depiction SVG." };
      }
      if (next !== previous) {
        history.commitHistoryPoint(previous);
        history.molfileRef.current = next;
        history.displayedMolRef.current = next;
        history.setMolfile(next);
        setBookends(snapshotBookends);
        setPolymerError(null);
      }
      const notes = ["Database snapshot generated."];
      if (compactSpacingOnPrep) {
        notes.push("Included compact layout spacing.");
      }
      setLayoutNote(notes.join(" "));
      return { ok: true, svg, smiles };
    },
    [
      bookends,
      cageBondDepthTierByMark,
      cageDepictionMode,
      cageView3d,
      compactSpacingOnPrep,
      history,
      molecule,
    ],
  );

  const clearAll = useCallback(() => {
    applyEdit(
      (mol) => {
        while (mol.getAllAtoms() > 0) {
          mol.deleteAtom(mol.getAllAtoms() - 1);
        }
      },
      { destructive: true },
    );
    clearMarks();
  }, [applyEdit, clearMarks]);

  const loadSmiles = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (trimmed.length === 0) {
        return;
      }
      const previous = history.molfileRef.current;
      let next: string;
      try {
        const mol = MoleculeCtor.fromSmiles(trimmed);
        stabilizeLayout(mol);
        next = serializeDrawMolfile(mol);
      } catch {
        setPolymerError(`Could not parse SMILES "${trimmed}".`);
        return;
      }
      if (next === previous) {
        return;
      }
      history.commitHistoryPoint(previous);
      history.molfileRef.current = next;
      history.displayedMolRef.current = next;
      history.setMolfile(next);
      setBookends({ open: null, close: null });
      setChunkMarks([]);
      setPendingSmilesFragment(null);
      clearSelection();
      setPolymerError(null);
    },
    [history, clearSelection],
  );

  const regenerateFromSmiles = useCallback(() => {
    const trimmed = smiles.trim();
    if (trimmed.length === 0) {
      return;
    }
    const previous = history.molfileRef.current;
    let next: string;
    let remappedBookends = bookends;
    try {
      const beforeMol = parseDrawMolfile(previous);
      const mol = MoleculeCtor.fromSmiles(trimmed);
      stabilizeLayout(mol);
      prepareMoleculeForDatabase(mol);
      if (compactSpacingOnPrep) {
        cleanupMolecule2DSpacing(mol);
      }
      remappedBookends = remapBookendMarksAfterMolEdit(
        beforeMol,
        mol,
        bookends,
      );
      next = serializeDrawMolfile(mol);
    } catch {
      setPolymerError(`Could not rebuild structure from SMILES "${trimmed}".`);
      return;
    }
    history.commitHistoryPoint(previous);
    history.molfileRef.current = next;
    history.displayedMolRef.current = next;
    history.setMolfile(next);
    setBookends(remappedBookends);
    setChunkMarks([]);
    setPendingSmilesFragment(null);
    clearSelection();
    setPolymerError(null);
    setLayoutNote("Regenerated layout from canonical SMILES.");
  }, [
    smiles,
    history,
    compactSpacingOnPrep,
    bookends,
    clearSelection,
  ]);

  const defaultFragmentCenter = useCallback((): DrawPoint => {
    if (molecule.getAllAtoms() === 0) {
      return { x: 0, y: 0 };
    }
    const c = heavyAtomCentroid2D(molecule);
    return {
      x: c.x + DRAW_STANDARD_BOND_LENGTH * 3,
      y: c.y,
    };
  }, [molecule]);

  const addSmilesFragmentAt = useCallback(
    (input: string, centerPoint: DrawPoint) => {
      const trimmed = input.trim();
      if (trimmed.length === 0) {
        return;
      }
      applyEdit((mol) => {
        const added = addSmilesFragment(mol, trimmed, centerPoint);
        if (added === 0) {
          throw new Error(`Could not add SMILES fragment "${trimmed}".`);
        }
      });
      setPendingSmilesFragment(null);
      setPolymerError(null);
      setLayoutNote(`Added fragment from SMILES.`);
    },
    [applyEdit],
  );

  const queueSmilesFragmentPlacement = useCallback((input: string) => {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return;
    }
    try {
      const probe = MoleculeCtor.fromSmiles(trimmed);
      if (probe.getAllAtoms() === 0) {
        setPolymerError(`Could not parse SMILES "${trimmed}".`);
        return;
      }
    } catch {
      setPolymerError(`Could not parse SMILES "${trimmed}".`);
      return;
    }
    setPendingSmilesFragment(trimmed);
    setPolymerError(null);
    setLayoutNote("Click the canvas to place the SMILES fragment.");
  }, []);

  const cancelPendingSmilesFragment = useCallback(() => {
    setPendingSmilesFragment(null);
  }, []);

  const placePendingSmilesFragment = useCallback(
    (centerPoint: DrawPoint) => {
      if (pendingSmilesFragment === null) {
        return;
      }
      addSmilesFragmentAt(pendingSmilesFragment, centerPoint);
    },
    [addSmilesFragmentAt, pendingSmilesFragment],
  );

  const placeBookend = useCallback(
    (bond: number) => {
      const error = validateMarkableBond(molecule, bond);
      if (error !== null) {
        setPolymerError(error);
        return;
      }
      const mark: DrawBondMark = {
        atomA: molecule.getBondAtom(0, bond),
        atomB: molecule.getBondAtom(1, bond),
      };
      setPolymerError(null);
      setBookends((current) => {
        if (current.open === null) {
          return { open: mark, close: null };
        }
        if (bondMarksEqual(current.open, mark)) {
          return {
            open: { ...mark, openingFlip: !current.open.openingFlip },
            close: current.close,
          };
        }
        if (current.close !== null && bondMarksEqual(current.close, mark)) {
          return {
            open: current.open,
            close: { ...mark, openingFlip: !current.close.openingFlip },
          };
        }
        if (current.close === null) {
          return { open: current.open, close: mark };
        }
        return { open: mark, close: null };
      });
    },
    [molecule],
  );

  const doubleBondOffsetForBond = useCallback(
    (bond: number): DoubleBondOffsetMode => {
      const atomA = molecule.getBondAtom(0, bond);
      const atomB = molecule.getBondAtom(1, bond);
      return doubleBondOffsetModes[bondMarkKey(atomA, atomB)] ?? "auto";
    },
    [molecule, doubleBondOffsetModes],
  );

  const cycleDoubleBondOffset = useCallback(
    (bond: number) => {
      const atomA = molecule.getBondAtom(0, bond);
      const atomB = molecule.getBondAtom(1, bond);
      const key = bondMarkKey(atomA, atomB);
      setDoubleBondOffsetModes((current) => {
        const next = cycleDoubleBondOffsetMode(current[key] ?? "auto");
        return { ...current, [key]: next };
      });
    },
    [molecule],
  );

  const clearBookends = useCallback(() => {
    setBookends({ open: null, close: null });
    setPolymerError(null);
  }, []);

  const toggleChunkCut = useCallback(
    (bond: number) => {
      const error = validateMarkableBond(molecule, bond);
      if (error !== null) {
        setPolymerError(error);
        return;
      }
      const mark: DrawBondMark = {
        atomA: molecule.getBondAtom(0, bond),
        atomB: molecule.getBondAtom(1, bond),
      };
      setPolymerError(null);
      setChunkMarks((current) => {
        const existing = current.findIndex((m) => bondMarksEqual(m, mark));
        if (existing >= 0) {
          return current.filter((_, i) => i !== existing);
        }
        return [...current, mark];
      });
    },
    [molecule],
  );

  const clearChunkCuts = useCallback(() => {
    setChunkMarks([]);
    setPolymerError(null);
  }, []);

  const undo = useCallback(() => {
    history.undo();
    clearMarks();
  }, [history, clearMarks]);

  const clearTemplateFusePick = useCallback(() => {
    setTemplateFuseAtoms([]);
  }, []);

  const selectRingTemplate = useCallback((templateId: string) => {
    setRingTemplateOverride(null);
    setSelectedRingTemplateId(templateId);
    setToolState("template");
    setLayoutToolState(null);
    setAlignAtoms([]);
    setPivotAtoms([]);
    setTemplateFuseAtoms([]);
    setPolymerError(null);
    setLayoutError(null);
    const preset =
      RING_TEMPLATE_PRESETS.find((entry) => entry.id === templateId) ??
      RING_TEMPLATE_PRESETS[0]!;
    setLayoutNote(
      `${preset.name} selected: click empty canvas to place, or click a bond to fuse.`,
    );
  }, []);

  const selectCageByCarbonCount = useCallback((carbonCount: number): CageSmilesResult => {
    const result = cageSmilesForCarbonCount(carbonCount);
    if (!result.ok) {
      return result;
    }
    const override: RingTemplatePreset = {
      id: `cage-${result.carbonCount}`,
      name: result.label,
      smiles: result.smiles,
      category: "cage",
    };
    setRingTemplateOverride(override);
    setSelectedRingTemplateId(override.id);
    setToolState("template");
    setLayoutToolState(null);
    setAlignAtoms([]);
    setPivotAtoms([]);
    setTemplateFuseAtoms([]);
    setPolymerError(null);
    setLayoutError(null);
    setLayoutNote(
      `${result.label} (${result.carbonCount} C) selected: click empty canvas to place, or click a bond to fuse.`,
    );
    return result;
  }, []);

  const placeRingTemplateAt = useCallback(
    (point: DrawPoint) => {
      let placementDepthMarks: CageBondDepthTierByMark | undefined;
      applyEdit((mol) => {
        const result = placeRingTemplate(
          mol,
          selectedRingTemplate.smiles,
          point,
          ringTemplatePlacementOptions,
        );
        if (result.added === 0) {
          throw new Error(`Could not place ${selectedRingTemplate.name}.`);
        }
        placementDepthMarks = result.cageBondDepthTierByMark;
      });
      mergeCageBondDepthTierMarks(placementDepthMarks);
      if (ringTemplateUsesCageProjection(selectedRingTemplate.category)) {
        if (cageDepictionMode === "3d") {
          cacheCagePlaneScaleFromCurrentMolfile();
        } else {
          cagePlaneScaleRef.current = 1;
        }
      }
      setTemplateFuseAtoms([]);
      setLayoutNote(`Placed ${selectedRingTemplate.name}.`);
    },
    [
      applyEdit,
      cacheCagePlaneScaleFromCurrentMolfile,
      cageDepictionMode,
      mergeCageBondDepthTierMarks,
      ringTemplatePlacementOptions,
      selectedRingTemplate.category,
      selectedRingTemplate.name,
      selectedRingTemplate.smiles,
    ],
  );

  const fuseRingTemplateOnBondHandler = useCallback(
    (bond: number) => {
      let placementDepthMarks: CageBondDepthTierByMark | undefined;
      applyEdit((mol) => {
        const result = fuseRingTemplateOnBond(
          mol,
          selectedRingTemplate.smiles,
          bond,
          ringTemplatePlacementOptions,
        );
        if (result.added === 0) {
          throw new Error(`Could not fuse ${selectedRingTemplate.name} on that bond.`);
        }
        placementDepthMarks = result.cageBondDepthTierByMark;
      });
      mergeCageBondDepthTierMarks(placementDepthMarks);
      if (ringTemplateUsesCageProjection(selectedRingTemplate.category)) {
        if (cageDepictionMode === "3d") {
          cacheCagePlaneScaleFromCurrentMolfile();
        } else {
          cagePlaneScaleRef.current = 1;
        }
      }
      setTemplateFuseAtoms([]);
      setLayoutNote(`Fused ${selectedRingTemplate.name} on the picked bond.`);
    },
    [
      applyEdit,
      cacheCagePlaneScaleFromCurrentMolfile,
      cageDepictionMode,
      mergeCageBondDepthTierMarks,
      ringTemplatePlacementOptions,
      selectedRingTemplate.category,
      selectedRingTemplate.name,
      selectedRingTemplate.smiles,
    ],
  );

  const pickTemplateFuseAtom = useCallback(
    (atom: number) => {
      if (templateFuseAtoms.length === 0) {
        setTemplateFuseAtoms([atom]);
        setPolymerError(null);
        setLayoutNote(
          `First fusion atom picked; click a bonded neighbor or a bond for ${selectedRingTemplate.name}.`,
        );
        return;
      }
      const first = templateFuseAtoms[0]!;
      if (templateFuseAtoms.length === 1) {
        if (first === atom) {
          return;
        }
        if (!heavyAtomsAreBonded(molecule, first, atom)) {
          setTemplateFuseAtoms([atom]);
          setPolymerError(
            "Template fusion: pick a bonded neighbor or click the shared bond directly.",
          );
          return;
        }
        let placementDepthMarks: CageBondDepthTierByMark | undefined;
        applyEdit((mol) => {
          const result = fuseRingTemplateOnAtoms(
            mol,
            selectedRingTemplate.smiles,
            first,
            atom,
            ringTemplatePlacementOptions,
          );
          if (result.added === 0) {
            throw new Error(`Could not fuse ${selectedRingTemplate.name}.`);
          }
          placementDepthMarks = result.cageBondDepthTierByMark;
        });
        mergeCageBondDepthTierMarks(placementDepthMarks);
        if (ringTemplateUsesCageProjection(selectedRingTemplate.category)) {
          if (cageDepictionMode === "3d") {
            cacheCagePlaneScaleFromCurrentMolfile();
          } else {
            cagePlaneScaleRef.current = 1;
          }
        }
        setTemplateFuseAtoms([]);
        setLayoutNote(`Fused ${selectedRingTemplate.name} on the picked atoms.`);
        return;
      }
      setTemplateFuseAtoms([atom]);
      setPolymerError(null);
      setLayoutNote(
        `First fusion atom picked; click a bonded neighbor or a bond for ${selectedRingTemplate.name}.`,
      );
    },
    [
      applyEdit,
      cacheCagePlaneScaleFromCurrentMolfile,
      cageDepictionMode,
      molecule,
      mergeCageBondDepthTierMarks,
      ringTemplatePlacementOptions,
      selectedRingTemplate.category,
      selectedRingTemplate.name,
      selectedRingTemplate.smiles,
      templateFuseAtoms,
    ],
  );

  const translateSelectedDuringDrag = useCallback(
    (dx: number, dy: number) => {
      if (selectedAtoms.length === 0) {
        return;
      }
      applyEdit(
        (mol) => {
          translateAtomIndices(mol, selectedAtoms, dx, dy);
        },
        { skipHistory: true },
      );
    },
    [applyEdit, selectedAtoms],
  );

  const commitSelectionDrag = useCallback(
    (snapshotBeforeDrag: string) => {
      const current = history.molfileRef.current;
      if (snapshotBeforeDrag !== current) {
        history.commitHistoryPoint(snapshotBeforeDrag);
      }
    },
    [history],
  );

  const rotateSelectedByDegrees = useCallback(
    (deg: number) => {
      if (selectedAtoms.length === 0) {
        setLayoutError("Select atoms to rotate the selection.");
        return;
      }
      const rad = (deg * Math.PI) / 180;
      applyEdit((mol) => {
        const c = centroidOfAtomIndices(mol, selectedAtoms);
        rotateAtomIndices(mol, selectedAtoms, c.x, c.y, rad);
      });
      setLayoutNote(`Rotated selection by ${deg} degrees.`);
      setLayoutError(null);
    },
    [applyEdit, selectedAtoms],
  );

  const classifySelectionAsBlock = useCallback(() => {
    if (selectedAtoms.length === 0) {
      setPolymerError("Select atoms first (marquee or Shift+click).");
      return;
    }
    const selected = new Set(selectedAtoms);
    const boundaryMarks = boundaryBondMarksForAtoms(molecule, selected);
    if (boundaryMarks.length === 0) {
      setPolymerError(
        "Selection has no boundary bonds; include a connected subgraph with cuts to the rest.",
      );
      return;
    }
    const errors: string[] = [];
    const validMarks: DrawBondMark[] = [];
    for (const mark of boundaryMarks) {
      const bondIndex = resolveBondMark(molecule, mark);
      if (bondIndex < 0) {
        continue;
      }
      const error = validateMarkableBond(molecule, bondIndex);
      if (error !== null) {
        errors.push(error);
        continue;
      }
      validMarks.push(mark);
    }
    if (validMarks.length === 0) {
      setPolymerError(
        errors[0] ?? "No acyclic single bonds on the selection boundary.",
      );
      return;
    }
    setPolymerError(null);
    setChunkMarks((current) => {
      const merged = [...current];
      for (const mark of validMarks) {
        if (!merged.some((m) => bondMarksEqual(m, mark))) {
          merged.push(mark);
        }
      }
      return merged;
    });
    setLayoutNote(
      `Added ${validMarks.length} block cut(s) on the selection boundary.`,
    );
  }, [molecule, selectedAtoms]);

  const redo = useCallback(() => {
    history.redo();
    clearMarks();
  }, [history, clearMarks]);

  return {
    molfile: history.molfile,
    molecule,
    tool,
    setTool,
    drawBondKind,
    setDrawBondKind,
    smiles,
    containsDativeBond,
    bookends,
    bookendExtraction,
    chunkMarks,
    chunkResult,
    polymerError,
    addAtomAt,
    sproutBond,
    addAtomSproutFromEmpty,
    bondBetween,
    cycleBond,
    retypeBond,
    assignElement,
    assignCharge,
    eraseAtom,
    eraseSelectedAtoms,
    eraseBond,
    stabilize,
    prepareForDatabase,
    tidyLayout,
    prepAssessment,
    compactSpacingOnPrep,
    setCompactSpacingOnPrep,
    generateDatabaseSnapshot,
    clearAll,
    loadSmiles,
    regenerateFromSmiles,
    addSmilesFragmentAt,
    queueSmilesFragmentPlacement,
    pendingSmilesFragment,
    placePendingSmilesFragment,
    cancelPendingSmilesFragment,
    defaultFragmentCenter,
    placeBookend,
    clearBookends,
    doubleBondOffsetModes,
    cageBondDepthTierByMark,
    cageDepictionMode,
    setCageDepictionMode,
    cageView3d,
    resetCageView,
    orbitCageDuringDrag: cageOrbitDrag.orbitCageDuringDrag,
    commitCageOrbitDrag: cageOrbitDrag.commitCageOrbitDrag,
    cageOrbitDragging: cageOrbitDrag.cageOrbitDragging,
    cageOrbitFastFrame: cageOrbitDrag.cageOrbitFastFrame,
    beginCageOrbitDrag: cageOrbitDrag.beginCageOrbitDrag,
    endCageOrbitDrag: cageOrbitDrag.endCageOrbitDrag,
    hasCageDepiction,
    cycleDoubleBondOffset,
    doubleBondOffsetForBond,
    toggleChunkCut,
    clearChunkCuts,
    undo,
    redo,
    canUndo: history.undoStack.length > 0,
    canRedo: history.redoStack.length > 0,
    layoutTool,
    setLayoutTool,
    alignAtoms,
    pivotAtoms,
    pickLayoutAtom,
    pickLayoutBond,
    clearAlignPicks,
    clearPivotPicks,
    alignAlongAxis,
    pivotFlip,
    pivotRotate,
    translateDuringDrag,
    rotateDuringDrag,
    commitLayoutDrag,
    abbreviateAlkylTails,
    expandAlkylTails,
    abbreviateNitriles,
    attachAlkylTail,
    cleanupSpacing,
    layoutError,
    layoutNote,
    selectedRingTemplate,
    selectRingTemplate,
    selectCageByCarbonCount,
    placeRingTemplateAt,
    fuseRingTemplateOnBond: fuseRingTemplateOnBondHandler,
    pickTemplateFuseAtom,
    templateFuseAtoms,
    clearTemplateFusePick,
    selectedAtoms,
    setSelectedAtoms,
    toggleAtomSelection,
    clearSelection,
    translateSelectedDuringDrag,
    commitSelectionDrag,
    rotateSelectedByDegrees,
    classifySelectionAsBlock,
  };
}
