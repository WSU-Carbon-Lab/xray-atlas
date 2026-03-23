"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  LockClosedIcon,
  LockOpenIcon,
} from "@heroicons/react/24/outline";
import { Button, Label, Input } from "@heroui/react";
import { SimpleDialog } from "~/components/ui/dialog";
import {
  MoleculeDisplayCompact,
  type DisplayMolecule,
} from "~/components/molecules/molecule-display";
import { FormField } from "~/components/ui/form-field";
import type { MoleculeSearchResult } from "~/features/process-nexafs";

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
  moleculeLocked: boolean;
  onToggleLock: () => void;
};

const toDisplayMolecule = (result: MoleculeSearchResult): DisplayMolecule => ({
  id: result.id,
  name: result.iupacName,
  iupacName: result.iupacName,
  commonName: [result.commonName, ...result.synonyms].filter(Boolean),
  chemicalFormula: result.chemicalFormula,
  SMILES: result.smiles,
  InChI: result.inchi,
  pubChemCid: result.pubChemCid,
  casNumber: result.casNumber,
  favoriteCount: 0,
  userHasFavorited: false,
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
  moleculeLocked,
  onToggleLock,
}: MoleculeSelectorProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSearch, setShowSearch] = useState(!selectedMolecule);

  // If molecule is selected and not searching, show compact view
  if (selectedMolecule && !showSearch && (searchTerm.length === 0 || searchTerm === selectedPreferredName || searchTerm === selectedMolecule.commonName)) {
    return (
      <div className="border-border bg-surface rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDetailsModal(true)}
            className="flex flex-1 flex-col text-left hover:opacity-80"
          >
            <span className="text-foreground font-medium">
              {selectedPreferredName || selectedMolecule.commonName}
            </span>
            <span className="text-muted text-xs">
              {selectedMolecule.chemicalFormula || "No formula"} •{" "}
              {selectedMolecule.casNumber
                ? `CAS ${selectedMolecule.casNumber}`
                : "CAS unavailable"}
            </span>
          </button>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="text-success h-5 w-5" />
            <button
              type="button"
              onClick={onToggleLock}
              className="text-muted hover:bg-default rounded p-1"
              title={moleculeLocked ? "Unlock molecule" : "Lock molecule"}
              aria-label={moleculeLocked ? "Unlock molecule" : "Lock molecule"}
            >
              {moleculeLocked ? (
                <LockClosedIcon className="h-4 w-4" />
              ) : (
                <LockOpenIcon className="h-4 w-4" />
              )}
            </button>
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              onPress={() => {
                if (!moleculeLocked) {
                  setShowSearch(true);
                  setSearchTerm("");
                }
              }}
              isDisabled={moleculeLocked}
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

  return (
    <div className="space-y-3">
      <Label className="text-foreground block text-sm font-medium">
        Select Molecule
      </Label>
      <div className="space-y-2">
        <div className="relative flex items-center gap-2">
          <div className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <MagnifyingGlassIcon className="h-4 w-4" />
          </div>
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, synonym, CAS, or PubChem CID"
            variant="secondary"
            className="min-w-0 flex-1 pl-10 pr-24"
            autoComplete="off"
            aria-label="Search molecule by name, synonym, CAS, or PubChem CID"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onPress={onManualSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0"
          >
            Search
          </Button>
        </div>
        {suggestionError && (
          <p className="text-muted text-xs">{suggestionError}</p>
        )}
      </div>

      <div className="space-y-3">
        {isSuggesting && (
          <p className="text-muted text-sm">Updating suggestions…</p>
        )}

        {suggestions.length > 0 && (
          <div className="border-border bg-surface rounded-lg border p-4">
            <p className="text-muted mb-3 text-xs font-semibold uppercase">
              Suggestions
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => {
                    if (!moleculeLocked) {
                      onUseMolecule(suggestion);
                      setShowSearch(false);
                    }
                  }}
                  disabled={moleculeLocked}
                  className="hover:border-accent flex w-full flex-col rounded-lg border border-transparent px-3 py-2 text-left transition hover:bg-default disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-foreground font-medium">
                    {suggestion.commonName}
                  </span>
                  <span className="text-muted text-xs">
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
          <div className="border-accent/50 bg-accent/10 rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-foreground text-xs font-semibold uppercase">
                Search results
              </p>
              {isManualSearching && (
                <span className="text-muted text-xs">Refreshing…</span>
              )}
            </div>
            <div className="space-y-2">
              {manualResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => {
                    if (!moleculeLocked) {
                      onUseMolecule(result);
                      setShowSearch(false);
                    }
                  }}
                  disabled={moleculeLocked}
                  className="hover:border-accent flex w-full flex-col rounded-lg border border-transparent px-3 py-2 text-left transition hover:bg-default disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-foreground font-medium">
                    {result.commonName}
                  </span>
                  <span className="text-muted text-xs">
                    {result.iupacName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {manualError && (
          <p className="text-danger text-sm">{manualError}</p>
        )}

        {suggestions.length === 0 &&
          manualResults.length === 0 &&
          !isSuggesting &&
          searchTerm.length >= 2 && (
            <div className="border-border text-muted rounded-lg border border-dashed p-4 text-center text-sm">
              <p className="mb-2">No molecules found matching &quot;{searchTerm}&quot;</p>
              <p className="text-xs">
                Try a different search term or add a new molecule
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
