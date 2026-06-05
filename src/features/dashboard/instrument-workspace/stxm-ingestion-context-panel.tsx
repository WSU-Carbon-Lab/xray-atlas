"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { skipToken } from "@tanstack/react-query";
import {
  ErrorMessage,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";
import { NexafsSampleInformationSection } from "~/components/forms";
import {
  DatasetAttributionEditor,
  type DatasetAttributionChange,
} from "~/features/process-nexafs/ui/dataset-attribution-editor";
import { MoleculeSelectModal } from "~/features/process-nexafs/ui/descriptor-select-modals";
import type { MoleculeSearchResult } from "~/features/process-nexafs/types";
import {
  defaultUploaderAttribution,
  filterValidOrcidAttributions,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import {
  stxmSampleInfoForNexafsForm,
  type StxmSampleInfo,
} from "~/features/dashboard/lib/stxm-export-metadata";
import { trpc } from "~/trpc/client";

export type StxmIngestionContextPanelProps = {
  linkedMolecule: MoleculeSearchResult | null;
  onLinkedMoleculeChange: (molecule: MoleculeSearchResult | null) => void;
  attributions: DatasetAttributionEntry[];
  onAttributionsChange: (rows: DatasetAttributionChange) => void;
  sampleInfo: StxmSampleInfo;
  onSampleInfoChange: (info: StxmSampleInfo) => void;
  thicknessCm: string;
  onThicknessCmChange: (value: string) => void;
};

const formLabelClass =
  "mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground";

function moleculeSearchResultFromRow(row: {
  id: string;
  iupacName: string;
  name: string;
  commonName?: string[];
  InChI: string;
  SMILES: string;
  chemicalFormula: string;
  casNumber?: string | null;
  pubChemCid?: string | null;
  imageUrl?: string | null;
}): MoleculeSearchResult {
  return {
    id: row.id,
    iupacName: row.iupacName,
    commonName: row.name,
    synonyms: row.commonName ?? [],
    inchi: row.InChI,
    smiles: row.SMILES,
    chemicalFormula: row.chemicalFormula,
    casNumber: row.casNumber ?? null,
    pubChemCid: row.pubChemCid ?? null,
    imageUrl: row.imageUrl ?? undefined,
  };
}

/**
 * Molecule link, NEXAFS-style sample metadata, and upload attribution for STXM ingestion.
 */
export function StxmIngestionContextPanel({
  linkedMolecule,
  onLinkedMoleculeChange,
  attributions,
  onAttributionsChange,
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
  const [moleculeModalOpen, setMoleculeModalOpen] = useState(false);

  const utils = trpc.useUtils();
  const vendorsQuery = trpc.vendors.list.useQuery({ limit: 100 });
  const linkedMoleculeQuery = trpc.molecules.getById.useQuery(
    linkedMolecule ? { id: linkedMolecule.id } : skipToken,
  );

  const nexafsSample = useMemo(
    () => stxmSampleInfoForNexafsForm(sampleInfo),
    [sampleInfo],
  );

  const vendors = useMemo(
    () =>
      (vendorsQuery.data?.vendors ?? []).map((vendor) => ({
        id: vendor.id,
        name: vendor.name ?? "Unnamed vendor",
      })),
    [vendorsQuery.data?.vendors],
  );

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

  const handleMoleculeSelect = useCallback(
    async (moleculeId: string) => {
      const row = await utils.molecules.getById.fetch({ id: moleculeId });
      onLinkedMoleculeChange(moleculeSearchResultFromRow(row));
      setMoleculeModalOpen(false);
    },
    [onLinkedMoleculeChange, utils.molecules.getById],
  );

  const moleculeLabel = linkedMolecule
    ? (linkedMolecule.chemicalFormula ??
      linkedMolecule.commonName ??
      linkedMolecule.iupacName ??
      "Selected molecule")
    : null;

  const moleculeDetail = linkedMoleculeQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-2">
        <h2 className="text-foreground text-lg font-semibold">Dataset context</h2>
        <p className="text-muted text-sm">
          Link an Atlas molecule for bare-atom reference, sample metadata, and
          export attribution.
        </p>
      </section>

      <section className="space-y-2">
        <Label className="text-foreground text-sm font-medium">Molecule</Label>
        <button
          type="button"
          onClick={() => setMoleculeModalOpen(true)}
          className="border-border bg-surface hover:bg-default focus-visible:ring-accent w-full rounded-lg border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2"
          title="Click to select molecule (required)"
        >
          {moleculeLabel ? (
            <span className="flex flex-col gap-0.5">
              <span className="text-foreground font-mono text-sm font-semibold">
                {moleculeLabel}
              </span>
              <span className="text-muted truncate text-xs">
                {linkedMolecule?.commonName ?? linkedMolecule?.iupacName}
                {moleculeDetail?.casNumber
                  ? ` · CAS ${moleculeDetail.casNumber}`
                  : ""}
              </span>
            </span>
          ) : (
            <span className="text-warning text-sm underline decoration-dotted decoration-from-font underline-offset-2">
              Molecule (required)
            </span>
          )}
        </button>
        {!linkedMolecule ? (
          <ErrorMessage className="text-danger text-xs">
            Select an Atlas molecule to enable bare-atom reference and mass
            absorption.
          </ErrorMessage>
        ) : linkedMolecule.chemicalFormula ? (
          <p className="text-muted text-xs">
            Formula {linkedMolecule.chemicalFormula} from linked molecule.
          </p>
        ) : (
          <ErrorMessage className="text-danger text-xs">
            Linked molecule has no chemical formula on record.
          </ErrorMessage>
        )}
      </section>

      <MoleculeSelectModal
        isOpen={moleculeModalOpen}
        onClose={() => setMoleculeModalOpen(false)}
        onSelect={(id) => void handleMoleculeSelect(id)}
      />

      <NexafsSampleInformationSection
        processMethod={nexafsSample.processMethod}
        setProcessMethod={(value) =>
          onSampleInfoChange({ ...sampleInfo, processMethod: value })
        }
        substrate={nexafsSample.substrate}
        setSubstrate={(value) =>
          onSampleInfoChange({ ...sampleInfo, substrate: value })
        }
        solvent={nexafsSample.solvent}
        setSolvent={(value) =>
          onSampleInfoChange({ ...sampleInfo, solvent: value })
        }
        thickness={nexafsSample.thickness}
        setThickness={(value) =>
          onSampleInfoChange({ ...sampleInfo, thicknessNm: value })
        }
        molecularWeight={nexafsSample.molecularWeight}
        setMolecularWeight={(value) =>
          onSampleInfoChange({ ...sampleInfo, molecularWeight: value })
        }
        selectedVendorId={nexafsSample.vendorId}
        setSelectedVendorId={(value) =>
          onSampleInfoChange({ ...sampleInfo, vendorId: value })
        }
        newVendorName={nexafsSample.newVendorName}
        setNewVendorName={(value) =>
          onSampleInfoChange({ ...sampleInfo, newVendorName: value })
        }
        newVendorUrl={nexafsSample.newVendorUrl}
        setNewVendorUrl={(value) =>
          onSampleInfoChange({ ...sampleInfo, newVendorUrl: value })
        }
        vendors={vendors}
        isLoadingVendors={vendorsQuery.isLoading}
      />

      <section className="space-y-3">
        <TextField
          name="thicknessCm"
          value={thicknessCm}
          onChange={onThicknessCmChange}
          variant="secondary"
          fullWidth
        >
          <Label className={formLabelClass}>Thickness (cm) for mass absorption</Label>
          <InputGroup variant="secondary" fullWidth>
            <InputGroup.Input type="number" step="any" min={0} />
          </InputGroup>
        </TextField>
        <p className="text-muted text-xs">
          STXM mass-absorption and KK normalization use sample thickness in
          centimeters. NEXAFS sample thickness above is stored for export
          metadata in nanometers.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            name="preparationDate"
            value={sampleInfo.preparationDate}
            onChange={(value) =>
              onSampleInfoChange({ ...sampleInfo, preparationDate: value })
            }
            variant="secondary"
            fullWidth
          >
            <Label className={formLabelClass}>Preparation date</Label>
            <InputGroup variant="secondary" fullWidth>
              <InputGroup.Input type="date" />
            </InputGroup>
          </TextField>
          <TextField
            name="preparationNotes"
            value={sampleInfo.preparationNotes}
            onChange={(value) =>
              onSampleInfoChange({ ...sampleInfo, preparationNotes: value })
            }
            variant="secondary"
            fullWidth
          >
            <Label className={formLabelClass}>Preparation notes</Label>
            <InputGroup variant="secondary" fullWidth>
              <InputGroup.Input placeholder="Spin coat, anneal, etc." />
            </InputGroup>
          </TextField>
        </div>
      </section>

      <section className="space-y-2">
        <Label className="text-foreground text-sm font-medium">Researchers</Label>
        <DatasetAttributionEditor
          attributions={attributions}
          onChange={handleAttributionChange}
          showLabel={false}
        />
      </section>
    </div>
  );
}
