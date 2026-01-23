export function noop(): void {
  // No operation
}

export function noopString(_value: string): void {
  // No operation
}

export function noopMolecule(_molecule: {
  id: string;
  iupacName: string;
  commonName: string;
  synonyms: string[];
  inchi: string;
  smiles: string;
  chemicalFormula: string;
  casNumber: string | null;
  pubChemCid: string | null;
  imageUrl?: string;
}): void {
  // No operation
}
