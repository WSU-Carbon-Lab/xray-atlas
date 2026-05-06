import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import { findBondIndex } from "./bond-fragment-transforms";
import { ensureMolHelpers } from "./molecule-2d-transforms";

export type FragmentationGranularity = "coarse" | "medium" | "fine";

export const FRAGMENTATION_POLICY_VERSION = "ocl-hybrid-v1";

export type FragmentationCutRecord = {
  label: number;
  atomA: number;
  atomB: number;
};

export type FragmentationFragmentRecord = {
  index: number;
  smiles: string;
  cutLabels: number[];
};

export type FragmentationResult = {
  inputSmiles: string;
  granularity: FragmentationGranularity;
  policyVersion: string;
  cutBonds: FragmentationCutRecord[];
  candidateBondIndices: number[];
  appliedBondIndices: number[];
  fragments: FragmentationFragmentRecord[];
};

function dsuFind(parent: number[], x: number): number {
  let r = x;
  while (true) {
    const pr = parent[r];
    if (pr === undefined || pr === r) {
      return r;
    }
    const ppr = parent[pr];
    if (ppr !== undefined) {
      parent[r] = ppr;
    }
    r = pr;
  }
}

function dsuUnion(parent: number[], a: number, b: number): void {
  const ra = dsuFind(parent, a);
  const rb = dsuFind(parent, b);
  if (ra !== rb) {
    parent[rb] = ra;
  }
}

