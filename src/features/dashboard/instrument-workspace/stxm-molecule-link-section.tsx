"use client";

import { useState } from "react";
import { Button, Label } from "@heroui/react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SimpleDialog } from "~/components/ui/dialog";
import { MoleculeSelectModal } from "~/features/process-nexafs/ui/descriptor-select-modals";
import type { MoleculeSearchResult } from "~/features/process-nexafs/types";
import { trpc } from "~/trpc/client";

export type StxmMoleculeLinkSectionProps = {
  linkedMolecule: MoleculeSearchResult | null;
  onLinkedMoleculeChange: (molecule: MoleculeSearchResult | null) => void;
};

/**
 * Compact molecule search and link control for STXM ingestion (Atlas molecule, not experiment).
 */
export function StxmMoleculeLinkSection({
  linkedMolecule,
  onLinkedMoleculeChange,
}: StxmMoleculeLinkSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const utils = trpc.useUtils();

  const handleSelectById = async (moleculeId: string) => {
    const row = await utils.molecules.getById.fetch({ id: moleculeId });
    onLinkedMoleculeChange({
      id: row.id,
      iupacName: row.iupacName,
      commonName: row.name,
      synonyms: row.commonName ?? [],
      inchi: row.InChI,
      smiles: row.SMILES,
      chemicalFormula: row.chemicalFormula,
      casNumber: row.casNumber ?? null,
      pubChemCid: row.pubChemCid ?? null,
      imageUrl: row.imageUrl,
    });
  };

  return (
    <section className="border-border bg-surface rounded-lg border px-4 py-3">
      <p className="text-foreground text-sm font-medium">Linked molecule</p>
      <p className="text-muted mt-1 text-xs leading-snug">
        Link an Atlas molecule for bare-atom reference and export metadata. STXM
        sessions store the molecule on export metadata, not a NEXAFS experiment.
      </p>

      {linkedMolecule ? (
        <div className="border-border mt-3 flex items-start justify-between gap-2 rounded-md border px-3 py-2">
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">
              {linkedMolecule.commonName || linkedMolecule.iupacName}
            </p>
            <p className="text-muted text-xs">
              {linkedMolecule.chemicalFormula || "No formula"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setPickerOpen(true)}
            >
              Change
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Unlink molecule"
              onPress={() => onLinkedMoleculeChange(null)}
            >
              <XMarkIcon className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="mt-3"
          variant="secondary"
          size="sm"
          onPress={() => setPickerOpen(true)}
        >
          <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
          Search molecules
        </Button>
      )}

      <MoleculeSelectModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => void handleSelectById(id)}
      />
    </section>
  );
}
