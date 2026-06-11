"use client";

import { useCallback, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Molecule } from "openchemlib";

import type { CageDepictionMode } from "../molecule-draw-types";
import type {
  CageBondDepthTierByMark,
  CageOrbitWireframeFrame,
} from "../utils/cage-template-placement";
import {
  cloneDrawCanvasMolecule,
  applyCageOrbitWireframeFrameToMolecule,
  commitCageOrbitProjectionToMolecule,
} from "../utils/cage-template-placement";
import {
  CageOrbitRafScheduler,
  advanceCageOrbitView,
  calibrateCageOrbitPlaneScaleForMol,
  projectCageOrbitFastFrame,
} from "../utils/cage-orbit-drag";
import type { Molecule3dSession, View3d } from "../utils/molecule-3d-depth-wireframe";
import { parseDrawMolfile, serializeDrawMolfile } from "../utils/molecule-graph-editing";

/** Mutable molfile history surface used for orbit commit and undo. */
export interface CageOrbitDragHistory {
  molfileRef: RefObject<string>;
  displayedMolRef: RefObject<string>;
  setMolfile: (molfile: string) => void;
  commitHistoryPoint: (snapshotBeforeDrag: string) => void;
}

/** External cage-orbit dependencies owned by {@link useMoleculeDrawState}. */
export interface CageOrbitDragContext {
  cageDepictionMode: CageDepictionMode;
  hasCageDepiction: boolean;
  cageBondDepthTierByMark: CageBondDepthTierByMark;
  setCageBondDepthTierByMark: Dispatch<SetStateAction<CageBondDepthTierByMark>>;
  cageView3d: View3d;
  setCageView3d: Dispatch<SetStateAction<View3d>>;
  resolveCageSession: (mol: Molecule) => Molecule3dSession | null;
  cagePlaneScaleRef: RefObject<number>;
  cacheCagePlaneScaleFromCurrentMolfile: () => void;
  history: CageOrbitDragHistory;
  setPolymerError: (message: string | null) => void;
}

/** Cage-orbit drag API returned to the draw-state hook and canvas. */
export interface CageOrbitDragController {
  cageOrbitDragging: boolean;
  cageOrbitDragTick: number;
  cageOrbitFastFrame: CageOrbitWireframeFrame | null;
  orbitCageDuringDrag: (dYaw: number, dPitch: number) => void;
  beginCageOrbitDrag: () => void;
  endCageOrbitDrag: () => void;
  commitCageOrbitDrag: (snapshotBeforeDrag: string) => void;
  resetOrbitDragTransientState: () => void;
}

/**
 * Manages cage-orbit drag lifecycle: session cache, rAF scheduling, drag-molecule
 * clone, fast wireframe frames during drag, and molfile commit on pointerup.
 *
 * @param context - Cage marks, view, session resolver, and history wiring.
 * @returns Orbit drag controller consumed by draw state and canvas.
 */