function buildConjugationParent(mol: Molecule): number[] {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  const n = mol.getAllAtoms();
  const parent = Array.from({ length: n }, (_, i) => i);
  for (let bi = 0; bi < mol.getBonds(); bi += 1) {
    const u = mol.getBondAtom(0, bi);
    const v = mol.getBondAtom(1, bi);
    if (mol.isAromaticBond(bi) || mol.isDelocalizedBond(bi)) {
      dsuUnion(parent, u, v);
      continue;
    }
    const ts = mol.getBondTypeSimple(bi);
    if (
      ts === MoleculeCtor.cBondTypeDouble ||
      ts === MoleculeCtor.cBondTypeTriple
    ) {
      dsuUnion(parent, u, v);
    }
  }

  const pi = new Array<boolean>(n).fill(false);
  for (let a = 0; a < n; a += 1) {
    if (mol.isAromaticAtom(a)) {
      pi[a] = true;
    }
  }
  for (let bi = 0; bi < mol.getBonds(); bi += 1) {
    if (mol.getBondOrder(bi) >= 2 || mol.isAromaticBond(bi)) {
      pi[mol.getBondAtom(0, bi)] = true;
      pi[mol.getBondAtom(1, bi)] = true;
    }
  }

  for (let iter = 0; iter < n + 2; iter += 1) {
    let changed = false;
    for (let bi = 0; bi < mol.getBonds(); bi += 1) {
      if (mol.getBondOrder(bi) !== 1) {
        continue;
      }
      if (mol.isAromaticBond(bi)) {
        continue;
      }
      const u = mol.getBondAtom(0, bi);
      const v = mol.getBondAtom(1, bi);
      if (pi[u] && pi[v]) {
        const ru = dsuFind(parent, u);
        const rv = dsuFind(parent, v);
        if (ru !== rv) {
          dsuUnion(parent, u, v);
          changed = true;
        }
      }
    }
    if (!changed) {
      break;
    }
  }

  for (let iter = 0; iter < n + 2; iter += 1) {
    const rootPi = new Map<number, boolean>();
    for (let a = 0; a < n; a += 1) {
      const r = dsuFind(parent, a);
      rootPi.set(r, (rootPi.get(r) ?? false) || Boolean(pi[a]));
    }
    let changed = false;
    for (let a = 0; a < n; a += 1) {
      const r = dsuFind(parent, a);
      const flag = rootPi.get(r) ?? false;
      if (flag && !pi[a]) {
        pi[a] = true;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
    for (let bi = 0; bi < mol.getBonds(); bi += 1) {
      if (mol.getBondOrder(bi) !== 1 || mol.isAromaticBond(bi)) {
        continue;
      }
      const u = mol.getBondAtom(0, bi);
      const v = mol.getBondAtom(1, bi);
      if (pi[u] && pi[v]) {
        dsuUnion(parent, u, v);
      }
    }
  }

  return parent;
}

function isHeteroHeavy(mol: Molecule, atom: number): boolean {
  const z = mol.getAtomicNo(atom);
  return z > 1 && z !== 6;
}

function isEsterCleaveBond(mol: Molecule, bond: number): boolean {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  const u = mol.getBondAtom(0, bond);
  const v = mol.getBondAtom(1, bond);
  const zu = mol.getAtomicNo(u);
  const zv = mol.getAtomicNo(v);
  if (zu !== 8 && zv !== 8) {
    return false;
  }
  const carbon = zu === 8 ? v : u;
  const etherO = zu === 8 ? u : v;
  if (mol.getAtomicNo(carbon) !== 6) {
    return false;
  }
  let hasCumulativeDoubleO = false;
  let hasSingleEtherO = false;
  const nc = mol.getConnAtoms(carbon);
  for (let i = 0; i < nc; i += 1) {
    const na = mol.getConnAtom(carbon, i);
    const nb = mol.getConnBond(carbon, i);
    if (mol.getAtomicNo(na) === 8 && mol.getBondOrder(nb) === 2) {
      hasCumulativeDoubleO = true;
    }
    if (na === etherO && mol.getBondOrder(nb) === 1) {
      hasSingleEtherO = true;
    }
  }
  return hasCumulativeDoubleO && hasSingleEtherO;
}

function hybridCutCandidate(
  mol: Molecule,
  bond: number,
  conjParent: number[],
): boolean {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  if (mol.getBondOrder(bond) !== 1) {
    return false;
  }
  if (mol.isAromaticBond(bond)) {
    return false;
  }
  if (mol.isRingBond(bond)) {
    return false;
  }
  const a0 = mol.getBondAtom(0, bond);
  const a1 = mol.getBondAtom(1, bond);
  if (mol.getAtomicNo(a0) <= 1 || mol.getAtomicNo(a1) <= 1) {
    return false;
  }
  if (mol.getConnAtoms(a0) < 2 || mol.getConnAtoms(a1) < 2) {
    return false;
  }
  if (mol.isSmallRingAtom(a0) || mol.isSmallRingAtom(a1)) {
    return false;
  }
  if (dsuFind(conjParent, a0) === dsuFind(conjParent, a1)) {
    return false;
  }
  return true;
}

export function listCandidateCutBonds(
  mol: Molecule,
  granularity: FragmentationGranularity,
): number[] {
  ensureMolHelpers(mol);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  const conjParent = buildConjugationParent(mol);
  const out: number[] = [];
  for (let bi = 0; bi < mol.getBonds(); bi += 1) {
    if (!hybridCutCandidate(mol, bi, conjParent)) {
      continue;
    }
    const pseudo = mol.isPseudoRotatableBond(bi);
    if (granularity === "medium" && pseudo) {
      continue;
    }
    const amide = mol.isAmideTypeBond(bi);
    const ester = isEsterCleaveBond(mol, bi);
    const hetero =
      isHeteroHeavy(mol, mol.getBondAtom(0, bi)) ||
      isHeteroHeavy(mol, mol.getBondAtom(1, bi));
    if (granularity === "coarse") {
      if (amide || ester) {
        out.push(bi);
        continue;
      }
      if (hetero) {
        out.push(bi);
      }
      continue;
    }
    out.push(bi);
  }
  return out;
}

function cloneMoleculeFromSmiles(smiles: string): Molecule {
  return MoleculeCtor.fromSmiles(smiles);
}

function manualCutBondAllowed(mol: Molecule, bondIndex: number): boolean {
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);
  if (bondIndex < 0 || bondIndex >= mol.getBonds()) {
    return false;
  }
  if (mol.getBondOrder(bondIndex) !== 1) {
    return false;
  }
  if (mol.isRingBond(bondIndex)) {
    return false;
  }
  const a0 = mol.getBondAtom(0, bondIndex);
  const a1 = mol.getBondAtom(1, bondIndex);
  if (mol.getAtomicNo(a0) <= 1 || mol.getAtomicNo(a1) <= 1) {
    return false;
  }
  return true;
}

export function fragmentMoleculeByBondIndices(
  inputSmiles: string,
  bondIndices: number[],
  granularity: FragmentationGranularity,
  options?: { allowNonCandidateCuts?: boolean },
): FragmentationResult {
  const mol = cloneMoleculeFromSmiles(inputSmiles.trim());
  ensureMolHelpers(mol);
  mol.ensureHelperArrays(MoleculeCtor.cHelperRings);

  const sortedUnique = Array.from(new Set(bondIndices)).sort((a, b) => a - b);
  const candidateBondIndices = listCandidateCutBonds(mol, granularity);
  const candidateSet = new Set(candidateBondIndices);
  const allowNonCandidateCuts = options?.allowNonCandidateCuts === true;
  const appliedBondIndices: number[] = [];

  const cuts: { atomA: number; atomB: number; bond: number }[] = [];
  for (const bi of sortedUnique) {
    const allowed =
      candidateSet.has(bi) ||
      (allowNonCandidateCuts && manualCutBondAllowed(mol, bi));
    if (!allowed) {
      continue;
    }
    const a0 = mol.getBondAtom(0, bi);
    const a1 = mol.getBondAtom(1, bi);
    if (findBondIndex(mol, a0, a1) === -1) {
      continue;
    }
    cuts.push({ atomA: a0, atomB: a1, bond: bi });
  }

  cuts.sort((x, y) => y.bond - x.bond);
  for (const c of cuts) {
    const bi = findBondIndex(mol, c.atomA, c.atomB);
    if (bi >= 0) {
      mol.deleteBond(bi);
      appliedBondIndices.push(c.bond);
    }
  }

  mol.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);

  const cutBonds: FragmentationCutRecord[] = [];
  let label = 1;
  for (const c of cuts) {
    const s1 = mol.addAtom(0);
    mol.addBond(c.atomA, s1);
    mol.setAtomMapNo(s1, label, false);
    const s2 = mol.addAtom(0);
    mol.addBond(c.atomB, s2);
    mol.setAtomMapNo(s2, label, false);
    cutBonds.push({ label, atomA: c.atomA, atomB: c.atomB });
    label += 1;
  }

  mol.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
  mol.setFragment(true);

  if (cuts.length === 0) {
    mol.setFragment(false);
    const f = mol.getCompactCopy();
    f.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
    return {
      inputSmiles: inputSmiles.trim(),
      granularity,
      policyVersion: FRAGMENTATION_POLICY_VERSION,
      cutBonds: [],
      candidateBondIndices,
      appliedBondIndices: [],
      fragments: [
        { index: 0, smiles: f.toIsomericSmiles(), cutLabels: [] },
      ],
    };
  }

  const rawFrags = mol.getFragments();
  const fragments: FragmentationFragmentRecord[] = [];
  let i = 0;
  for (const f of rawFrags) {
    f.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
    f.setFragment(true);
    const smiles = f.toIsomericSmiles({ includeMapping: true });
    const cutLabels: number[] = [];
    for (const cb of cutBonds) {
      const n = f.getAllAtoms();
      for (let a = 0; a < n; a += 1) {
        if (f.getAtomicNo(a) === 0 && f.getAtomMapNo(a) === cb.label) {
          cutLabels.push(cb.label);
          break;
        }
      }
    }
    fragments.push({ index: i, smiles, cutLabels });
    i += 1;
  }

  return {
    inputSmiles: inputSmiles.trim(),
    granularity,
    policyVersion: FRAGMENTATION_POLICY_VERSION,
    cutBonds,
    candidateBondIndices,
    appliedBondIndices,
    fragments,
  };
}

export function formatBondLabel(mol: Molecule, bondIndex: number): string {
  ensureMolHelpers(mol);
  const a0 = mol.getBondAtom(0, bondIndex);
  const a1 = mol.getBondAtom(1, bondIndex);
  const t0 = mol.getAtomLabel(a0);
  const t1 = mol.getAtomLabel(a1);
  return `${bondIndex}: ${t0}${a0}-${t1}${a1}`;
}
