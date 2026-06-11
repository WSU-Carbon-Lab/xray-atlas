/**
 * Cage-orbit drag scheduling, view math, and fast-frame projection helpers.
 *
 * Owns rAF coalescing for orbit pointer moves and lightweight wireframe
 * projection during drag. Full OpenChemLib depiction and molfile commits stay
 * outside this module on pointerup.
 */

import type { Molecule } from "openchemlib";

import type { CageBondDepthTierByMark, CageOrbitWireframeFrame } from "./cage-template-placement";
import {
  buildCageOrbitWireframeFrame,
  measureCageFacePlaneScale,
} from "./cage-template-placement";
import type { DrawViewTransform } from "./molecule-draw-geometry";
import type { OclSvgViewBox } from "./molecule-2d-ocl-depiction";
import type { Molecule3dSession, View3d } from "./molecule-3d-depth-wireframe";

/** Minimum cage-orbit pitch in radians. */
export const CAGE_ORBIT_PITCH_MIN = -1.45;

/** Maximum cage-orbit pitch in radians. */
export const CAGE_ORBIT_PITCH_MAX = 1.45;

/** Multiplier applied to horizontal orbit delta from pointer arc motion. */
export const CAGE_ORBIT_YAW_POINTER_GAIN = 1.12;

/** Radians of pitch change per screen pixel of vertical drag. */
export const CAGE_ORBIT_PITCH_PER_PX = 0.009;

/**
 * Clamps cage-orbit pitch to the interactive viewer range.
 *
 * @param pitch - Proposed pitch in radians.
 * @returns Pitch limited to {@link CAGE_ORBIT_PITCH_MIN} and {@link CAGE_ORBIT_PITCH_MAX}.
 */
export function clampCageOrbitPitch(pitch: number): number {
  return Math.max(CAGE_ORBIT_PITCH_MIN, Math.min(CAGE_ORBIT_PITCH_MAX, pitch));
}

/**
 * Applies incremental yaw and pitch to a cage orbit view.
 *
 * @param view - Current orbit view.
 * @param dYaw - Yaw delta in radians.
 * @param dPitch - Pitch delta in radians.
 * @returns Updated view with clamped pitch.
 */
export function advanceCageOrbitView(view: View3d, dYaw: number, dPitch: number): View3d {
  return {
    ...view,
    yaw: view.yaw + dYaw,
    pitch: clampCageOrbitPitch(view.pitch + dPitch),
  };
}

/**
 * Coalesces cage-orbit drag updates to one callback per animation frame.
 *
 * Stores the latest pending view and invokes the frame handler once per rAF tick.
 */
export class CageOrbitRafScheduler {
  private rafId: number | null = null;
  private pendingView: View3d | null = null;

  /**
   * Queues a view for the next animation frame when no frame is already scheduled.
   *
   * @param view - Latest orbit view after pointer move.
   * @param onFrame - Handler invoked with the coalesced view once per frame.
   */
  schedule(view: View3d, onFrame: (view: View3d) => void): void {
    this.pendingView = view;
    if (this.rafId !== null) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const nextView = this.pendingView;
      if (nextView === null) {
        return;
      }
      onFrame(nextView);
    });
  }

  /** Cancels any scheduled frame and clears the pending view. */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingView = null;
  }
}

/** Frozen OCL viewport captured at cage-orbit pointerdown. */
export interface CageOrbitDragAnchor {
  transform: DrawViewTransform;
  viewBox: OclSvgViewBox;
}

/** OCL depiction fields required to freeze a cage-orbit drag anchor. */
export interface CageOrbitDragAnchorSource {
  transform: DrawViewTransform;
  viewBox: OclSvgViewBox;
}

/**
 * Clones the OCL transform and view box shown before orbit drag so the fast
 * wireframe layer keeps the same world-to-screen mapping as the live depiction.
 *
 * @param depiction - Current draw-canvas OCL depiction at pointerdown.
 * @returns Deep-copied anchor independent of later depiction rebuilds.
 */
export function snapshotCageOrbitDragAnchor(
  depiction: CageOrbitDragAnchorSource,
): CageOrbitDragAnchor {
  return {
    transform: { ...depiction.transform },
    viewBox: { ...depiction.viewBox },
  };
}

/** Inputs required to project a cage-orbit wireframe frame during drag. */
export interface CageOrbitFastFrameInput {
  mol: Molecule;
  session: Molecule3dSession;
  view: View3d;
  depthMarks: CageBondDepthTierByMark;
  planeScale: number;
}

export function projectCageOrbitFastFrame(input: CageOrbitFastFrameInput): CageOrbitWireframeFrame {
  return buildCageOrbitWireframeFrame(
    input.mol,
    input.session,
    input.view,
    input.depthMarks,
    input.planeScale,
  );
}

/**
 * Adjusts a cached face-on plane scale so the first orbit wireframe matches
 * on-molfile bond lengths at `view` after fragment centroid alignment.
 *
 * @param mol - Live editor molecule whose coordinates define the pre-drag depiction.
 * @param session - Cached MMFF cage session for `mol`.
 * @param view - Active cage orbit at pointerdown.
 * @param depthMarks - Stored 3D depth-tier marks identifying cage bonds.
 * @param omittedMarks - Stored 2D omission marks identifying cage bonds.
 * @param basePlaneScale - Cached layout scale; values `<= 1` trigger face-on remeasurement.
 * @returns Plane scale to hold fixed for the entire drag gesture.
 */
export function calibrateCageOrbitPlaneScaleForMol(
  mol: Molecule,
  session: Molecule3dSession,
  view: View3d,
  depthMarks: CageBondDepthTierByMark,
  basePlaneScale: number,
): number {
  let probeScale = basePlaneScale;
  if (!Number.isFinite(probeScale) || probeScale <= 1) {
    probeScale = measureCageFacePlaneScale(session, view);
  }
  const frame = buildCageOrbitWireframeFrame(
    mol,
    session,
    view,
    depthMarks,
    probeScale,
  );
  if (frame.bonds.length === 0) {
    return probeScale;
  }
  let molLenSum = 0;
  let projLenSum = 0;
  for (const bond of frame.bonds) {
    const molLen = Math.hypot(
      mol.getAtomX(bond.atom1) - mol.getAtomX(bond.atom0),
      mol.getAtomY(bond.atom1) - mol.getAtomY(bond.atom0),
    );
    const projLen = Math.hypot(bond.x1 - bond.x0, bond.y1 - bond.y0);
    if (molLen > 1e-9 && projLen > 1e-9) {
      molLenSum += molLen;
      projLenSum += projLen;
    }
  }
  if (projLenSum <= 1e-9 || molLenSum <= 1e-9) {
    return probeScale;
  }
  return probeScale * (molLenSum / projLenSum);
}
