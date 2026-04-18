import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import {
  formatAlkylCnH2nPlus1,
  formatChHydrideLabel,
  normalizeNumericSubscriptsToAscii,
} from "~/lib/chem-formula-subscripts";
import { standardizeDepictionStereo } from "./molfile-depiction-standardize";

const CARBON = 6;

const ALKYL_RE = /^C(\d+)H(\d+)$/;

function parseAlkylFormula(label: string): { n: number; h: number } | null {
  const t = normalizeNumericSubscriptsToAscii(label.replace(/^\]/, "").trim());
  const m = ALKYL_RE.exec(t);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  const h = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(n) || n < 1 || !Number.isFinite(h)) return null;
  if (h !== 2 * n + 1) return null;
  return { n, h };
}

export function normalizeChHydrideDisplayLabels(mol: Molecule): boolean {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  let touched = false;
  const heavy = mol.getAtoms();
  for (let a = 0; a < heavy; a += 1) {
    if (mol.getAtomicNo(a) !== CARBON) continue;
    const raw = mol.getAtomCustomLabel(a);
    if (!raw?.trim()) continue;
    const t = normalizeNumericSubscriptsToAscii(raw.replace(/^\]/, "").trim());
    const m = /^CH(\d+)$/.exec(t);
    if (!m) continue;
    const n = Number.parseInt(m[1]!, 10);
    if (!Number.isFinite(n) || n < 1) continue;
    const canonical = formatChHydrideLabel(n);
    const current = raw.startsWith("]") ? raw.slice(1).trim() : raw.trim();
    if (current === canonical) {
      if (raw.startsWith("]")) {
        mol.setAtomCustomLabel(a, canonical);
        touched = true;
      }
      continue;
    }
    mol.setAtomCustomLabel(a, canonical);
    touched = true;
  }
  return touched;
}

export function normalizeTerminalCarbonHydrideLabels(mol: Molecule): boolean {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  let touched = false;
  const heavy = mol.getAtoms();
  for (let a = 0; a < heavy; a += 1) {
    if (mol.getAtomicNo(a) !== CARBON) continue;
    const existing = mol.getAtomCustomLabel(a);
    if (existing?.trim()) continue;
    if (mol.getAtomCharge(a) !== 0) continue;
    if (!mol.supportsImplicitHydrogen(a)) continue;
    const nc = mol.getConnAtoms(a);
    const ih = mol.getImplicitHydrogens(a);
    if (nc === 1 && ih === 3) {
      mol.setAtomCustomLabel(a, formatChHydrideLabel(3));
      touched = true;
      continue;
    }
    if (nc === 0 && ih === 4) {
      mol.setAtomCustomLabel(a, formatChHydrideLabel(4));
      touched = true;
    }
  }
  return touched;
}

export function normalizeEditorAlkylCustomLabels(mol: Molecule): boolean {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  let touched = false;
  const heavy = mol.getAtoms();
  for (let a = 0; a < heavy; a += 1) {
    const raw = mol.getAtomCustomLabel(a);
    if (!raw) continue;
    const parsed = parseAlkylFormula(raw);
    if (!parsed) continue;
    const canonical = formatAlkylCnH2nPlus1(parsed.n);
    const current = raw.startsWith("]") ? raw.slice(1).trim() : raw.trim();
    if (current === canonical) {
      if (raw.startsWith("]")) {
        mol.setAtomCustomLabel(a, canonical);
        touched = true;
      }
      continue;
    }
    mol.setAtomCustomLabel(a, canonical);
    touched = true;
  }
  return touched;
}

export function expandAbbreviatedAlkylAtAtom(mol: Molecule, labeledAtom: number): boolean {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  if (labeledAtom < 0 || labeledAtom >= mol.getAtoms()) return false;
  if (mol.getAtomicNo(labeledAtom) !== CARBON) return false;

  const raw = mol.getAtomCustomLabel(labeledAtom);
  if (!raw) return false;
  const parsed = parseAlkylFormula(raw.replace(/^\]/, ""));
  if (!parsed) return false;
  const k = parsed.n;
  if (k < 1) return false;
  const addCount = k - 1;

  const nc = mol.getConnAtoms(labeledAtom);
  if (nc !== 1) return false;

  const stub = mol.getConnAtom(labeledAtom, 0);
  const lx = mol.getAtomX(labeledAtom);
  const ly = mol.getAtomY(labeledAtom);
  const sx = mol.getAtomX(stub);
  const sy = mol.getAtomY(stub);
  let dx = lx - sx;
  let dy = ly - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    dx = 1;
    dy = 0;
  } else {
    dx /= len;
    dy /= len;
  }

  const av = MoleculeCtor.getDefaultAverageBondLength();

  mol.setAtomCustomLabel(labeledAtom, null);

  let prev = labeledAtom;
  let px = lx;
  let py = ly;
  for (let i = 0; i < addCount; i += 1) {
    const na = mol.addAtom(CARBON);
    px += dx * av;
    py += dy * av;
    mol.setAtomX(na, px);
    mol.setAtomY(na, py);
    mol.addBond(prev, na);
    prev = na;
  }

  mol.inventCoordinates({});
  return true;
}

export function expandAllAbbreviatedAlkylLabels(mol: Molecule): number {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  let n = 0;
  let changed = true;
  while (changed) {
    changed = false;
    const heavy = mol.getAtoms();
    const targets: number[] = [];
    for (let a = 0; a < heavy; a += 1) {
      const raw = mol.getAtomCustomLabel(a);
      if (!raw) continue;
      if (!parseAlkylFormula(raw.replace(/^\]/, ""))) continue;
      if (mol.getAtomicNo(a) !== CARBON) continue;
      if (mol.getConnAtoms(a) !== 1) continue;
      targets.push(a);
    }
    for (const a of targets.sort((x, y) => y - x)) {
      if (expandAbbreviatedAlkylAtAtom(mol, a)) {
        n += 1;
        changed = true;
        break;
      }
    }
  }
  return n;
}

export function scrubMolfileCustomLabels(raw: string): string {
  try {
    const mol = MoleculeCtor.fromMolfile(raw);
    const beforeStrip = mol.toMolfileV3();
    standardizeDepictionStereo(mol);
    let changed = beforeStrip !== mol.toMolfileV3();
    if (normalizeEditorAlkylCustomLabels(mol)) changed = true;
    if (normalizeChHydrideDisplayLabels(mol)) changed = true;
    if (normalizeTerminalCarbonHydrideLabels(mol)) changed = true;
    if (changed) {
      return mol.toMolfileV3();
    }
    return raw;
  } catch {
    return raw;
  }
}
