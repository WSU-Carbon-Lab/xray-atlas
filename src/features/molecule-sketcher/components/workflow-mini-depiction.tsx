"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { cn } from "@heroui/styles";
import { Molecule } from "openchemlib";

import { bondStrokeHexForMoleculeSvgTheme } from "~/lib/molecule-svg-cpk-theme";
import { MOLECULE_SVG_FONT_FAMILY_INLINE } from "~/lib/molecule-svg-typography";
import { buildDatabaseDepictionSvg, buildDrawCanvasOclDepiction } from "../utils/molecule-2d-ocl-depiction";
import {
  MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT,
  MOLECULE_2D_BOOKEND_STROKE_WIDTH,
  MOLECULE_2D_BOOKEND_SUBSCRIPT_FONT_SIZE,
  MOLECULE_2D_NOTATION_FONT_SIZE,
} from "../utils/molecule-2d-depiction-style";
import type { DrawPoint } from "../utils/molecule-draw-geometry";
import {
  bookendBracketGeometry,
  bookendBracketPath,
} from "../utils/molecule-draw-geometry";
import { MOLECULE_DRAW_CANVAS_GRID_BG_CLASS } from "../utils/molecule-draw-canvas-grid";
import { stabilizeLayout } from "../utils/molecule-graph-editing";
import type { DrawBondMark } from "../molecule-draw-types";
import { resolveBondMark } from "../utils/polymer-bookends";

/**
 * OCL render width for workflow hint mini depictions (SVG user units). Display
 * size is controlled by {@link WorkflowExampleFrame} and the `fill` prop.
 */
export const WORKFLOW_MINI_DEPICTION_WIDTH = 280;

/**
 * OCL render height for workflow hint mini depictions. Paired with
 * {@link WORKFLOW_MINI_DEPICTION_WIDTH} for crisp scaling inside card frames.
 */
export const WORKFLOW_MINI_DEPICTION_HEIGHT = 200;

/** Tailwind height class for workflow step depiction frames. */
export const WORKFLOW_EXAMPLE_FRAME_HEIGHT_CLASS = "h-[11rem]";

function workflowMiniDepictionShellClassName(
  bare: boolean,
  fill: boolean,
  className?: string,
) {
  return cn(
    fill
      ? "flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
      : bare
        ? "flex items-center justify-center overflow-hidden"
        : "border-border bg-[#0a0a0a] flex items-center justify-center overflow-hidden rounded-md border",
    className,
  );
}

function workflowVectorDepictionShellClassName(
  fill: boolean,
  className?: string,
) {
  return cn(
    fill
      ? "flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
      : "flex items-center justify-center overflow-hidden",
    className,
  );
}

function useClientDepictionMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

/** Props for {@link WorkflowMiniDepiction}. */
export interface WorkflowMiniDepictionProps {
  /** SMILES string to depict; parsed with OpenChemLib on each dependency change. */
  smiles: string;
  /** When true, apply the dark CPK palette. */
  isDark: boolean;
  /** Optional SVG width; defaults to {@link WORKFLOW_MINI_DEPICTION_WIDTH}. */
  width?: number;
  /** Optional SVG height; defaults to {@link WORKFLOW_MINI_DEPICTION_HEIGHT}. */
  height?: number;
  /** Optional stable id prefix; auto-generated when omitted. */
  svgId?: string;
  /** Optional Tailwind classes on the depiction frame. */
  className?: string;
  /**
   * When true, omits the outer bordered frame so {@link WorkflowExampleFrame}
   * supplies the snapshot chrome.
   */
  bare?: boolean;
  /**
   * When true, the depiction wrapper expands to fill its parent (`w-full h-full`)
   * while `width` / `height` still set OCL render resolution.
   */
  fill?: boolean;
  /**
   * When set, mutates a cloned molecule after SMILES parse and before depiction
   * (for example abbreviate alkyl tails via {@link prepareMoleculeForDatabase}).
   */
  prepareMolecule?: (mol: Molecule) => void;
}

