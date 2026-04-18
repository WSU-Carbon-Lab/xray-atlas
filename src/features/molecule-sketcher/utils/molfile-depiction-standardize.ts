import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

export function uncrossParallelDoubleBonds(mol: Molecule): void {
  mol.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
  const bonds = mol.getBonds();
  for (let b = 0; b < bonds; b += 1) {
    if (mol.getBondType(b) !== MoleculeCtor.cBondTypeCross) continue;
    if (mol.getBondOrder(b) !== 2) continue;
    mol.setBondType(b, MoleculeCtor.cBondTypeDouble);
  }
}

export function standardizeDepictionStereo(mol: Molecule): void {
  mol.stripStereoInformation();
  uncrossParallelDoubleBonds(mol);
}
