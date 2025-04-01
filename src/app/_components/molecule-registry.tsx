// app/_components/molecule-registry.tsx (Client Component)
"use client";

import { useState } from "react";
import { MoleculeDisplay } from "./molecule";
import type { Molecule } from "~/server/db";

export const MoleculeRegistry = ({ molecules }: { molecules: Molecule[] }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMolecules = molecules.filter((molecule) => {
    const searchString = searchQuery.toLowerCase();
    return (
      molecule.name.toLowerCase().includes(searchString) ||
      molecule.chemical_formula.toLowerCase().includes(searchString) ||
      molecule.synonyms.some((synonym) =>
        synonym.toLowerCase().includes(searchString),
      )
    );
  });

  return (
    <div>
      <div className="flex w-full flex-col items-center justify-center p-0">
        <input
          type="text"
          placeholder="Search for a molecule"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="focus:ring-wsu-gray/50 mb-8 mt-4 w-full rounded-lg border-2 border-gray-300 p-2 text-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
        />
      </div>
      <div className="grid h-full w-full grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4 2xl:gap-10">
        {filteredMolecules.map((molecule) => (
          <MoleculeDisplay molecule={molecule} key={molecule.name} />
        ))}
      </div>
      {filteredMolecules.length === 0 && (
        <div className="text-center text-gray-500">
          No molecules found matching your search
        </div>
      )}
    </div>
  );
};
