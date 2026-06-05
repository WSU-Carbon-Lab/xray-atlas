"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Input, Label, TextField } from "@heroui/react";
import {
  DatasetAttributionEditor,
  type DatasetAttributionChange,
} from "~/features/process-nexafs/ui/dataset-attribution-editor";
import type { MoleculeSearchResult } from "~/features/process-nexafs/types";
import {
  defaultUploaderAttribution,
  filterValidOrcidAttributions,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import type { StxmSampleInfo } from "~/features/dashboard/lib/stxm-export-metadata";
import { StxmMoleculeLinkSection } from "./stxm-molecule-link-section";

export type StxmIngestionContextPanelProps = {
  linkedMolecule: MoleculeSearchResult | null;
  onLinkedMoleculeChange: (molecule: MoleculeSearchResult | null) => void;
  attributions: DatasetAttributionEntry[];
  onAttributionsChange: (rows: DatasetAttributionChange) => void;
  manualFormula: string;
  onManualFormulaChange: (value: string) => void;
  resolvedFormula: string | null;
  sampleInfo: StxmSampleInfo;
  onSampleInfoChange: (info: StxmSampleInfo) => void;
  thicknessCm: string;
  onThicknessCmChange: (value: string) => void;
};

/**
 * Molecule link, sample metadata, formula fallback, and upload attribution for STXM ingestion.
 */
export function StxmIngestionContextPanel({
  linkedMolecule,
  onLinkedMoleculeChange,
  attributions,
  onAttributionsChange,
  manualFormula,
  onManualFormulaChange,
  resolvedFormula,
  sampleInfo,
  onSampleInfoChange,
  thicknessCm,
  onThicknessCmChange,
}: StxmIngestionContextPanelProps) {
  const { data: session } = useSession();
  const sessionOrcid = session?.user?.id ?? null;
  const sessionName = session?.user?.name ?? null;
  const sessionImage = session?.user?.image ?? null;

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || attributions.length > 0) {
      return;
    }
    if (!sessionOrcid) {
      return;
    }
    onAttributionsChange([
      defaultUploaderAttribution({
        orcid: sessionOrcid,
        displayName: sessionName,
        imageUrl: sessionImage,
      }),
    ]);
    setInitialized(true);
  }, [
    attributions.length,
    initialized,
    onAttributionsChange,
    sessionImage,
    sessionName,
    sessionOrcid,
  ]);

  const formulaHint = useMemo(() => {
    if (resolvedFormula) {
      return linkedMolecule
        ? `Using ${resolvedFormula} from linked molecule.`
        : `Using manual formula ${resolvedFormula}.`;
    }
    return "Link an Atlas molecule or enter a manual formula for bare atom and mass absorption.";
  }, [linkedMolecule, resolvedFormula]);

  const handleAttributionChange = useCallback(
    (rows: DatasetAttributionChange) => {
      const next =
        typeof rows === "function"
          ? rows(filterValidOrcidAttributions(attributions))
          : rows;
      onAttributionsChange(filterValidOrcidAttributions(next));
    },
    [attributions, onAttributionsChange],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <StxmMoleculeLinkSection
          linkedMolecule={linkedMolecule}
          onLinkedMoleculeChange={onLinkedMoleculeChange}
        />

        <section className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-foreground text-sm font-medium">Chemical formula</p>
          <p className="text-muted mt-1 text-xs leading-snug">{formulaHint}</p>
          <TextField
            className="mt-3"
            isDisabled={Boolean(linkedMolecule?.chemicalFormula)}
          >
            <Label>Manual formula fallback</Label>
            <Input
              value={manualFormula}
              onChange={(event) => onManualFormulaChange(event.target.value)}
              placeholder="e.g. C8H8"
            />
          </TextField>
        </section>
      </div>

      <div className="flex flex-col gap-4">
        <section className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-foreground mb-3 text-sm font-medium">Sample</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField>
              <Label>Substrate</Label>
              <Input
                value={sampleInfo.substrate}
                onChange={(event) =>
                  onSampleInfoChange({
                    ...sampleInfo,
                    substrate: event.target.value,
                  })
                }
                placeholder="e.g. Si / native oxide"
              />
            </TextField>
            <TextField>
              <Label>Thickness (cm)</Label>
              <Input
                type="number"
                step="any"
                value={thicknessCm}
                onChange={(event) => onThicknessCmChange(event.target.value)}
              />
            </TextField>
            <TextField>
              <Label>Preparation date</Label>
              <Input
                type="date"
                value={sampleInfo.preparationDate}
                onChange={(event) =>
                  onSampleInfoChange({
                    ...sampleInfo,
                    preparationDate: event.target.value,
                  })
                }
              />
            </TextField>
            <TextField className="sm:col-span-2">
              <Label>Preparation notes</Label>
              <Input
                value={sampleInfo.preparationNotes}
                onChange={(event) =>
                  onSampleInfoChange({
                    ...sampleInfo,
                    preparationNotes: event.target.value,
                  })
                }
                placeholder="Spin coat, anneal, etc."
              />
            </TextField>
          </div>
        </section>

        <section className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-foreground mb-2 text-sm font-medium">Researchers</p>
          <DatasetAttributionEditor
            attributions={attributions}
            onChange={handleAttributionChange}
            showLabel={false}
          />
        </section>
      </div>
    </div>
  );
}
