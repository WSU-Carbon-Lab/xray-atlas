"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import {
  MoleculeDisplayCompact,
  type DisplayMolecule,
} from "~/app/components/MoleculeDisplay";
import { FormField } from "~/app/components/FormField";
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSearch, setShowSearch] = useState(!selectedMolecule);

  // If molecule is selected and not searching, show compact view
  if (selectedMolecule && !showSearch && (searchTerm.length === 0 || searchTerm === selectedPreferredName || searchTerm === selectedMolecule.commonName)) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDetailsModal(true)}
            className="flex flex-1 flex-col text-left hover:opacity-80"
          >
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {selectedPreferredName || selectedMolecule.commonName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedMolecule.chemicalFormula || "No formula"} •{" "}
              {selectedMolecule.casNumber
                ? `CAS ${selectedMolecule.casNumber}`
                : "CAS unavailable"}
            </span>
          </button>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => {
                setShowSearch(true);
                setSearchTerm("");
              }}
              aria-label="Change molecule"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <SimpleDialog
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={selectedPreferredName || selectedMolecule.commonName}
        >
          <div className="space-y-4">
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
        </SimpleDialog>
      </div>
    );
  }

  // Show search interface
  return (
    <div className="space-y-3">
      <label
        htmlFor="molecule-search"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Select Molecule
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

      <div className="space-y-3">
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
                  onClick={() => {
                    onUseMolecule(suggestion);
                    setShowSearch(false);
                  }}
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
                  onClick={() => {
                    onUseMolecule(result);
                    setShowSearch(false);
                  }}
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
          !isSuggesting &&
          searchTerm.length >= 2 && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
              <p className="mb-2">No molecules found matching &quot;{searchTerm}&quot;</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Try a different search term or add a new molecule
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