export function useCageOrbitDrag(context: CageOrbitDragContext): CageOrbitDragController {
  const {
    cageDepictionMode,
    hasCageDepiction,
    cageBondDepthTierByMark,
    setCageBondDepthTierByMark,
    setCageView3d,
    resolveCageSession,
    cagePlaneScaleRef,
    cacheCagePlaneScaleFromCurrentMolfile,
    history,
    setPolymerError,
  } = context;

  const cageView3dRef = useRef(context.cageView3d);
  cageView3dRef.current = context.cageView3d;

  const cageOrbitDragMolRef = useRef<Molecule | null>(null);
  const cageOrbitFastFrameRef = useRef<CageOrbitWireframeFrame | null>(null);
  const cageOrbitSchedulerRef = useRef(new CageOrbitRafScheduler());

  const [cageOrbitDragging, setCageOrbitDragging] = useState(false);
  const [cageOrbitDragTick, setCageOrbitDragTick] = useState(0);
  const [cageOrbitFastFrame, setCageOrbitFastFrame] = useState<CageOrbitWireframeFrame | null>(
    null,
  );

  const applyCageOrbitDragFrame = useCallback(
    (view: View3d) => {
      if (!hasCageDepiction || cageDepictionMode !== "3d") {
        return;
      }
      const dragMol = cageOrbitDragMolRef.current;
      if (dragMol === null) {
        return;
      }
      const session = resolveCageSession(dragMol);
      if (session === null) {
        return;
      }
      const frame = projectCageOrbitFastFrame({
        mol: dragMol,
        session,
        view,
        depthMarks: cageBondDepthTierByMark,
        planeScale: cagePlaneScaleRef.current,
      });
      cageOrbitFastFrameRef.current = frame;
      setCageOrbitFastFrame(frame);
      setCageOrbitDragTick((tick) => tick + 1);
    },
    [
      cageBondDepthTierByMark,
      cageDepictionMode,
      cagePlaneScaleRef,
      hasCageDepiction,
      resolveCageSession,
    ],
  );

  const resetOrbitDragTransientState = useCallback(() => {
    cageOrbitDragMolRef.current = null;
    cageOrbitFastFrameRef.current = null;
    setCageOrbitFastFrame(null);
    setCageOrbitDragging(false);
    cageOrbitSchedulerRef.current.cancel();
  }, []);

  const beginCageOrbitDrag = useCallback(() => {
    const dragMol = cloneDrawCanvasMolecule(parseDrawMolfile(history.molfileRef.current));
    cageOrbitDragMolRef.current = dragMol;
    const session = resolveCageSession(dragMol);
    if (cagePlaneScaleRef.current <= 1) {
      cacheCagePlaneScaleFromCurrentMolfile();
    }
    if (session !== null) {
      cagePlaneScaleRef.current = calibrateCageOrbitPlaneScaleForMol(
        dragMol,
        session,
        cageView3dRef.current,
        cageBondDepthTierByMark,
        cagePlaneScaleRef.current,
      );
    }
    setCageOrbitDragging(true);
    applyCageOrbitDragFrame(cageView3dRef.current);
  }, [
    applyCageOrbitDragFrame,
    cacheCagePlaneScaleFromCurrentMolfile,
    cageBondDepthTierByMark,
    cagePlaneScaleRef,
    history.molfileRef,
    resolveCageSession,
  ]);

  const endCageOrbitDrag = useCallback(() => {
    setCageOrbitDragging(false);
    cageOrbitDragMolRef.current = null;
    cageOrbitFastFrameRef.current = null;
    setCageOrbitFastFrame(null);
    cageOrbitSchedulerRef.current.cancel();
  }, []);

  const orbitCageDuringDrag = useCallback(
    (dYaw: number, dPitch: number) => {
      if (cageDepictionMode !== "3d") {
        return;
      }
      const nextView = advanceCageOrbitView(cageView3dRef.current, dYaw, dPitch);
      cageView3dRef.current = nextView;
      setCageView3d(nextView);
      if (!hasCageDepiction) {
        return;
      }
      cageOrbitSchedulerRef.current.schedule(nextView, applyCageOrbitDragFrame);
    },
    [applyCageOrbitDragFrame, cageDepictionMode, hasCageDepiction, setCageView3d],
  );

  const commitCageOrbitDrag = useCallback(
    (snapshotBeforeDrag: string) => {
      const dragMol = cageOrbitDragMolRef.current;
      const lastFrame = cageOrbitFastFrameRef.current;
      if (hasCageDepiction && cageDepictionMode === "3d" && dragMol !== null) {
        try {
          let nextDepthMarks = cageBondDepthTierByMark;
          if (lastFrame !== null) {
            nextDepthMarks = applyCageOrbitWireframeFrameToMolecule(
              dragMol,
              lastFrame,
              cageBondDepthTierByMark,
            );
          } else {
            const session = resolveCageSession(dragMol);
            if (session !== null) {
              nextDepthMarks = commitCageOrbitProjectionToMolecule(
                dragMol,
                session,
                cageView3dRef.current,
                cageBondDepthTierByMark,
                cagePlaneScaleRef.current,
              );
            }
          }
          setCageBondDepthTierByMark(nextDepthMarks);
          const next = serializeDrawMolfile(dragMol);
          if (next !== history.molfileRef.current) {
            history.molfileRef.current = next;
            history.displayedMolRef.current = next;
            history.setMolfile(next);
          }
        } catch {
          setPolymerError("Cage orbit commit failed; structure unchanged.");
        }
      }
      endCageOrbitDrag();
      if (history.molfileRef.current !== snapshotBeforeDrag) {
        history.commitHistoryPoint(snapshotBeforeDrag);
      }
    },
    [
      cageBondDepthTierByMark,
      cageDepictionMode,
      cagePlaneScaleRef,
      endCageOrbitDrag,
      hasCageDepiction,
      history,
      resolveCageSession,
      setCageBondDepthTierByMark,
      setPolymerError,
    ],
  );

  return {
    cageOrbitDragging,
    cageOrbitDragTick,
    cageOrbitFastFrame,
    orbitCageDuringDrag,
    beginCageOrbitDrag,
    endCageOrbitDrag,
    commitCageOrbitDrag,
    resetOrbitDragTransientState,
  };
}
