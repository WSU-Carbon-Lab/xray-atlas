"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { MoleculeView } from "~/types/molecule";

export type MoleculeDetailMolecule = MoleculeView;

export type MoleculeDetailContextValue = {
  molecule: MoleculeDetailMolecule;
  moleculeId: string;
  isSignedIn: boolean;
  canEdit: boolean;
};

const MoleculeDetailContext = createContext<MoleculeDetailContextValue | null>(
  null,
);

export function MoleculeDetailProvider({
  molecule,
  moleculeId,
  isSignedIn,
  canEdit,
  children,
}: {
  molecule: MoleculeDetailMolecule;
  moleculeId: string;
  isSignedIn: boolean;
  canEdit: boolean;
  children: ReactNode;
}) {
  const value = useMemo<MoleculeDetailContextValue>(
    () => ({
      molecule,
      moleculeId,
      isSignedIn,
      canEdit,
    }),
    [molecule, moleculeId, isSignedIn, canEdit],
  );

  return (
    <MoleculeDetailContext.Provider value={value}>
      {children}
    </MoleculeDetailContext.Provider>
  );
}

export function useMoleculeDetail() {
  const ctx = useContext(MoleculeDetailContext);
  if (!ctx) {
    throw new Error(
      "useMoleculeDetail must be used within MoleculeDetailProvider",
    );
  }
  return ctx;
}
