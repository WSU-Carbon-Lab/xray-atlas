export interface MoleculeViewCreatedBy {
  id: string;
  name: string | null;
  image: string | null;
}

export interface MoleculeViewContributor {
  id: string;
  userId: string;
  contributionType: string;
  contributedAt: Date | string;
  user: { id: string; name: string | null; image: string | null };
}

export interface MoleculeViewTag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface MoleculeViewSample {
  id: string;
  identifier: string | null;
  preparationdate: Date | string | null;
}

export interface MoleculeView {
  name: string;
  iupacName: string;
  commonName?: string[];
  chemicalFormula: string;
  SMILES: string;
  InChI: string;
  pubChemCid?: string | null;
  casNumber?: string | null;
  imageUrl?: string;
  id: string;
  favoriteCount: number;
  userHasFavorited: boolean;
  createdBy?: MoleculeViewCreatedBy | null;
  contributors?: MoleculeViewContributor[];
  moleculeTags?: MoleculeViewTag[];
  viewCount?: number;
  sampleCount?: number;
  samples?: MoleculeViewSample[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