function fragmentAtomCountExcludingBond(
  mol: Molecule,
  startAtom: number,
  excludedBond: number,
): number {
  const atom0 = mol.getBondAtom(0, excludedBond);
  const atom1 = mol.getBondAtom(1, excludedBond);
  const other = startAtom === atom0 ? atom1 : atom0;
  const visited = new Set<number>([startAtom]);
  const queue = [startAtom];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    const conn = mol.getConnAtoms(cur);
    for (let i = 0; i < conn; i += 1) {
      const nb = mol.getConnAtom(cur, i);
      const bond = mol.getBond(cur, nb);
      if (bond === excludedBond) {
        continue;
      }
      if (visited.has(nb)) {
        continue;
      }
      visited.add(nb);
      queue.push(nb);
    }
  }
  return visited.has(other) ? visited.size - 1 : visited.size;
}

function bookendOpeningTowardAtom(
  mol: Molecule,
  bond: number,
  isOpen: boolean,
  openMark: DrawBondMark | null,
  closeMark: DrawBondMark | null,
): number {
  const atom0 = mol.getBondAtom(0, bond);
  const atom1 = mol.getBondAtom(1, bond);
  if (openMark !== null && closeMark !== null) {
    const otherMark = isOpen ? closeMark : openMark;
    const otherBond = resolveBondMark(mol, otherMark);
    if (otherBond >= 0) {
      const targets = [mol.getBondAtom(0, otherBond), mol.getBondAtom(1, otherBond)];
      const toward0 = targets.includes(atom0);
      const toward1 = targets.includes(atom1);
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
 * Rounded frame wrapping one or more mini workflow illustrations with a muted
 * surface background.
 */
export function WorkflowExampleFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/40 relative flex w-full items-center justify-center overflow-hidden rounded-lg border px-1 py-1",
        MOLECULE_DRAW_CANVAS_GRID_BG_CLASS,
        WORKFLOW_EXAMPLE_FRAME_HEIGHT_CLASS,
        "shadow-[inset_0_0_28px_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.06]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Renders a themed OpenChemLib SVG mini depiction from a SMILES string for
 * workflow hint illustrations.
 */
export function WorkflowMiniDepiction({
  smiles,
  isDark,
  width = WORKFLOW_MINI_DEPICTION_WIDTH,
  height = WORKFLOW_MINI_DEPICTION_HEIGHT,
  svgId: svgIdProp,
  className,
  bare = false,
  fill = false,
  prepareMolecule,
}: WorkflowMiniDepictionProps) {
  const depictionMounted = useClientDepictionMounted();
  const autoId = useId().replace(/:/g, "");
  const svgId = svgIdProp ?? `workflow-mini-${autoId}`;

  const svgMarkup = useMemo(() => {
    if (!depictionMounted) {
      return null;
    }
    try {
      const mol = Molecule.fromSmiles(smiles);
      stabilizeLayout(mol);
      prepareMolecule?.(mol);
      return buildDatabaseDepictionSvg(mol, width, height, svgId, isDark);
    } catch {
      return null;
    }
  }, [depictionMounted, smiles, isDark, width, height, svgId, prepareMolecule]);

  const shellClassName = workflowMiniDepictionShellClassName(bare, fill, className);
  const shellStyle = fill ? undefined : { width, height };

  if (!depictionMounted) {
    return (
      <div className={shellClassName} style={shellStyle}>
        <div
          className="h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:max-h-full [&_svg]:max-w-full"
          aria-hidden
        />
      </div>
    );
  }

  if (svgMarkup === null) {
    if (bare) {
      return (
        <div className={shellClassName} style={shellStyle}>
          <span className="text-muted text-[10px]">Depiction unavailable</span>
        </div>
      );
    }
    return (
      <WorkflowExampleFrame className={className}>
        <span className="text-muted text-[10px]">Depiction unavailable</span>
      </WorkflowExampleFrame>
    );
  }

  return (
    <div className={shellClassName} style={shellStyle}>
      <div
        className="h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:max-h-full [&_svg]:max-w-full"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );
}

/** Props for {@link WorkflowBookendDepiction}. */
export interface WorkflowBookendDepictionProps {
  /** Full molecule SMILES before bookend extraction. */
  smiles: string;
  /** Bond index for the opening `[` bookend. */
  openBond: number;
  /** Bond index for the closing `]` bookend. */
  closeBond: number;
  /** When true, apply the dark CPK palette. */
  isDark: boolean;
  /** Optional SVG width; defaults to {@link WORKFLOW_MINI_DEPICTION_WIDTH}. */
  width?: number;
  /** Optional SVG height; defaults to {@link WORKFLOW_MINI_DEPICTION_HEIGHT}. */
  height?: number;
  /** Optional stable id prefix; auto-generated when omitted. */
  svgId?: string;
  /** Optional Tailwind classes on the depiction frame. */
  className?: string;
  /**
   * When true, expands to fill the parent frame while `width` / `height` set
   * OCL render resolution.
   */
  fill?: boolean;
}

/**
 * Renders a mini OCL depiction with ChemDraw-style `[` / `]` bookend brackets
 * overlaid on the chosen bonds (for polymer repeat-unit workflow hints).
 */
export function WorkflowBookendDepiction({
  smiles,
  openBond,
  closeBond,
  isDark,
  width = WORKFLOW_MINI_DEPICTION_WIDTH,
  height = WORKFLOW_MINI_DEPICTION_HEIGHT,
  svgId: svgIdProp,
  className,
  fill = false,
}: WorkflowBookendDepictionProps) {
  const depictionMounted = useClientDepictionMounted();
  const autoId = useId().replace(/:/g, "");
  const svgId = svgIdProp ?? `workflow-bookend-${autoId}`;

  const payload = useMemo(() => {
    if (!depictionMounted) {
      return null;
    }
    try {
      const mol = Molecule.fromSmiles(smiles);
      stabilizeLayout(mol);
      const depiction = buildDrawCanvasOclDepiction(mol, width, height, svgId, isDark);
      if (depiction === null) {
        return null;
      }
      const openMark: DrawBondMark = {
        atomA: mol.getBondAtom(0, openBond),
        atomB: mol.getBondAtom(1, openBond),
      };
      const closeMark: DrawBondMark = {
        atomA: mol.getBondAtom(0, closeBond),
        atomB: mol.getBondAtom(1, closeBond),
      };
      const bondStroke = bondStrokeHexForMoleculeSvgTheme(isDark);

      const bracketPaths: Array<{ d: string; key: string; subscript?: DrawPoint }> = [];

      const addBracket = (bond: number, isOpen: boolean, key: string) => {
        const a0 = mol.getBondAtom(0, bond);
        const a1 = mol.getBondAtom(1, bond);
        const c0 = depiction.atomCircles.get(a0);
        const c1 = depiction.atomCircles.get(a1);
        if (c0 === undefined || c1 === undefined) {
          return;
        }
        const openingToward = bookendOpeningTowardAtom(
          mol,
          bond,
          isOpen,
          openMark,
          closeMark,
        );
        const geom = bookendBracketGeometry(
          c0.center,
          c1.center,
          isOpen,
          openingToward,
          a0,
          a1,
          false,
        );
        const entry: { d: string; key: string; subscript?: DrawPoint } = {
          d: bookendBracketPath(geom),
          key,
        };
        if (!isOpen) {
          entry.subscript = {
            x:
              geom.mid.x +
              geom.tangent.x * geom.hookPx * 0.85 +
              geom.normal.x * geom.heightPx * 0.42,
            y:
              geom.mid.y +
              geom.tangent.y * geom.hookPx * 0.85 +
              geom.normal.y * geom.heightPx * 0.42,
          };
        }
        bracketPaths.push(entry);
      };

      addBracket(openBond, true, "open");
      addBracket(closeBond, false, "close");

      return {
        viewBox: depiction.viewBox,
        innerMarkup: depiction.innerMarkup,
        bracketPaths,
        bondStroke,
      };
    } catch {
      return null;
    }
  }, [depictionMounted, smiles, openBond, closeBond, isDark, width, height, svgId]);

  const shellClassName = workflowVectorDepictionShellClassName(fill, className);
  const shellStyle = fill ? undefined : { width, height };

  if (!depictionMounted) {
    return (
      <div className={shellClassName} style={shellStyle}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full max-h-full max-w-full"
          aria-hidden
        />
      </div>
    );
  }

  if (payload === null) {
    return (
      <WorkflowExampleFrame className={className}>
        <span className="text-muted text-[10px]">Depiction unavailable</span>
      </WorkflowExampleFrame>
    );
  }

  const { viewBox, innerMarkup, bracketPaths, bondStroke } = payload;

  return (
    <div className={shellClassName} style={shellStyle}>
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full max-h-full max-w-full"
        style={{ fontFamily: MOLECULE_SVG_FONT_FAMILY_INLINE }}
        aria-hidden
      >
        <g dangerouslySetInnerHTML={{ __html: innerMarkup }} />
        {bracketPaths.map((item) => (
          <g key={item.key}>
            <path
              d={item.d}
              fill="none"
              stroke={bondStroke}
              strokeWidth={MOLECULE_2D_BOOKEND_STROKE_WIDTH}
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            {item.subscript !== undefined ? (
              <text
                x={item.subscript.x}
                y={item.subscript.y}
                fontSize={MOLECULE_2D_BOOKEND_SUBSCRIPT_FONT_SIZE}
                fontWeight={MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT}
                fill={bondStroke}
              >
                n
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Props for {@link WorkflowChunkSliceDepiction}. */
export interface WorkflowChunkSliceDepictionProps {
  /** Full molecule SMILES before block cuts. */
  smiles: string;
  /** Bond index where the block-boundary slice overlay is drawn. */
  sliceBond: number;
  /** Optional bond index for the opening `[` repeat-unit bookend. */
  openBond?: number;
  /** Optional bond index for the closing `]` repeat-unit bookend. */
  closeBond?: number;
  /** When true, apply the dark CPK palette. */
  isDark: boolean;
  /** Optional SVG width; defaults to {@link WORKFLOW_MINI_DEPICTION_WIDTH}. */
  width?: number;
  /** Optional SVG height; defaults to {@link WORKFLOW_MINI_DEPICTION_HEIGHT}. */
  height?: number;
  /** Optional stable id prefix; auto-generated when omitted. */
  svgId?: string;
  /** Optional Tailwind classes on the depiction frame. */
  className?: string;
  /**
   * When true, expands to fill the parent frame while `width` / `height` set
   * OCL render resolution.
   */
  fill?: boolean;
}

/**
 * Renders a mini OCL depiction with an accent slice line across the chosen
 * bond and optional `[` / `]` bookend brackets on terminal bonds (for
 * block-boundary workflow hints on polymer repeat units).
 */
export function WorkflowChunkSliceDepiction({
  smiles,
  sliceBond,
  openBond,
  closeBond,
  isDark,
  width = WORKFLOW_MINI_DEPICTION_WIDTH,
  height = WORKFLOW_MINI_DEPICTION_HEIGHT,
  svgId: svgIdProp,
  className,
  fill = false,
}: WorkflowChunkSliceDepictionProps) {
  const depictionMounted = useClientDepictionMounted();
  const autoId = useId().replace(/:/g, "");
  const svgId = svgIdProp ?? `workflow-chunk-${autoId}`;

  const payload = useMemo(() => {
    if (!depictionMounted) {
      return null;
    }
    try {
      const mol = Molecule.fromSmiles(smiles);
      stabilizeLayout(mol);
      const depiction = buildDrawCanvasOclDepiction(mol, width, height, svgId, isDark);
      if (depiction === null) {
        return null;
      }
      const a0 = mol.getBondAtom(0, sliceBond);
      const a1 = mol.getBondAtom(1, sliceBond);
      const c0 = depiction.atomCircles.get(a0);
      const c1 = depiction.atomCircles.get(a1);
      if (c0 === undefined || c1 === undefined) {
        return null;
      }
      const midX = (c0.center.x + c1.center.x) / 2;
      const midY = (c0.center.y + c1.center.y) / 2;
      const dx = c1.center.x - c0.center.x;
      const dy = c1.center.y - c0.center.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 9;
      const ny = (dx / len) * 9;

      const bracketPaths: Array<{ d: string; key: string; subscript?: DrawPoint }> = [];
      const bondStroke = bondStrokeHexForMoleculeSvgTheme(isDark);

      if (openBond !== undefined && closeBond !== undefined) {
        const openMark: DrawBondMark = {
          atomA: mol.getBondAtom(0, openBond),
          atomB: mol.getBondAtom(1, openBond),
        };
        const closeMark: DrawBondMark = {
          atomA: mol.getBondAtom(0, closeBond),
          atomB: mol.getBondAtom(1, closeBond),
        };

        const addBracket = (bond: number, isOpen: boolean, key: string) => {
          const b0 = mol.getBondAtom(0, bond);
          const b1 = mol.getBondAtom(1, bond);
          const bc0 = depiction.atomCircles.get(b0);
          const bc1 = depiction.atomCircles.get(b1);
          if (bc0 === undefined || bc1 === undefined) {
            return;
          }
          const openingToward = bookendOpeningTowardAtom(
            mol,
            bond,
            isOpen,
            openMark,
            closeMark,
          );
          const geom = bookendBracketGeometry(
            bc0.center,
            bc1.center,
            isOpen,
            openingToward,
            b0,
            b1,
            false,
          );
          const entry: { d: string; key: string; subscript?: DrawPoint } = {
            d: bookendBracketPath(geom),
            key,
          };
          if (!isOpen) {
            entry.subscript = {
              x:
                geom.mid.x +
                geom.tangent.x * geom.hookPx * 0.85 +
                geom.normal.x * geom.heightPx * 0.42,
              y:
                geom.mid.y +
                geom.tangent.y * geom.hookPx * 0.85 +
                geom.normal.y * geom.heightPx * 0.42,
            };
          }
          bracketPaths.push(entry);
        };

        addBracket(openBond, true, "open");
        addBracket(closeBond, false, "close");
      }

      return {
        viewBox: depiction.viewBox,
        innerMarkup: depiction.innerMarkup,
        bondStroke,
        bracketPaths,
        slice: {
          x1: midX - nx,
          y1: midY - ny,
          x2: midX + nx,
          y2: midY + ny,
          labelX: midX + nx * 1.6,
          labelY: midY + ny * 1.6 + 3,
        },
      };
    } catch {
      return null;
    }
  }, [
    depictionMounted,
    smiles,
    sliceBond,
    openBond,
    closeBond,
    isDark,
    width,
    height,
    svgId,
  ]);

  const shellClassName = workflowVectorDepictionShellClassName(fill, className);
  const shellStyle = fill ? undefined : { width, height };

  if (!depictionMounted) {
    return (
      <div className={shellClassName} style={shellStyle}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full max-h-full max-w-full"
          aria-hidden
        />
      </div>
    );
  }

  if (payload === null) {
    return (
      <WorkflowExampleFrame className={className}>
        <span className="text-muted text-[10px]">Depiction unavailable</span>
      </WorkflowExampleFrame>
    );
  }

  const { viewBox, innerMarkup, slice, bondStroke, bracketPaths } = payload;

  return (
    <div className={shellClassName} style={shellStyle}>
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full max-h-full max-w-full"
        style={{ fontFamily: MOLECULE_SVG_FONT_FAMILY_INLINE }}
        aria-hidden
      >
        <g dangerouslySetInnerHTML={{ __html: innerMarkup }} />
        {bracketPaths.map((item) => (
          <g key={item.key}>
            <path
              d={item.d}
              fill="none"
              stroke={bondStroke}
              strokeWidth={MOLECULE_2D_BOOKEND_STROKE_WIDTH}
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            {item.subscript !== undefined ? (
              <text
                x={item.subscript.x}
                y={item.subscript.y}
                fontSize={MOLECULE_2D_BOOKEND_SUBSCRIPT_FONT_SIZE}
                fontWeight={MOLECULE_2D_ATOM_LABEL_FONT_WEIGHT}
                fill={bondStroke}
              >
                n
              </text>
            ) : null}
          </g>
        ))}
        <g>
          <line
            x1={slice.x1}
            y1={slice.y1}
            x2={slice.x2}
            y2={slice.y2}
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <text
            x={slice.labelX}
            y={slice.labelY}
            textAnchor="middle"
            fontSize={MOLECULE_2D_NOTATION_FONT_SIZE}
            fontWeight={600}
            fill="var(--accent)"
          >
            1
          </text>
        </g>
      </svg>
    </div>
  );
}
