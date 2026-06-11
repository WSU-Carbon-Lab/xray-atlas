import type { Molecule } from "openchemlib";

import { bondStrokeHexForMoleculeSvgTheme } from "~/lib/molecule-svg-cpk-theme";

/** Depth styling tier for a bond segment in the interactive 3D viewer. */
export type BondDepthTier = "front" | "back";

/** Bond stroke styling for perspective depth tiers aligned with theme semantics. */
export interface BondDepthTierStyle {
  stroke: string;
  opacity: number;
  strokeWidthScale: number;
}

/**
 * Resolves SVG bond stroke styling for front and back depth tiers.
 *
 * Dark mode keeps front bonds bright (`#ffffff`) and rear bonds muted grey;
 * light mode uses full-contrast black front bonds and a softer grey rear tier.
 *
 * @param isDark - When true, use the dark UI palette.
 * @returns Style map keyed by depth tier.
 */
export function bondDepthTierStyles(isDark: boolean): Record<BondDepthTier, BondDepthTierStyle> {
  const frontStroke = bondStrokeHexForMoleculeSvgTheme(isDark);
  const backStroke = isDark ? "#8a8a8a" : "#6b7280";
  return {
    front: { stroke: frontStroke, opacity: 1, strokeWidthScale: 1 },
    back: { stroke: backStroke, opacity: isDark ? 0.42 : 0.38, strokeWidthScale: 0.92 },
  };
}

function normalizeDepths(values: number[]): { min: number; max: number } {
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const z of values) {
    zMin = Math.min(zMin, z);
    zMax = Math.max(zMax, z);
  }
  return { min: zMin, max: zMax };
}

function normT(z: number, min: number, max: number): number {
  if (max - min < 1e-12) return 1;
  return (z - min) / (max - min);
}

function appendDepthFilterStyle(el: Element, t: number): void {
  const sat = 0.46 + 0.54 * t;
  const op = 0.76 + 0.24 * t;
  const prev = el.getAttribute("style") ?? "";
  const parts = prev
    .split(";")
    .map((p) => p.trim())
    .filter(
      (p) =>
        p.length > 0 &&
        !p.toLowerCase().startsWith("filter") &&
        !p.toLowerCase().startsWith("opacity"),
    );
  const base = parts.length > 0 ? `${parts.join("; ")}; ` : "";
  el.setAttribute(
    "style",
    `${base}filter: saturate(${sat.toFixed(4)}); opacity: ${op.toFixed(4)}`,
  );
}

function applyBondTierStyle(el: Element, tier: BondDepthTier, isDark: boolean): void {
  const styles = bondDepthTierStyles(isDark)[tier];
  el.setAttribute("stroke", styles.stroke);
  if (tier === "back") {
    el.setAttribute("opacity", styles.opacity.toFixed(4));
  } else {
    el.removeAttribute("opacity");
  }
  const sw = el.getAttribute("stroke-width");
  if (sw) {
    const w = Number.parseFloat(sw);
    if (Number.isFinite(w)) {
      el.setAttribute("stroke-width", (w * styles.strokeWidthScale).toFixed(4));
    }
  }
}

function bondEndpointsMatch(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ex1: number,
  ey1: number,
  ex2: number,
  ey2: number,
  eps = 0.75,
): boolean {
  const forward =
    Math.hypot(x1 - ex1, y1 - ey1) + Math.hypot(x2 - ex2, y2 - ey2);
  const reverse =
    Math.hypot(x1 - ex2, y1 - ey2) + Math.hypot(x2 - ex1, y2 - ey1);
  return Math.min(forward, reverse) <= eps * 2;
}

/**
 * Disables OpenChemLib SVG hit-target pointer events so parent orbit handlers receive drags.
 *
 * @param svgText - Raw or themed SVG markup.
 * @returns SVG string with all elements set to ignore pointer input.
 */
