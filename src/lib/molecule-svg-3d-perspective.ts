import type { Molecule } from "openchemlib";

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
  const v = t;
  const sat = 0.46 + 0.54 * v;
  const op = 0.76 + 0.24 * v;
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
