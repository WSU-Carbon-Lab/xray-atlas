import type { MoleculeView } from "~/types/molecule";

export interface FavoriteMutationLike {
  isPending: boolean;
  mutateAsync: (input: { moleculeId: string }) => Promise<unknown>;
}

export interface MoleculeCardContext {
  onEdit: () => void;
  isSignedIn: boolean;
  canEdit: boolean;
  handleFavorite: () => void;
  favoriteMutation: FavoriteMutationLike;
  realtimeUserHasUpvoted: boolean;
  realtimeUpvoteCount: number;
  copiedText: string | null;
  handleCopy: (text: string, label: string) => void;
}

export interface MoleculeCardProps {
  molecule: MoleculeView;
  primaryName: string;
  orderedSynonyms: string[];
  shortestSynonyms: string[];
  pubChemUrl: string | null;
  casUrl: string | null;
  isSignedIn: boolean;
  canEdit: boolean;
  handleFavorite: () => void;
  favoriteMutation: FavoriteMutationLike;
  realtimeUserHasUpvoted: boolean;
  realtimeUpvoteCount: number;
  onEdit: () => void;
  copiedText: string | null;
  handleCopy: (text: string, label: string) => void;
}

export interface MoleculeCardActionsProps {
  molecule: MoleculeView;
  pubChemUrl: string | null;
  casUrl: string | null;
  copiedText: string | null;
  handleCopy: (text: string, label: string) => void;
  size?: "sm" | "md";
  actionsLayout?: "browse" | "compact" | "carousel";
}

export interface MoleculeImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasImage: boolean;
  imageUrl: string;
  primaryName: string;
  chemicalFormula: string | null;
  previewGradient: string;
}

export type HeaderEditForm = {
  iupacName: string;
  chemicalFormula: string;
  commonNames: string[];
  primaryIndex: number;
  SMILES: string;
  InChI: string;
  casNumber: string;
  pubChemCid: string;
  tagIds: string[];
};
