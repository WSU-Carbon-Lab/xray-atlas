"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MoleculeView } from "~/types/molecule";

export type MoleculeDetailMolecule = MoleculeView;

export type MoleculeDetailContextValue = {
  molecule: MoleculeDetailMolecule;
  moleculeId: string;
  isSignedIn: boolean;
  canEdit: boolean;
  query: string;
  setQuery: (value: string) => void;
  sortBy: "created" | "name" | "views" | "favorites";
  setSortBy: (value: "created" | "name" | "views" | "favorites") => void;
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
  const [query, setQueryState] = useState("");
  const [sortBy, setSortBy] = useState<
    "created" | "name" | "views" | "favorites"
  >("created");

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
  }, []);

  const value = useMemo<MoleculeDetailContextValue>(
    () => ({
      molecule,
      moleculeId,
      isSignedIn,
      canEdit,
      query,
      setQuery,
      sortBy,
      setSortBy,
    }),
    [molecule, moleculeId, isSignedIn, canEdit, query, setQuery, sortBy],
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
