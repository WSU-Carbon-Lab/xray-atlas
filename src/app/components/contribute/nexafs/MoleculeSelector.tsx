"use client";

import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { FormField } from "~/app/components/FormField";
import {
  MoleculeDisplayCompact,
  type DisplayMolecule,
} from "~/app/components/MoleculeDisplay";
import { AddMoleculeButton } from "~/app/components/AddEntityButtons";
import type { MoleculeSearchResult } from "~/app/contribute/nexafs/types";

type MoleculeSelectorProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  suggestions: MoleculeSearchResult[];
  manualResults: MoleculeSearchResult[];
  suggestionError: string | null;
  manualError: string | null;
  isSuggesting: boolean;
  isManualSearching: boolean;
  selectedMolecule: MoleculeSearchResult | null;
  selectedPreferredName: string;
  setSelectedPreferredName: (value: string) => void;
  allMoleculeNames: string[];
  onUseMolecule: (payload: MoleculeSearchResult) => void;
  onManualSearch: () => void;
};

const toDisplayMolecule = (result: MoleculeSearchResult): DisplayMolecule => ({
  name: result.iupacName,
  commonName: [result.commonName, ...result.synonyms].filter(Boolean),
  chemical_formula: result.chemicalFormula,
  SMILES: result.smiles,
  InChI: result.inchi,
  pubChemCid: result.pubChemCid,
  casNumber: result.casNumber,
});

export function MoleculeSelector({
  searchTerm,
  setSearchTerm,
  suggestions,
  manualResults,
  suggestionError,
  manualError,
  isSuggesting,
  isManualSearching,
  selectedMolecule,
  selectedPreferredName,
  setSelectedPreferredName,
  allMoleculeNames,
  onUseMolecule,
  onManualSearch,
}: MoleculeSelectorProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        1. Select Molecule
      </h2>

      <label
        htmlFor="molecule-search"
        className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Search Molecule
      </label>
      <div className="space-y-2">
        <div className="relative flex-1">
          <input
            id="molecule-search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, synonym, CAS, or PubChem CID"
            className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-28 pl-10 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <button
            type="button"
            onClick={onManualSearch}
            className="hover:border-wsu-crimson hover:text-wsu-crimson absolute top-1/2 right-3 -translate-y-1/2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            Search
          </button>
        </div>
        {suggestionError && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {suggestionError}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {isSuggesting && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Updating suggestions…
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p className="mb-3 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
              Suggestions
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => onUseMolecule(suggestion)}
                  className="hover:border-wsu-crimson flex w-full flex-col rounded-lg border border-transparent px-3 py-2 text-left transition hover:bg-white dark:hover:bg-gray-800"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {suggestion.commonName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {suggestion.chemicalFormula || "No formula"} •{" "}
                    {suggestion.casNumber
                      ? `CAS ${suggestion.casNumber}`
                      : "CAS unavailable"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {manualResults.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-700 uppercase dark:text-blue-200">
                Search results
              </p>
              {isManualSearching && (
                <span className="text-xs text-blue-600 dark:text-blue-300">
                  Refreshing…
                </span>
              )}
            </div>
            <div className="space-y-2">
              {manualResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => onUseMolecule(result)}
                  className="flex w-full flex-col rounded-lg border border-transparent bg-white/80 px-3 py-2 text-left transition hover:border-blue-400 dark:bg-blue-900/20"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {result.commonName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-300">
                    {result.iupacName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {manualError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {manualError}
          </p>
        )}

        {suggestions.length === 0 &&
          manualResults.length === 0 &&
          !isSuggesting && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
              <p>
                No suggestions yet. Try another keyword or run a full search.
              </p>
              <div className="mt-3">
                <AddMoleculeButton />
              </div>
            </div>
          )}
      </div>

      {selectedMolecule && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-3 text-green-800 dark:text-green-300">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="font-medium">
              Selected molecule:{" "}
              {selectedPreferredName || selectedMolecule.commonName}
            </span>
          </div>
          <p className="mt-2 text-sm text-green-700 dark:text-green-200">
            IUPAC: {selectedMolecule.iupacName}
          </p>
          <div className="mt-4 space-y-4">
            <MoleculeDisplayCompact
              molecule={toDisplayMolecule(selectedMolecule)}
            />

            {allMoleculeNames.length > 1 && (
              <FormField
                label="Preferred Molecule Name"
                type="select"
                name="preferredName"
                value={selectedPreferredName}
                onChange={(value) => setSelectedPreferredName(value as string)}
                tooltip="Select which name/synonym should appear on the molecule banner"
                options={allMoleculeNames.map((name) => ({
                  value: name,
                  label: name,
                }))}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