export function disableMoleculeSvgPointerEvents(svgText: string): string {
  const trimmed = svgText.trim();
  if (!trimmed.startsWith("<")) return svgText;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svgText;
  const svg = doc.documentElement;
  svg.setAttribute("style", "pointer-events: none;");
  svg.querySelectorAll("style").forEach((styleEl) => {
    const raw = styleEl.textContent ?? "";
    styleEl.textContent = raw.replace(
      /pointer-events\s*:\s*all/gi,
      "pointer-events: none",
    );
  });
  svg.querySelectorAll(".event").forEach((el) => {
    el.classList.remove("event");
  });
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Applies front/back bond depth styling to OCL SVG bond primitives using theme-aligned colors.
 *
 * @param svgText - Raw SVG string from OpenChemLib.
 * @param mol - Stripped molecule used to generate the SVG (bond indices must match).
 * @param bondDepthTier - Map from bond index to `"front"` or `"back"`.
 * @param isDark - Theme mode for stroke colors.
 * @returns Updated SVG string.
 */
export function applyMoleculeSvg3dBondDepthTiers(
  svgText: string,
  mol: Molecule,
  bondDepthTier: Map<number, BondDepthTier>,
  isDark: boolean,
): string {
  const trimmed = svgText.trim();
  if (!trimmed.startsWith("<")) return svgText;
  if (bondDepthTier.size === 0) return svgText;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svgText;
  const svg = doc.documentElement;
  const svgId = svg.getAttribute("id") ?? "";

  const bondMid: { mx: number; my: number; bi: number }[] = [];
  const bondEndpoints = new Map<
    number,
    { x1: number; y1: number; x2: number; y2: number }
  >();
  svg.querySelectorAll("line[id]").forEach((el) => {
    const id = el.getAttribute("id") ?? "";
    if (!id.startsWith(`${svgId}:Bond:`)) return;
    const rest = id.slice(`${svgId}:Bond:`.length);
    const bi = Number.parseInt(rest, 10);
    if (!Number.isFinite(bi)) return;
    const x1 = Number.parseFloat(el.getAttribute("x1") ?? "0");
    const y1 = Number.parseFloat(el.getAttribute("y1") ?? "0");
    const x2 = Number.parseFloat(el.getAttribute("x2") ?? "0");
    const y2 = Number.parseFloat(el.getAttribute("y2") ?? "0");
    bondMid.push({ mx: (x1 + x2) * 0.5, my: (y1 + y2) * 0.5, bi });
    bondEndpoints.set(bi, { x1, y1, x2, y2 });
  });

  function bondIndexForVisibleLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number | null {
    for (const [bi, ep] of bondEndpoints) {
      if (bondEndpointsMatch(x1, y1, x2, y2, ep.x1, ep.y1, ep.x2, ep.y2)) {
        return bi;
      }
    }
    return nearestBondIndex((x1 + x2) * 0.5, (y1 + y2) * 0.5);
  }

  function nearestBondIndex(mx: number, my: number): number | null {
    if (bondMid.length === 0) return null;
    let best = bondMid[0]!;
    let bestD = Infinity;
    for (const b of bondMid) {
      const d = Math.hypot(mx - b.mx, my - b.my);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (bestD > 14) return null;
    return best.bi;
  }

  svg.querySelectorAll("line").forEach((el) => {
    if (el.classList.contains("event")) return;
    const x1 = Number.parseFloat(el.getAttribute("x1") ?? "0");
    const y1 = Number.parseFloat(el.getAttribute("y1") ?? "0");
    const x2 = Number.parseFloat(el.getAttribute("x2") ?? "0");
    const y2 = Number.parseFloat(el.getAttribute("y2") ?? "0");
    const bi = bondIndexForVisibleLine(x1, y1, x2, y2);
    if (bi === null) return;
    const tier = bondDepthTier.get(bi);
    if (!tier) return;
    applyBondTierStyle(el, tier, isDark);
  });

  svg.querySelectorAll("path").forEach((path) => {
    const fill = path.getAttribute("fill");
    const stroke = path.getAttribute("stroke");
    if ((!fill || fill === "none") && (!stroke || stroke === "none")) return;
    let mx = 0;
    let my = 0;
    try {
      const b = (path as SVGGraphicsElement).getBBox();
      mx = b.x + b.width * 0.5;
      my = b.y + b.height * 0.5;
    } catch {
      return;
    }
    const bi = nearestBondIndex(mx, my);
    if (bi === null) return;
    const tier = bondDepthTier.get(bi);
    if (!tier) return;
    applyBondTierStyle(path, tier, isDark);
  });

  return new XMLSerializer().serializeToString(svg);
}

/**
 * Applies continuous atom-depth saturation and opacity to SVG primitives (legacy fallback).
 *
 * Prefer {@link applyMoleculeSvg3dBondDepthTiers} when bond tier data is available.
 *
 * @param svgText - Raw SVG string from OpenChemLib.
 * @param mol - Stripped molecule used to generate the SVG.
 * @param atomDepth - Per-atom depth toward the camera.
 * @returns Updated SVG string.
 */
export function applyMoleculeSvg3dPerspectiveDepth(
  svgText: string,
  mol: Molecule,
  atomDepth: number[],
): string {
  const trimmed = svgText.trim();
  if (!trimmed.startsWith("<")) return svgText;
  if (atomDepth.length !== mol.getAtoms()) return svgText;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svgText;
  const svg = doc.documentElement;
  const svgId = svg.getAttribute("id") ?? "";

  const bonds = mol.getBonds();
  const bondT: number[] = [];
  const depthPool: number[] = [...atomDepth];
  for (let b = 0; b < bonds; b += 1) {
    const a0 = mol.getBondAtom(0, b);
    const a1 = mol.getBondAtom(1, b);
    const t = (atomDepth[a0]! + atomDepth[a1]!) * 0.5;
    bondT.push(t);
    depthPool.push(t);
  }
  const { min: zMin, max: zMax } = normalizeDepths(depthPool);

  const bondMid: { mx: number; my: number; bi: number }[] = [];

  svg.querySelectorAll("line[id]").forEach((el) => {
    const id = el.getAttribute("id") ?? "";
    if (!id.startsWith(`${svgId}:Bond:`)) return;
    const rest = id.slice(`${svgId}:Bond:`.length);
    const bi = Number.parseInt(rest, 10);
    if (!Number.isFinite(bi)) return;
    const x1 = Number.parseFloat(el.getAttribute("x1") ?? "0");
    const y1 = Number.parseFloat(el.getAttribute("y1") ?? "0");
    const x2 = Number.parseFloat(el.getAttribute("x2") ?? "0");
    const y2 = Number.parseFloat(el.getAttribute("y2") ?? "0");
    bondMid.push({ mx: (x1 + x2) * 0.5, my: (y1 + y2) * 0.5, bi });
  });

  const atomPos = new Map<number, { cx: number; cy: number }>();
  svg.querySelectorAll("circle[id]").forEach((el) => {
    const id = el.getAttribute("id") ?? "";
    if (!id.startsWith(`${svgId}:Atom:`)) return;
    const rest = id.slice(`${svgId}:Atom:`.length);
    const ai = Number.parseInt(rest, 10);
    if (!Number.isFinite(ai)) return;
    const cx = Number.parseFloat(el.getAttribute("cx") ?? "0");
    const cy = Number.parseFloat(el.getAttribute("cy") ?? "0");
    atomPos.set(ai, { cx, cy });
  });

  function nearestBondT(mx: number, my: number): number | null {
    if (bondMid.length === 0) return null;
    let best = bondMid[0]!;
    let bestD = Infinity;
    for (const b of bondMid) {
      const d = Math.hypot(mx - b.mx, my - b.my);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (bestD > 14) return null;
    return bondT[best.bi] ?? null;
  }

  svg.querySelectorAll("line").forEach((el) => {
    if (el.classList.contains("event")) return;
    const x1 = Number.parseFloat(el.getAttribute("x1") ?? "0");
    const y1 = Number.parseFloat(el.getAttribute("y1") ?? "0");
    const x2 = Number.parseFloat(el.getAttribute("x2") ?? "0");
    const y2 = Number.parseFloat(el.getAttribute("y2") ?? "0");
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const bt = nearestBondT(mx, my);
    if (bt === null) return;
    appendDepthFilterStyle(el, normT(bt, zMin, zMax));
  });

  svg.querySelectorAll("path").forEach((path) => {
    const fill = path.getAttribute("fill");
    const stroke = path.getAttribute("stroke");
    if ((!fill || fill === "none") && (!stroke || stroke === "none")) return;
    let mx = 0;
    let my = 0;
    try {
      const b = (path as SVGGraphicsElement).getBBox();
      mx = b.x + b.width * 0.5;
      my = b.y + b.height * 0.5;
    } catch {
      return;
    }
    const bt = nearestBondT(mx, my);
    if (bt === null) return;
    appendDepthFilterStyle(path, normT(bt, zMin, zMax));
  });

  svg.querySelectorAll("text").forEach((text) => {
    const tx = Number.parseFloat(text.getAttribute("x") ?? "0");
    const ty = Number.parseFloat(text.getAttribute("y") ?? "0");
    let bestAi = 0;
    let bestD = Infinity;
    for (const [ai, c] of atomPos) {
      const d = Math.hypot(tx - c.cx, ty - c.cy);
      if (d < bestD) {
        bestD = d;
        bestAi = ai;
      }
    }
    if (bestD > 48) return;
    appendDepthFilterStyle(text, normT(atomDepth[bestAi]!, zMin, zMax));
  });

  return new XMLSerializer().serializeToString(svg);
}
