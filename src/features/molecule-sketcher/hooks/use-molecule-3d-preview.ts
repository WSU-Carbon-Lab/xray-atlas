import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { Molecule } from "openchemlib";
import { applyMoleculeSvgCpkTheme } from "~/lib/molecule-svg-cpk-theme";
import {
  applyMoleculeSvg3dBondDepthTiers,
  applyMoleculeSvg3dPerspectiveDepth,
  disableMoleculeSvgPointerEvents,
} from "~/lib/molecule-svg-3d-perspective";
import {
  createMolecule3dSession,
  defaultView3d,
  sessionToOclDepictionSvg,
  type Molecule3dSession,
  type OclDepiction3dSvgPack,
  type View3d,
} from "../utils/molecule-3d-depth-wireframe";
import {
  snapshotConformerToFlatSvg,
  type ConformerSnapshotMetadata,
} from "../utils/snapshot-conformer-to-flat-svg";

export function useMolecule3dPreview(options: {
  molfile: string;
  molfileRef: RefObject<string>;
  isDark: boolean;
  wire3dSvgId: string;
  panelWidth: number;
  panelHeight: number;
}) {
  const { molfile, molfileRef, isDark, wire3dSvgId, panelWidth, panelHeight } =
    options;

  const [session3d, setSession3d] = useState<Molecule3dSession | null>(null);
  const [view3d, setView3d] = useState<View3d>(() => defaultView3d());
  const [wire3dError, setWire3dError] = useState<string | null>(null);
  const [wire3dBusy, setWire3dBusy] = useState(false);
  const [snapshotPreviewSvg, setSnapshotPreviewSvg] = useState<string | null>(
    null,
  );
  const [snapshotMetadata, setSnapshotMetadata] =
    useState<ConformerSnapshotMetadata | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const conformerMolfileKeyRef = useRef<string | null>(null);

  const threeDDragRef = useRef<{
    lastX: number;
    lastY: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    if (!session3d) {
      conformerMolfileKeyRef.current = null;
      return;
    }
    if (
      conformerMolfileKeyRef.current !== null &&
      conformerMolfileKeyRef.current !== molfile
    ) {
      setSession3d(null);
      setView3d(defaultView3d());
      setWire3dError(null);
      conformerMolfileKeyRef.current = null;
      setSnapshotPreviewSvg(null);
      setSnapshotMetadata(null);
      setSnapshotError(null);
    }
  }, [molfile, session3d]);

  const runCompute3dConformer = useCallback(() => {
    setWire3dError(null);
    setWire3dBusy(true);
    window.setTimeout(() => {
      const r = createMolecule3dSession(molfileRef.current);
      setWire3dBusy(false);
      if (r.ok) {
        conformerMolfileKeyRef.current = molfileRef.current;
        setSession3d(r.session);
        setView3d(defaultView3d());
        setWire3dError(null);
        setSnapshotPreviewSvg(null);
        setSnapshotMetadata(null);
        setSnapshotError(null);
      } else {
        setSession3d(null);
        conformerMolfileKeyRef.current = null;
        setWire3dError(r.message);
      }
    }, 0);
  }, [molfileRef]);

  const clear3dConformer = useCallback(() => {
    setSession3d(null);
    setView3d(defaultView3d());
    setWire3dError(null);
    conformerMolfileKeyRef.current = null;
    setSnapshotPreviewSvg(null);
    setSnapshotMetadata(null);
    setSnapshotError(null);
  }, []);

  const resetView3d = useCallback(() => {
    setView3d(defaultView3d());
  }, []);

  const wire3dSvgRendered = useMemo(() => {
    if (!session3d) return null;
    const pack: OclDepiction3dSvgPack = sessionToOclDepictionSvg(
      session3d,
      view3d,
      {
        width: panelWidth,
        height: panelHeight,
        svgId: `mol-3d-${wire3dSvgId}`,
        isDark,
      },
      molfile,
    );
    let themed = applyMoleculeSvgCpkTheme(pack.svg, isDark);
    try {
      const m = Molecule.fromMolfile(pack.strippedMolfileV3);
      if (m.getAtoms() === pack.atomDepth.length) {
        if (pack.bondDepthTier.size > 0) {
          themed = applyMoleculeSvg3dBondDepthTiers(
            themed,
            m,
            pack.bondDepthTier,
            isDark,
          );
        } else {
          themed = applyMoleculeSvg3dPerspectiveDepth(themed, m, pack.atomDepth);
        }
      }
    } catch {
      /* keep CPK-only */
    }
    return disableMoleculeSvgPointerEvents(themed);
  }, [session3d, view3d, isDark, wire3dSvgId, molfile, panelWidth, panelHeight]);

  const generateSnapshotPreview = useCallback(() => {
    if (!session3d) return;
    setSnapshotError(null);
    const result = snapshotConformerToFlatSvg(
      session3d,
      view3d,
      molfileRef.current,
      {
        width: panelWidth,
        height: panelHeight,
        svgId: `mol-snap-${wire3dSvgId}`,
        isDark,
      },
    );
    if (!result.ok) {
      setSnapshotError(result.message);
      setSnapshotPreviewSvg(null);
      setSnapshotMetadata(null);
      return;
    }
    setSnapshotPreviewSvg(applyMoleculeSvgCpkTheme(result.svg, isDark));
    setSnapshotMetadata(result.metadata);
  }, [
    session3d,
    view3d,
    molfileRef,
    panelWidth,
    panelHeight,
    wire3dSvgId,
    isDark,
  ]);

  const clearSnapshotPreview = useCallback(() => {
    setSnapshotPreviewSvg(null);
    setSnapshotMetadata(null);
    setSnapshotError(null);
  }, []);

  const on3dPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!session3d) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      threeDDragRef.current = {
        lastX: e.clientX,
        lastY: e.clientY,
        pointerId: e.pointerId,
      };
    },
    [session3d],
  );

  const on3dPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = threeDDragRef.current;
      if (d?.pointerId !== e.pointerId) return;
      e.preventDefault();
      const dy = e.clientY - d.lastY;
      const r = e.currentTarget.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const lx = d.lastX - cx;
      const ly = d.lastY - cy;
      const rx = e.clientX - cx;
      const ry = e.clientY - cy;
      const r0 = Math.hypot(lx, ly);
      const r1 = Math.hypot(rx, ry);
      let dYaw = 0;
      if (r0 > 4 && r1 > 4) {
        const a0 = Math.atan2(ly, lx);
        const a1 = Math.atan2(ry, rx);
        dYaw = a1 - a0;
        if (dYaw > Math.PI) dYaw -= 2 * Math.PI;
        if (dYaw < -Math.PI) dYaw += 2 * Math.PI;
      }
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      const dPitch = dy * 0.009;
      setView3d((v) => ({
        ...v,
        yaw: v.yaw + dYaw * 1.12,
        pitch: Math.max(-1.45, Math.min(1.45, v.pitch + dPitch)),
      }));
    },
    [],
  );

  const on3dPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (threeDDragRef.current?.pointerId !== e.pointerId) return;
      threeDDragRef.current = null;
    },
    [],
  );

  return {
    session3d,
    view3d,
    wire3dBusy,
    wire3dError,
    wire3dSvgRendered,
    snapshotPreviewSvg,
    snapshotMetadata,
    snapshotError,
    runCompute3dConformer,
    clear3dConformer,
    resetView3d,
    generateSnapshotPreview,
    clearSnapshotPreview,
    on3dPointerDown,
    on3dPointerMove,
    on3dPointerUp,
  };
}
