"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTheme } from "next-themes";
import { Button, ErrorMessage, Input, Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

import { bondStrokeHexForMoleculeSvgTheme } from "~/lib/molecule-svg-cpk-theme";
import type { MoleculeDrawState } from "../hooks/use-molecule-draw-state";
import { CageOrbitFastLayer } from "./cage-orbit-fast-layer";
import { ALKYL_TAIL_PRESETS } from "../molecule-draw-types";
import {
  alkylCarbonCountFromUserInput,
  parseAbbreviatedAlkylFormula,
} from "../utils/alkyl-label-expand";
import {
  atomicNoForSymbol,
  COMMON_HETEROATOM_SYMBOLS,
  drawBondKindOf,
} from "../utils/molecule-graph-editing";
import {
  MOLECULE_2D_ATOM_HIT_RADIUS_PX,
  MOLECULE_2D_ATOM_HOVER_RADIUS_PX,
  MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT,
  MOLECULE_2D_BOND_HIT_TOLERANCE_PX,
  MOLECULE_2D_BOND_HOVER_STROKE_WIDTH,
  MOLECULE_2D_BOND_STROKE_WIDTH,
  MOLECULE_2D_BOOKEND_STROKE_WIDTH,
  MOLECULE_2D_FIT_PADDING_PX,
  MOLECULE_2D_MAX_SCALE_PX_PER_UNIT,
  MOLECULE_2D_BOOKEND_SUBSCRIPT_FONT_SIZE,
  MOLECULE_2D_NOTATION_FONT_SIZE,
} from "../utils/molecule-2d-depiction-style";
import {
  snapshotCageOrbitDragAnchor,
  type CageOrbitDragAnchor,
} from "../utils/cage-orbit-drag";
import {
  buildDrawCanvasOclDepiction,
  type DrawCanvasOclDepiction,
  oclDepictionOrbitCompensationTransform,
} from "../utils/molecule-2d-ocl-depiction";
import { MOLECULE_DRAW_CANVAS_GRID_BG_CLASS } from "../utils/molecule-draw-canvas-grid";
import {
  atomCenterInBaseView,
  atomsInDepictionScreenRect,
  bookendBracketGeometry,
  bookendBracketPath,
  composeDrawViewTransform,
  DRAW_STANDARD_BOND_LENGTH,
  DRAW_VIEW_ZOOM_MAX,
  DRAW_VIEW_ZOOM_MIN,
  fitViewTransform,
  hitTestDepictionView,
  moleculeToScreen,
  panZoomSvgGroupTransform,
  pointerToSvgPoint,
  screenToMolecule,
  snapSproutPosition,
  zoomDrawViewAtScreenPoint,
  type DrawHit,
  type DrawPoint,
  type DrawViewPanZoom,
  type DrawViewTransform,
} from "../utils/molecule-draw-geometry";
import { resolveBondMark } from "../utils/polymer-bookends";
import { collectAtomsOnSideOfBond } from "../utils/bond-fragment-transforms";
import type { DrawBondMark } from "../molecule-draw-types";
import { ColoredElementSymbol } from "./colored-element-symbol";

const CLICK_DRAG_THRESHOLD_PX = 6;

const WHEEL_ZOOM_IN_FACTOR = 1.12;

const WHEEL_ZOOM_OUT_FACTOR = 1 / WHEEL_ZOOM_IN_FACTOR;

const SELECTION_ROTATE_STEP_DEG = 15;

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

/** Props for {@link MoleculeDrawCanvas}. */
export interface MoleculeDrawCanvasProps {
  /** Draw state from `useMoleculeDrawState`; the canvas dispatches into it. */
  state: MoleculeDrawState;
  /** Canvas height in CSS pixels. */
  heightPx: number;
}

interface ElementPopoverState {
  atom: number;
  x: number;
  y: number;
}

interface AlkylTailPopoverState {
  atom: number;
  x: number;
  y: number;
  toward: DrawPoint;
}

interface AtomRenderInfo {
  index: number;
  screen: DrawPoint;
  hoverRadius: number;
}

function fragmentAtomCountExcludingBond(
  mol: MoleculeDrawState["molecule"],
  startAtom: number,
  excludedBond: number,
): number {
  const atom0 = mol.getBondAtom(0, excludedBond);
  const atom1 = mol.getBondAtom(1, excludedBond);
  return collectAtomsOnSideOfBond(mol, atom0, atom1, startAtom).size;
}

function canReachAtomsWithoutBond(
  mol: MoleculeDrawState["molecule"],
  startAtom: number,
  excludedBond: number,
  targets: number[],
): boolean {
  const atom0 = mol.getBondAtom(0, excludedBond);
  const atom1 = mol.getBondAtom(1, excludedBond);
  const reached = collectAtomsOnSideOfBond(mol, atom0, atom1, startAtom);
  return targets.some((target) => reached.has(target));
}

function bookendOpeningTowardAtom(
  mol: MoleculeDrawState["molecule"],
  bond: number,
  isOpen: boolean,
  openMark: DrawBondMark | null,
  closeMark: DrawBondMark | null,
): number {
  const atom0 = mol.getBondAtom(0, bond);
  const atom1 = mol.getBondAtom(1, bond);
  const otherMark = isOpen ? closeMark : openMark;
  if (otherMark !== null) {
    const otherBond = resolveBondMark(mol, otherMark);
    if (otherBond >= 0) {
      const targets = [mol.getBondAtom(0, otherBond), mol.getBondAtom(1, otherBond)];
      const toward0 = canReachAtomsWithoutBond(mol, atom0, bond, targets);
      const toward1 = canReachAtomsWithoutBond(mol, atom1, bond, targets);
      if (toward0 && !toward1) {
        return atom0;
      }
      if (toward1 && !toward0) {
        return atom1;
      }
    }
  }
  const count0 = fragmentAtomCountExcludingBond(mol, atom0, bond);
  const count1 = fragmentAtomCountExcludingBond(mol, atom1, bond);
  if (isOpen) {
    return count0 <= count1 ? atom1 : atom0;
  }
  return count0 <= count1 ? atom0 : atom1;
}

/**
 * Interactive SVG drawing surface for the molecule draw lab.
 *
 * Renders the current molecule from `state.molecule` with CPK theming and
 * dispatches tool interactions (draw, bond order, dative, element, erase,
 * bookend, chunk) into the draw state. The canvas owns only transient view
 * concerns: pointer hover, drag previews, viewport fitting, and the inline
 * heteroatom palette; all molecule state lives in the hook.
 */
export function MoleculeDrawCanvas({ state, heightPx }: MoleculeDrawCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => {
    setThemeMounted(true);
  }, []);
  const isDark = themeMounted && resolvedTheme === "dark";
  const drawCanvasDepictionDark = true;
  const markerId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const elementSymbolInputRef = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(640);
  const [viewPan, setViewPan] = useState<DrawPoint>({ x: 0, y: 0 });
  const [viewZoom, setViewZoom] = useState(1);
  const [viewZoomOrigin, setViewZoomOrigin] = useState<DrawPoint>({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [hover, setHover] = useState<DrawHit>({ kind: "empty" });
  const [dragPreview, setDragPreview] = useState<DrawPoint | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const [elementPopover, setElementPopover] = useState<ElementPopoverState | null>(
    null,
  );
  const [alkylPopover, setAlkylPopover] = useState<AlkylTailPopoverState | null>(
    null,
  );
  const [customAlkylCount, setCustomAlkylCount] = useState("8");
  const [customSymbol, setCustomSymbol] = useState("");
  const [elementInputError, setElementInputError] = useState<string | null>(null);
  const dragRef = useRef<{ fromAtom: number; startScreen: DrawPoint } | null>(null);
  const emptyDragRef = useRef<{ startScreen: DrawPoint; startMol: DrawPoint } | null>(
    null,
  );
  const panDragRef = useRef<{ startPan: DrawPoint; startScreen: DrawPoint } | null>(
    null,
  );
  const marqueeRef = useRef<{ startScreen: DrawPoint; pointerId: number } | null>(
    null,
  );
  const selectionDragRef = useRef<{
    pointerId: number;
    snapshot: string;
    lastScreen: DrawPoint;
  } | null>(null);
  const layoutDragRef = useRef<{ lastAngle: number; pointerId: number } | null>(null);
  const cageOrbitDragRef = useRef<{ lastX: number; lastY: number; pointerId: number } | null>(
    null,
  );
  const cageOrbitAnchorRef = useRef<CageOrbitDragAnchor | null>(null);
  const [cageModeToggleAnchor, setCageModeToggleAnchor] =
    useState<CageOrbitDragAnchor | null>(null);
  const prevCageDepictionModeRef = useRef(state.cageDepictionMode);
  const prevOclDepictionRef = useRef<DrawCanvasOclDepiction | null>(null);
  const layoutDragSnapshotRef = useRef<string | null>(null);
  const canvasFocusedRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const viewStateRef = useRef({
    pan: { x: 0, y: 0 },
    zoom: 1,
    zoomOrigin: { x: 0, y: 0 },
  });

  const {
    molecule,
    tool,
    layoutTool,
    alignAtoms,
    pivotAtoms,
    selectedRingTemplate,
    selectedAtoms,
    templateFuseAtoms,
  } = state;
  const selectedAtomSet = useMemo(() => new Set(selectedAtoms), [selectedAtoms]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(Math.max(entry.contentRect.width, 160));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setElementPopover(null);
    setAlkylPopover(null);
    setCustomSymbol("");
    setElementInputError(null);
  }, [tool]);

  const clearSelection = state.clearSelection;
  const eraseSelectedAtoms = state.eraseSelectedAtoms;
  const setTool = state.setTool;
  const currentTool = state.tool;

  const oclDepictionSvgId = `${markerId}-ocl`;

  const oclDepictionComputed = useMemo(() => {
    if (state.cageOrbitDragging) {
      return null;
    }
    return buildDrawCanvasOclDepiction(
      molecule,
      width,
      heightPx,
      oclDepictionSvgId,
      drawCanvasDepictionDark,
      state.cageDepictionMode,
      state.cageBondDepthTierByMark,
    );
  }, [
    molecule,
    width,
    heightPx,
    oclDepictionSvgId,
    drawCanvasDepictionDark,
    state.cageDepictionMode,
    state.cageBondDepthTierByMark,
    state.cageOrbitDragging,
  ]);
  const oclDepiction = oclDepictionComputed;

  useLayoutEffect(() => {
    if (prevCageDepictionModeRef.current !== state.cageDepictionMode) {
      if (prevOclDepictionRef.current !== null && state.hasCageDepiction) {
        setCageModeToggleAnchor(
          snapshotCageOrbitDragAnchor(prevOclDepictionRef.current),
        );
        const frameId = requestAnimationFrame(() => {
          setCageModeToggleAnchor(null);
        });
        prevCageDepictionModeRef.current = state.cageDepictionMode;
        return () => {
          cancelAnimationFrame(frameId);
        };
      }
      prevCageDepictionModeRef.current = state.cageDepictionMode;
    }
    if (oclDepictionComputed !== null && !state.cageOrbitDragging) {
      prevOclDepictionRef.current = oclDepictionComputed;
    }
    return undefined;
  }, [
    oclDepictionComputed,
    state.cageDepictionMode,
    state.cageOrbitDragging,
    state.hasCageDepiction,
  ]);

  const cageViewportAnchor =
    state.cageOrbitDragging && cageOrbitAnchorRef.current !== null
      ? cageOrbitAnchorRef.current
      : cageModeToggleAnchor;

  const oclDepictionCompensation = useMemo(() => {
    if (cageModeToggleAnchor === null || oclDepiction === null) {
      return null;
    }
    return oclDepictionOrbitCompensationTransform(
      cageModeToggleAnchor.transform,
      oclDepiction.transform,
    );
  }, [cageModeToggleAnchor, oclDepiction]);

  const baseTransform = useMemo((): DrawViewTransform => {
    if (cageViewportAnchor !== null) {
      return cageViewportAnchor.transform;
    }
    if (oclDepiction !== null) {
      return oclDepiction.transform;
    }
    return fitViewTransform(
      molecule,
      width,
      heightPx,
      MOLECULE_2D_FIT_PADDING_PX,
      MOLECULE_2D_MAX_SCALE_PX_PER_UNIT,
    );
  }, [cageViewportAnchor, oclDepiction, molecule, width, heightPx]);

  const svgViewBox = useMemo(() => {
    if (cageViewportAnchor !== null) {
      const { x, y, width: vbWidth, height: vbHeight } = cageViewportAnchor.viewBox;
      return `${x} ${y} ${vbWidth} ${vbHeight}`;
    }
    if (oclDepiction !== null) {
      const { x, y, width: vbWidth, height: vbHeight } = oclDepiction.viewBox;
      return `${x} ${y} ${vbWidth} ${vbHeight}`;
    }
    return `0 0 ${width} ${heightPx}`;
  }, [cageViewportAnchor, oclDepiction, width, heightPx]);

  useEffect(() => {
    if (state.cageOrbitDragging || cageModeToggleAnchor !== null) {
      return;
    }
    if (oclDepiction !== null) {
      const { x, y, width: vbWidth, height: vbHeight } = oclDepiction.viewBox;
      setViewZoomOrigin({ x: x + vbWidth / 2, y: y + vbHeight / 2 });
      return;
    }
    setViewZoomOrigin({ x: width / 2, y: heightPx / 2 });
  }, [cageModeToggleAnchor, oclDepiction, width, heightPx, state.cageOrbitDragging]);

  viewStateRef.current = {
    pan: viewPan,
    zoom: viewZoom,
    zoomOrigin: viewZoomOrigin,
  };

  const viewTransform = useMemo(
    () =>
      composeDrawViewTransform(baseTransform, {
        pan: viewPan,
        zoom: viewZoom,
        zoomOrigin: viewZoomOrigin,
      }),
    [baseTransform, viewPan, viewZoom, viewZoomOrigin],
  );

  const panZoomGroupTransform = useMemo(
    () => panZoomSvgGroupTransform(viewPan, viewZoom, viewZoomOrigin),
    [viewPan, viewZoom, viewZoomOrigin],
  );

  const viewPanZoom = useMemo(
    (): DrawViewPanZoom => ({
      pan: viewPan,
      zoom: viewZoom,
      zoomOrigin: viewZoomOrigin,
    }),
    [viewPan, viewZoom, viewZoomOrigin],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " && !event.repeat) {
        event.preventDefault();
        spaceHeldRef.current = true;
        setSpaceHeld(true);
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        currentTool === "select" &&
        selectedAtoms.length > 0
      ) {
        if (isEditableKeyboardTarget(event.target)) {
          return;
        }
        event.preventDefault();
        eraseSelectedAtoms();
        setMarqueeRect(null);
        marqueeRef.current = null;
        return;
      }
      if (event.key === "Escape") {
        if (elementPopover !== null) {
          event.preventDefault();
          setElementPopover(null);
          setCustomSymbol("");
          setElementInputError(null);
          return;
        }
        if (alkylPopover !== null) {
          event.preventDefault();
          setAlkylPopover(null);
          return;
        }
        if (state.pendingSmilesFragment !== null) {
          state.cancelPendingSmilesFragment();
          return;
        }
        clearSelection();
        setMarqueeRect(null);
        marqueeRef.current = null;
        if (currentTool === "template") {
          state.clearTemplateFusePick();
          setTool("draw");
        }
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "v" &&
        !isEditableKeyboardTarget(event.target) &&
        canvasFocusedRef.current
      ) {
        event.preventDefault();
        void navigator.clipboard.readText().then((text) => {
          const trimmed = text.trim();
          if (trimmed.length === 0) {
            return;
          }
          const center = screenToMolecule(viewTransform, {
            x: width / 2,
            y: heightPx / 2,
          });
          if (molecule.getAllAtoms() === 0) {
            state.loadSmiles(trimmed);
          } else {
            state.addSmilesFragmentAt(trimmed, center);
          }
        });
        return;
      }
      if (
        event.key === "r" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.repeat &&
        selectedAtoms.length > 0 &&
        !isEditableKeyboardTarget(event.target) &&
        canvasFocusedRef.current
      ) {
        event.preventDefault();
        state.rotateSelectedByDegrees(
          event.shiftKey ? -SELECTION_ROTATE_STEP_DEG : SELECTION_ROTATE_STEP_DEG,
        );
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    clearSelection,
    eraseSelectedAtoms,
    selectedAtoms.length,
    setTool,
    currentTool,
    state,
    viewTransform,
    width,
    heightPx,
    molecule,
    elementPopover,
    alkylPopover,
  ]);

  const oclAtomCenters = useMemo(
    () =>
      oclDepiction === null
        ? null
        : new Map(
            [...oclDepiction.atomCircles.entries()].map(([atom, circle]) => [
              atom,
              circle.center,
            ]),
          ),
    [oclDepiction],
  );

  const bondStroke = bondStrokeHexForMoleculeSvgTheme(drawCanvasDepictionDark);

  const atomInfos = useMemo<AtomRenderInfo[]>(() => {
    const infos: AtomRenderInfo[] = [];
    for (let a = 0; a < molecule.getAllAtoms(); a += 1) {
      const oclCircle = oclDepiction?.atomCircles.get(a);
      infos.push({
        index: a,
        screen: atomCenterInBaseView(molecule, a, baseTransform, oclAtomCenters),
        hoverRadius: oclCircle?.radius ?? MOLECULE_2D_ATOM_HOVER_RADIUS_PX,
      });
    }
    return infos;
  }, [molecule, baseTransform, oclAtomCenters, oclDepiction]);

  const localPoint = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const mapped = pointerToSvgPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (mapped !== null) {
      return mapped;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, []);

  const containerPointFromSvg = useCallback((svgPoint: DrawPoint): DrawPoint => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (svg === null || container === null) {
      return svgPoint;
    }
    const ctm = svg.getScreenCTM();
    if (ctm === null) {
      return svgPoint;
    }
    const point = svg.createSVGPoint();
    point.x = svgPoint.x;
    point.y = svgPoint.y;
    const client = point.matrixTransform(ctm);
    const rect = container.getBoundingClientRect();
    return { x: client.x - rect.left, y: client.y - rect.top };
  }, []);

  const resetView = useCallback(() => {
    setViewPan({ x: 0, y: 0 });
    setViewZoom(1);
    if (oclDepiction !== null) {
      const { x, y, width: vbWidth, height: vbHeight } = oclDepiction.viewBox;
      setViewZoomOrigin({ x: x + vbWidth / 2, y: y + vbHeight / 2 });
      return;
    }
    setViewZoomOrigin({ x: width / 2, y: heightPx / 2 });
  }, [oclDepiction, width, heightPx]);

  const applyZoomFactor = useCallback(
    (factor: number, anchor: DrawPoint) => {
      const current = viewStateRef.current;
      const next = zoomDrawViewAtScreenPoint(
        baseTransform,
        {
          pan: current.pan,
          zoom: current.zoom,
          zoomOrigin: current.zoomOrigin,
        },
        anchor,
        factor,
      );
      setViewPan(next.pan);
      setViewZoom(next.zoom);
      setViewZoomOrigin(next.zoomOrigin);
    },
    [baseTransform],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = pointerToSvgPoint(svg, event.clientX, event.clientY);
      if (anchor === null) {
        return;
      }
      const factor = event.deltaY > 0 ? WHEEL_ZOOM_OUT_FACTOR : WHEEL_ZOOM_IN_FACTOR;
      applyZoomFactor(factor, anchor);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheel);
    };
  }, [applyZoomFactor]);

  const preferBondHits =
    tool === "draw" ||
    tool === "template" ||
    tool === "bookend" ||
    tool === "chunk";

  const hitAt = useCallback(
    (point: DrawPoint, options?: { preferBonds?: boolean }) =>
      hitTestDepictionView(
        molecule,
        point,
        baseTransform,
        viewPanZoom,
        oclAtomCenters,
        MOLECULE_2D_ATOM_HIT_RADIUS_PX,
        MOLECULE_2D_BOND_HIT_TOLERANCE_PX,
        { preferBonds: options?.preferBonds ?? preferBondHits },
      ),
    [molecule, baseTransform, viewPanZoom, oclAtomCenters, preferBondHits],
  );

  const dragBondKind = state.drawBondKind;

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (layoutTool === "align" || layoutTool === "pivot") {
        return;
      }
      if (
        layoutTool === "translate" ||
        layoutTool === "rotate" ||
        layoutTool === "cage-orbit"
      ) {
        return;
      }

      const point = localPoint(event);
      const panGesture =
        event.button === 1 ||
        event.button === 2 ||
        (event.button === 0 && spaceHeldRef.current) ||
        (event.button === 0 && tool === "pan");
      if (panGesture) {
        event.preventDefault();
        setIsPanning(true);
        panDragRef.current = { startPan: { ...viewPan }, startScreen: point };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      if (event.button !== 0) {
        return;
      }

      const hit = hitAt(point);

      if (tool === "pan") {
        return;
      }

      if (tool === "select") {
        if (hit.kind === "atom" && selectedAtomSet.has(hit.atom)) {
          selectionDragRef.current = {
            pointerId: event.pointerId,
            snapshot: state.molfile,
            lastScreen: point,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        if (hit.kind === "empty") {
          marqueeRef.current = { startScreen: point, pointerId: event.pointerId };
          setMarqueeRect({ x0: point.x, y0: point.y, x1: point.x, y1: point.y });
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
      }

      if (tool === "draw" && hit.kind === "empty") {
        emptyDragRef.current = {
          startScreen: point,
          startMol: screenToMolecule(viewTransform, point),
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      if (tool === "draw" && hit.kind === "atom") {
        dragRef.current = { fromAtom: hit.atom, startScreen: point };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [
      tool,
      layoutTool,
      localPoint,
      hitAt,
      viewTransform,
      viewPan,
      selectedAtomSet,
      state,
    ],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const point = localPoint(event);
      const panDrag = panDragRef.current;
      if (panDrag !== null) {
        setViewPan({
          x: panDrag.startPan.x + (point.x - panDrag.startScreen.x),
          y: panDrag.startPan.y + (point.y - panDrag.startScreen.y),
        });
        return;
      }

      const selectionDrag = selectionDragRef.current;
      if (selectionDrag?.pointerId === event.pointerId) {
        const molScale = baseTransform.scale * viewZoom;
        const dx = (point.x - selectionDrag.lastScreen.x) / molScale;
        const ySign = baseTransform.flipY === false ? 1 : -1;
        const dy = (ySign * (point.y - selectionDrag.lastScreen.y)) / molScale;
        selectionDrag.lastScreen = point;
        state.translateSelectedDuringDrag(dx, dy);
        return;
      }

      const marquee = marqueeRef.current;
      if (marquee?.pointerId === event.pointerId) {
        setMarqueeRect({
          x0: marquee.startScreen.x,
          y0: marquee.startScreen.y,
          x1: point.x,
          y1: point.y,
        });
        return;
      }

      setHover(hitAt(point, { preferBonds: preferBondHits }));
      const drag = dragRef.current;
      if (drag !== null) {
        const from = {
          x: molecule.getAtomX(drag.fromAtom),
          y: molecule.getAtomY(drag.fromAtom),
        };
        const snapped = snapSproutPosition(
          from,
          screenToMolecule(viewTransform, point),
          DRAW_STANDARD_BOND_LENGTH,
        );
        setDragPreview(moleculeToScreen(baseTransform, snapped));
        return;
      }

      const emptyDrag = emptyDragRef.current;
      if (emptyDrag !== null) {
        const snapped = snapSproutPosition(
          emptyDrag.startMol,
          screenToMolecule(viewTransform, point),
          DRAW_STANDARD_BOND_LENGTH,
        );
        setDragPreview(moleculeToScreen(baseTransform, snapped));
      }
    },
    [localPoint, hitAt, preferBondHits, molecule, viewTransform, baseTransform, viewZoom, state],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const point = localPoint(event);

      if (panDragRef.current !== null) {
        panDragRef.current = null;
        setIsPanning(false);
        return;
      }

      const selectionDrag = selectionDragRef.current;
      if (selectionDrag?.pointerId === event.pointerId) {
        selectionDragRef.current = null;
        state.commitSelectionDrag(selectionDrag.snapshot);
        return;
      }

      const marquee = marqueeRef.current;
      if (marquee?.pointerId === event.pointerId) {
        marqueeRef.current = null;
        const rect = {
          x0: marquee.startScreen.x,
          y0: marquee.startScreen.y,
          x1: point.x,
          y1: point.y,
        };
        setMarqueeRect(null);
        const moved =
          Math.hypot(point.x - marquee.startScreen.x, point.y - marquee.startScreen.y) >
          CLICK_DRAG_THRESHOLD_PX;
        if (moved) {
          const atoms = atomsInDepictionScreenRect(
            molecule,
            baseTransform,
            viewPanZoom,
            oclAtomCenters,
            rect,
          );
          state.setSelectedAtoms(atoms);
        } else {
          state.clearSelection();
        }
        return;
      }

      if (layoutTool === "align" || layoutTool === "pivot") {
        const hit = hitAt(point);
        if (hit.kind === "atom") {
          state.pickLayoutAtom(hit.atom);
        } else if (hit.kind === "bond" && layoutTool === "pivot") {
          state.pickLayoutBond(hit.bond);
        }
        return;
      }

      if (layoutTool === "translate" || layoutTool === "rotate") {
        return;
      }

      const emptyDrag = emptyDragRef.current;
      emptyDragRef.current = null;
      if (emptyDrag !== null) {
        setDragPreview(null);
        const moved =
          Math.hypot(point.x - emptyDrag.startScreen.x, point.y - emptyDrag.startScreen.y) >
          CLICK_DRAG_THRESHOLD_PX;
        if (moved) {
          state.addAtomSproutFromEmpty(
            emptyDrag.startMol,
            screenToMolecule(viewTransform, point),
            dragBondKind,
          );
        } else {
          state.addAtomAt(emptyDrag.startMol, 6);
        }
        return;
      }

      const drag = dragRef.current;
      dragRef.current = null;
      setDragPreview(null);

      if (drag !== null) {
        const hit = hitAt(point);
        const moved =
          Math.hypot(point.x - drag.startScreen.x, point.y - drag.startScreen.y) >
          CLICK_DRAG_THRESHOLD_PX;
        if (hit.kind === "atom" && hit.atom !== drag.fromAtom) {
          state.bondBetween(drag.fromAtom, hit.atom, dragBondKind);
        } else if (moved || hit.kind === "empty" || hit.kind === "atom") {
          state.sproutBond(
            drag.fromAtom,
            screenToMolecule(viewTransform, point),
            dragBondKind,
          );
        }
        return;
      }

      const hit = hitAt(point);

      if (state.pendingSmilesFragment !== null && hit.kind === "empty") {
        state.placePendingSmilesFragment(screenToMolecule(viewTransform, point));
        return;
      }

      switch (tool) {
        case "pan": {
          break;
        }
        case "select": {
          if (hit.kind === "atom") {
            if (event.shiftKey) {
              state.toggleAtomSelection(hit.atom);
            } else {
              state.setSelectedAtoms([hit.atom]);
            }
          } else if (hit.kind === "empty" && !event.shiftKey) {
            state.clearSelection();
          }
          break;
        }
        case "draw": {
          const drawHit = hitAt(point, { preferBonds: true });
          if (drawHit.kind === "empty") {
            state.addAtomAt(screenToMolecule(viewTransform, point), 6);
          } else if (drawHit.kind === "bond") {
            const bondKind = drawBondKindOf(molecule, drawHit.bond);
            if (bondKind === "double") {
              state.cycleDoubleBondOffset(drawHit.bond);
            } else {
              state.retypeBond(drawHit.bond, state.drawBondKind);
            }
          }
          break;
        }
        case "template": {
          const templateHit = hitAt(point, { preferBonds: true });
          if (templateHit.kind === "bond") {
            state.fuseRingTemplateOnBond(templateHit.bond);
          } else if (templateHit.kind === "atom") {
            state.pickTemplateFuseAtom(templateHit.atom);
          } else {
            state.placeRingTemplateAt(screenToMolecule(viewTransform, point));
          }
          break;
        }
        case "element":
          if (hit.kind === "atom") {
            const viewScreen = moleculeToScreen(viewTransform, {
              x: molecule.getAtomX(hit.atom),
              y: molecule.getAtomY(hit.atom),
            });
            const anchor = containerPointFromSvg(viewScreen);
            setCustomSymbol("");
            setElementInputError(null);
            setElementPopover({
              atom: hit.atom,
              x: anchor.x,
              y: anchor.y,
            });
          } else {
            setElementPopover(null);
          }
          break;
        case "erase":
          if (hit.kind === "atom") {
            state.eraseAtom(hit.atom);
          } else if (hit.kind === "bond") {
            state.eraseBond(hit.bond);
          }
          break;
        case "bookend":
          if (hit.kind === "bond") {
            state.placeBookend(hit.bond);
          }
          break;
        case "chunk":
          if (hit.kind === "bond") {
            state.toggleChunkCut(hit.bond);
          }
          break;
        case "add-alkyl":
          if (hit.kind === "atom") {
            const viewScreen = moleculeToScreen(viewTransform, {
              x: molecule.getAtomX(hit.atom),
              y: molecule.getAtomY(hit.atom),
            });
            const anchor = containerPointFromSvg(viewScreen);
            setAlkylPopover({
              atom: hit.atom,
              x: anchor.x,
              y: anchor.y,
              toward: screenToMolecule(viewTransform, point),
            });
          } else {
            setAlkylPopover(null);
          }
          break;
        default: {
          const exhaustive: never = tool;
          void exhaustive;
        }
      }
    },
    [tool, layoutTool, state, molecule, viewTransform, containerPointFromSvg, localPoint, hitAt, dragBondKind, baseTransform, viewPanZoom, oclAtomCenters],
  );

  const onLayoutOverlayPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (layoutTool === "cage-orbit") {
        event.preventDefault();
        layoutDragSnapshotRef.current = state.molfile;
        const anchorSource = oclDepictionComputed ?? prevOclDepictionRef.current;
        if (anchorSource !== null) {
          cageOrbitAnchorRef.current = snapshotCageOrbitDragAnchor(anchorSource);
        }
        state.beginCageOrbitDrag();
        event.currentTarget.setPointerCapture(event.pointerId);
        cageOrbitDragRef.current = {
          lastX: event.clientX,
          lastY: event.clientY,
          pointerId: event.pointerId,
        };
        return;
      }
      if (layoutTool !== "translate" && layoutTool !== "rotate") {
        return;
      }
      layoutDragSnapshotRef.current = state.molfile;
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      layoutDragRef.current = {
        lastAngle: Math.atan2(event.clientY - cy, event.clientX - cx),
        pointerId: event.pointerId,
      };
    },
    [layoutTool, state, oclDepictionComputed],
  );

  const onLayoutOverlayPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (layoutTool === "cage-orbit") {
        const drag = cageOrbitDragRef.current;
        if (drag?.pointerId !== event.pointerId) {
          return;
        }
        event.preventDefault();
        const dy = event.clientY - drag.lastY;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) {
          return;
        }
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const lx = drag.lastX - cx;
        const ly = drag.lastY - cy;
        const rx = event.clientX - cx;
        const ry = event.clientY - cy;
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
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        const dPitch = dy * 0.009;
        state.orbitCageDuringDrag(dYaw * 1.12, dPitch);
        return;
      }
      const drag = layoutDragRef.current;
      if (drag?.pointerId !== event.pointerId) {
        return;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      if (layoutTool === "translate") {
        const molScale = baseTransform.scale * viewZoom;
        const ySign = baseTransform.flipY === false ? 1 : -1;
        state.translateDuringDrag(
          event.movementX / molScale,
          (ySign * event.movementY) / molScale,
        );
        return;
      }
      if (layoutTool === "rotate") {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx);
        const delta = angle - drag.lastAngle;
        drag.lastAngle = angle;
        state.rotateDuringDrag(delta);
      }
    },
    [layoutTool, state, baseTransform, viewZoom],
  );

  const onLayoutOverlayPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (cageOrbitDragRef.current?.pointerId === event.pointerId) {
        const snapshot = layoutDragSnapshotRef.current;
        layoutDragSnapshotRef.current = null;
        cageOrbitDragRef.current = null;
        cageOrbitAnchorRef.current = null;
        if (snapshot !== null) {
          state.commitCageOrbitDrag(snapshot);
        }
        return;
      }
      if (layoutDragRef.current?.pointerId !== event.pointerId) {
        return;
      }
      const snapshot = layoutDragSnapshotRef.current;
      layoutDragSnapshotRef.current = null;
      layoutDragRef.current = null;
      if (
        snapshot !== null &&
        (layoutTool === "translate" || layoutTool === "rotate")
      ) {
        state.commitLayoutDrag(snapshot);
      }
    },
    [layoutTool, state],
  );

  const onPointerLeave = useCallback(() => {
    setHover({ kind: "empty" });
    if (dragRef.current === null) {
      setDragPreview(null);
    }
  }, []);

  const bondHoverElement = useMemo(() => {
    if (hover.kind !== "bond") {
      return null;
    }
    const a0 = molecule.getBondAtom(0, hover.bond);
    const a1 = molecule.getBondAtom(1, hover.bond);
    const info0 = atomInfos[a0];
    const info1 = atomInfos[a1];
    if (info0 === undefined || info1 === undefined) {
      return null;
    }
    return (
      <line
        x1={info0.screen.x}
        y1={info0.screen.y}
        x2={info1.screen.x}
        y2={info1.screen.y}
        stroke="var(--accent)"
        strokeOpacity={0.35}
        strokeWidth={MOLECULE_2D_BOND_HOVER_STROKE_WIDTH}
        strokeLinecap="round"
        pointerEvents="none"
      />
    );
  }, [hover, molecule, atomInfos]);

  const polymerOverlays = useMemo(() => {
    const overlays: React.ReactNode[] = [];
    const bothBookendsSet =
      state.bookends.open !== null && state.bookends.close !== null;

    const renderBookend = (mark: DrawBondMark | null, isOpen: boolean, key: string) => {
      if (mark === null) {
        return;
      }
      const bond = resolveBondMark(molecule, mark);
      if (bond < 0) {
        return;
      }
      const atom0 = molecule.getBondAtom(0, bond);
      const atom1 = molecule.getBondAtom(1, bond);
      const info0 = atomInfos[atom0];
      const info1 = atomInfos[atom1];
      if (info0 === undefined || info1 === undefined) {
        return;
      }
      const openingToward = bookendOpeningTowardAtom(
        molecule,
        bond,
        isOpen,
        state.bookends.open,
        state.bookends.close,
      );
      const geom = bookendBracketGeometry(
        info0.screen,
        info1.screen,
        isOpen,
        openingToward,
        atom0,
        atom1,
        mark.openingFlip === true,
      );
      overlays.push(
        <path
          key={key}
          d={bookendBracketPath(geom)}
          fill="none"
          stroke={bondStroke}
          strokeWidth={MOLECULE_2D_BOOKEND_STROKE_WIDTH}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />,
      );
      if (!isOpen && bothBookendsSet) {
        const subX =
          geom.mid.x +
          geom.tangent.x * geom.hookPx * 0.85 +
          geom.normal.x * geom.heightPx * 0.42;
        const subY =
          geom.mid.y +
          geom.tangent.y * geom.hookPx * 0.85 +
          geom.normal.y * geom.heightPx * 0.42;
        overlays.push(
          <text
            key={`${key}-n`}
            x={subX}
            y={subY}
            fontSize={MOLECULE_2D_BOOKEND_SUBSCRIPT_FONT_SIZE}
            fontWeight={MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT}
            fill={bondStroke}
          >
            n
          </text>,
        );
      }
    };

    renderBookend(state.bookends.open, true, "bookend-open");
    renderBookend(state.bookends.close, false, "bookend-close");

    state.chunkMarks.forEach((mark, index) => {
      const bond = resolveBondMark(molecule, mark);
      if (bond < 0) {
        return;
      }
      const a0 = molecule.getBondAtom(0, bond);
      const a1 = molecule.getBondAtom(1, bond);
      const i0 = atomInfos[a0];
      const i1 = atomInfos[a1];
      if (i0 === undefined || i1 === undefined) {
        return;
      }
      const midX = (i0.screen.x + i1.screen.x) / 2;
      const midY = (i0.screen.y + i1.screen.y) / 2;
      const dx = i1.screen.x - i0.screen.x;
      const dy = i1.screen.y - i0.screen.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 9;
      const ny = (dx / len) * 9;
      overlays.push(
        <g key={`chunk-${index}`}>
          <line
            x1={midX - nx}
            y1={midY - ny}
            x2={midX + nx}
            y2={midY + ny}
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <text
            x={midX + nx * 1.9}
            y={midY + ny * 1.9 + 4}
            textAnchor="middle"
            fontSize={MOLECULE_2D_NOTATION_FONT_SIZE}
            fontWeight={600}
            fill="var(--accent)"
          >
            {index + 1}
          </text>
        </g>,
      );
    });

    return overlays;
  }, [molecule, atomInfos, state.bookends, state.chunkMarks, bondStroke]);

  const layoutHighlightAtoms = useMemo(() => {
    if (layoutTool === "align") {
      return alignAtoms;
    }
    if (layoutTool === "pivot") {
      return pivotAtoms;
    }
    return [];
  }, [layoutTool, alignAtoms, pivotAtoms]);

  const highlightAtoms = useMemo(() => {
    const merged = new Set(layoutHighlightAtoms);
    for (const atom of selectedAtoms) {
      merged.add(atom);
    }
    for (const atom of templateFuseAtoms) {
      merged.add(atom);
    }
    return [...merged];
  }, [layoutHighlightAtoms, selectedAtoms, templateFuseAtoms]);

  const dragFromScreen =
    dragRef.current !== null
      ? (atomInfos[dragRef.current.fromAtom]?.screen ?? null)
      : emptyDragRef.current !== null
        ? emptyDragRef.current.startScreen
        : null;

  const popoverAtomCharge =
    elementPopover !== null && elementPopover.atom < molecule.getAllAtoms()
      ? molecule.getAtomCharge(elementPopover.atom)
      : 0;

  const applyAlkylTail = useCallback(
    (carbonCount: number) => {
      if (alkylPopover === null) {
        return;
      }
      if (!Number.isInteger(carbonCount) || carbonCount < 1) {
        return;
      }
      state.attachAlkylTail(
        alkylPopover.atom,
        { carbonCount },
        alkylPopover.toward,
      );
      setAlkylPopover(null);
    },
    [alkylPopover, state],
  );

  const applyElement = useCallback(
    (symbol: string) => {
      if (elementPopover === null) {
        return;
      }
      const alkyl = parseAbbreviatedAlkylFormula(symbol);
      if (alkyl !== null) {
        state.attachAlkylTail(elementPopover.atom, { carbonCount: alkyl.n });
        setElementPopover(null);
        setCustomSymbol("");
        setElementInputError(null);
        return;
      }
      state.assignElement(elementPopover.atom, symbol);
      setElementPopover(null);
      setCustomSymbol("");
      setElementInputError(null);
    },
    [elementPopover, state],
  );

  const applyCustomElementInput = useCallback(() => {
    const raw = customSymbol.trim();
    if (raw.length === 0 || elementPopover === null) {
      return;
    }
    if (parseAbbreviatedAlkylFormula(raw) !== null) {
      setElementInputError(null);
      applyElement(raw);
      return;
    }
    try {
      atomicNoForSymbol(raw);
    } catch (error) {
      setElementInputError(
        error instanceof Error ? error.message : "Invalid element symbol.",
      );
      return;
    }
    setElementInputError(null);
    applyElement(raw);
  }, [applyElement, customSymbol, elementPopover]);

  useEffect(() => {
    if (elementPopover === null) {
      return;
    }
    const focusFrame = requestAnimationFrame(() => {
      elementSymbolInputRef.current?.focus({ preventScroll: true });
    });
    const onPopoverKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableKeyboardTarget(event.target)
      ) {
        event.preventDefault();
        setCustomSymbol((previous) => previous + event.key);
        elementSymbolInputRef.current?.focus({ preventScroll: true });
        setElementInputError(null);
      }
    };
    window.addEventListener("keydown", onPopoverKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onPopoverKeyDown);
    };
  }, [elementPopover]);

  const applyCharge = useCallback(
    (delta: number) => {
      if (elementPopover === null) {
        return;
      }
      state.assignCharge(elementPopover.atom, popoverAtomCharge + delta);
    },
    [elementPopover, popoverAtomCharge, state],
  );

  const toolHint = useMemo(() => {
    if (state.pendingSmilesFragment !== null) {
      return "Click empty canvas to place the queued SMILES fragment. Escape cancels.";
    }
    if (layoutTool === "translate") {
      return selectedAtoms.length > 0
        ? "Drag on the canvas to move the selected atoms."
        : "Drag on the canvas to move the structure.";
    }
    if (layoutTool === "rotate") {
      return selectedAtoms.length > 0
        ? "Drag around the canvas center to rotate the selection."
        : "Drag around the canvas center to rotate the structure.";
    }
    if (layoutTool === "cage-orbit") {
      return "Drag to orbit fullerene cages in 3D. Double-click the Globe tool to reset to face-on view.";
    }
    if (layoutTool === "align") {
      return alignAtoms.length === 0
        ? "Click a first atom, then a second, then Along X or Along Y."
        : alignAtoms.length === 1
          ? "Click a second atom, then choose Along X or Along Y."
          : "Choose Along X or Along Y, or Clear picks.";
    }
    if (layoutTool === "pivot") {
      return pivotAtoms.length === 0
        ? "Click the hinge atom, then a bonded neighbor, or click a bond."
        : pivotAtoms.length === 1
          ? "Click a bonded neighbor or the pivot bond, then Flip or Rotate."
          : "Flip mirrors the smaller fragment; Rotate turns the wing by 15 degrees.";
    }
    switch (tool) {
      case "select":
        return "Drag empty canvas to marquee-select; Shift+click toggles atoms; drag selection to move; Delete or Backspace removes selected atoms. Use Pan tool, Space+drag, middle- or right-mouse, or scroll wheel to navigate.";
      case "pan":
        return "Drag anywhere to pan the view. Space+drag, middle-mouse, and right-drag also pan; scroll wheel zooms; Reset view restores pan and zoom.";
      case "draw":
        return "Drag from empty canvas or an atom to sprout a bond; click a single bond to retype it; click a double bond to cycle inner / outer / centered display; Space+drag pans; scroll wheel zooms.";
      case "bookend":
        return "Click two acyclic single bonds to place [ and ] repeat-unit bookends; click the same bond again to flip bracket opening.";
      case "template":
        return templateFuseAtoms.length === 1
          ? `${selectedRingTemplate.name}: click a bonded neighbor or a bond to fuse; empty canvas places a free ring. Escape cancels.`
          : `${selectedRingTemplate.name}: click empty canvas to place, click a bond to fuse, or pick two adjacent atoms. Escape returns to Draw.`;
      case "element":
        return "Click an atom to assign its element, alkyl tail (CnH2n+1), or charge.";
      case "erase":
        return "Click an atom or bond to delete it.";
      case "chunk":
        return "Click acyclic single bonds to place block cuts; click again to remove.";
      case "add-alkyl":
        return "Click an atom to attach an abbreviated alkyl tail (CnH2n+1).";
      default: {
        const exhaustive: never = tool;
        return exhaustive;
      }
    }
  }, [
    tool,
    layoutTool,
    alignAtoms.length,
    pivotAtoms.length,
    selectedRingTemplate.name,
    templateFuseAtoms.length,
    selectedAtoms.length,
    state.pendingSmilesFragment,
  ]);

  const showLayoutOverlay =
    layoutTool === "translate" ||
    layoutTool === "rotate" ||
    layoutTool === "cage-orbit";
  const panCursorEligible =
    tool === "pan" || spaceHeld || isPanning;
  const cursorClass =
    layoutTool === "translate" ||
    layoutTool === "rotate" ||
    layoutTool === "cage-orbit"
      ? isPanning
        ? "grabbing"
        : "grab"
      : isPanning
        ? "grabbing"
        : panCursorEligible
          ? "grab"
          : tool === "template" || tool === "draw"
            ? "crosshair"
            : tool === "select"
              ? "default"
              : "crosshair";

  const zoomIn = useCallback(() => {
    applyZoomFactor(WHEEL_ZOOM_IN_FACTOR, viewZoomOrigin);
  }, [applyZoomFactor, viewZoomOrigin]);

  const zoomOut = useCallback(() => {
    applyZoomFactor(WHEEL_ZOOM_OUT_FACTOR, viewZoomOrigin);
  }, [applyZoomFactor, viewZoomOrigin]);

  return (
    <div
      ref={containerRef}
      className="relative outline-none focus-visible:ring-accent rounded-lg focus-visible:ring-2"
      tabIndex={0}
      role="group"
      aria-label="Molecule draw canvas container"
      onFocus={() => {
        canvasFocusedRef.current = true;
      }}
      onBlur={() => {
        canvasFocusedRef.current = false;
      }}
      onPointerDown={() => {
        containerRef.current?.focus({ preventScroll: true });
      }}
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <Tooltip delay={300}>
          <Tooltip.Trigger>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isIconOnly
              aria-label="Zoom out"
              isDisabled={viewZoom <= DRAW_VIEW_ZOOM_MIN}
              onPress={zoomOut}
            >
              <ZoomOut className="h-4 w-4" aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="left">Zoom out (scroll wheel down)</Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Tooltip.Trigger>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isIconOnly
              aria-label="Zoom in"
              isDisabled={viewZoom >= DRAW_VIEW_ZOOM_MAX}
              onPress={zoomIn}
            >
              <ZoomIn className="h-4 w-4" aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="left">Zoom in (scroll wheel up)</Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Tooltip.Trigger>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isIconOnly
              aria-label="Reset pan and zoom"
              onPress={resetView}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="left">
            Reset pan and zoom to fit the structure
          </Tooltip.Content>
        </Tooltip>
      </div>
      {showLayoutOverlay ? (
        <div
          className="touch-none absolute inset-0 z-10 cursor-grab rounded-lg active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onLayoutOverlayPointerDown}
          onPointerMove={onLayoutOverlayPointerMove}
          onPointerUp={onLayoutOverlayPointerUp}
          onPointerCancel={onLayoutOverlayPointerUp}
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-lg",
          MOLECULE_DRAW_CANVAS_GRID_BG_CLASS,
        )}
      >
        <svg
          ref={svgRef}
          role="application"
          aria-label="Molecule draw canvas"
          width={width}
          height={heightPx}
          viewBox={svgViewBox}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full touch-none bg-transparent"
          style={{ cursor: cursorClass }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerLeave}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
        >
        {marqueeRect !== null ? (
          <rect
            x={Math.min(marqueeRect.x0, marqueeRect.x1)}
            y={Math.min(marqueeRect.y0, marqueeRect.y1)}
            width={Math.abs(marqueeRect.x1 - marqueeRect.x0)}
            height={Math.abs(marqueeRect.y1 - marqueeRect.y0)}
            fill="var(--accent)"
            fillOpacity={0.12}
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            pointerEvents="none"
          />
        ) : null}
        <g transform={panZoomGroupTransform || undefined}>
          {state.cageOrbitDragging && state.cageOrbitFastFrame !== null ? (
            <CageOrbitFastLayer
              frame={state.cageOrbitFastFrame}
              baseTransform={baseTransform}
              isDark={drawCanvasDepictionDark}
            />
          ) : oclDepiction !== null ? (
            <g
              pointerEvents="none"
              transform={oclDepictionCompensation ?? undefined}
              dangerouslySetInnerHTML={{ __html: oclDepiction.innerMarkup }}
            />
          ) : null}
          {bondHoverElement}
          {dragFromScreen !== null && dragPreview !== null ? (
            <line
              x1={dragFromScreen.x}
              y1={dragFromScreen.y}
              x2={dragPreview.x}
              y2={dragPreview.y}
              stroke="var(--accent)"
              strokeWidth={MOLECULE_2D_BOND_STROKE_WIDTH}
              strokeDasharray={dragBondKind === "dative" ? "5 4" : undefined}
              strokeOpacity={0.8}
            />
          ) : null}
          {atomInfos.map((info) => {
            const isHovered = hover.kind === "atom" && hover.atom === info.index;
            const isHighlighted = highlightAtoms.includes(info.index);
            const isSelected = selectedAtomSet.has(info.index);
            if (!isHovered && !isHighlighted) {
              return null;
            }
            return (
              <circle
                key={info.index}
                cx={info.screen.x}
                cy={info.screen.y}
                r={info.hoverRadius}
                fill="var(--accent)"
                fillOpacity={isSelected ? 0.32 : isHighlighted ? 0.28 : 0.18}
                stroke="var(--accent)"
                strokeWidth={isSelected ? 2.5 : isHighlighted ? 2 : 1.5}
                pointerEvents="none"
              />
            );
          })}
          {polymerOverlays}
        </g>
        </svg>
      </div>
      <p className="text-muted mt-1 text-xs">{toolHint}</p>
      {alkylPopover !== null ? (
        <div
          className="border-border bg-surface absolute z-10 w-60 space-y-2 rounded-md border p-2 shadow-lg"
          style={{
            left: Math.min(Math.max(alkylPopover.x - 120, 4), width - 244),
            top: Math.min(alkylPopover.y + 14, heightPx - 180),
          }}
        >
          <p className="text-muted text-xs">Alkyl tail (CnH2n+1)</p>
          <div className="flex flex-wrap gap-1">
            {ALKYL_TAIL_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                type="button"
                size="sm"
                variant="secondary"
                className="font-mono text-xs"
                onPress={() => applyAlkylTail(preset.carbonCount)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Input
              value={customAlkylCount}
              onChange={(e) => setCustomAlkylCount(e.target.value)}
              placeholder="n or CnH2n+1"
              variant="secondary"
              className="h-8 flex-1 font-mono text-xs"
              aria-label="Custom alkyl carbon count or formula"
            />
            <Button
              type="button"
              size="sm"
              variant="primary"
              onPress={() => {
                const n = alkylCarbonCountFromUserInput(customAlkylCount);
                if (n !== null) {
                  applyAlkylTail(n);
                }
              }}
            >
              CnH2n+1
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onPress={() => setAlkylPopover(null)}
          >
            Close
          </Button>
        </div>
      ) : null}
      {elementPopover !== null ? (
        <div
          className="border-border bg-surface absolute z-10 w-56 space-y-2 rounded-md border p-2 shadow-lg"
          style={{
            left: Math.min(Math.max(elementPopover.x - 112, 4), width - 228),
            top: Math.min(elementPopover.y + 14, heightPx - 150),
          }}
        >
          <div className="flex flex-wrap gap-1">
            {COMMON_HETEROATOM_SYMBOLS.map((symbol) => (
              <Button
                key={symbol}
                type="button"
                size="sm"
                variant="secondary"
                className="min-w-9 font-mono text-sm font-semibold"
                onPress={() => applyElement(symbol)}
                aria-label={`Set element ${symbol}`}
              >
                <ColoredElementSymbol symbol={symbol} isDark={isDark} />
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Input
              ref={elementSymbolInputRef}
              value={customSymbol}
              onChange={(e) => {
                const next = e.target.value;
                setCustomSymbol(next);
                if (parseAbbreviatedAlkylFormula(next.trim()) !== null) {
                  setElementInputError(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustomElementInput();
                }
              }}
              placeholder="Element or CnH2n+1"
              variant="secondary"
              className="h-8 flex-1 font-mono text-xs"
              aria-label="Custom element symbol or alkyl formula"
            />
            <Button
              type="button"
              size="sm"
              variant="primary"
              isDisabled={customSymbol.trim().length === 0}
              onPress={applyCustomElementInput}
            >
              Set
            </Button>
          </div>
          {elementInputError !== null ? (
            <ErrorMessage>{elementInputError}</ErrorMessage>
          ) : null}
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted text-xs">
              Charge {popoverAtomCharge > 0 ? `+${popoverAtomCharge}` : popoverAtomCharge}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                aria-label="Decrease charge"
                onPress={() => applyCharge(-1)}
              >
                -
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                aria-label="Increase charge"
                onPress={() => applyCharge(1)}
              >
                +
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={() => setElementPopover(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
