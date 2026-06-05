"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Input, Label, TextField } from "@heroui/react";
import {
  DatasetAttributionEditor,
  type DatasetAttributionChange,
} from "~/features/process-nexafs/ui/dataset-attribution-editor";
import {
  defaultUploaderAttribution,
  filterValidOrcidAttributions,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import { trpc } from "~/trpc/client";
import { ExperimentLinkCard } from "./experiment-link-card";

export type StxmIngestionContextPanelProps = {
  sessionId: string;
  linkedExperiment: {
    id: string;
    canonicalSlug: string | null;
    instrumentName: string | null;
    moleculeLabel: string | null;
    browseHref: string;
    contributeHref: string;
  } | null;
  attributions: DatasetAttributionEntry[];
  onAttributionsChange: (rows: DatasetAttributionChange) => void;
  manualFormula: string;
  onManualFormulaChange: (value: string) => void;
  resolvedFormula: string | null;
  onSessionRefresh: () => void;
};

/**
 * Molecule link, formula fallback, and upload attribution for STXM ingestion export prep.
 */
export function StxmIngestionContextPanel({
  sessionId,
  linkedExperiment,
  attributions,
  onAttributionsChange,
  manualFormula,
  onManualFormulaChange,
  resolvedFormula,
  onSessionRefresh,
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

  const moleculeQuery = trpc.experiments.moleculeFormulaForExperiment.useQuery(
    { experimentId: linkedExperiment?.id ?? "" },
    { enabled: Boolean(linkedExperiment?.id) },
  );

  const formulaHint = useMemo(() => {
    if (moleculeQuery.isLoading) {
      return "Loading formula from linked experiment.";
    }
    if (resolvedFormula) {
      return linkedExperiment
        ? `Using ${resolvedFormula} from linked molecule.`
        : `Using manual formula ${resolvedFormula}.`;
    }
    return "Link an Atlas experiment or enter a manual formula for bare atom and mass absorption.";
  }, [linkedExperiment, moleculeQuery.isLoading, resolvedFormula]);

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
    <div className="flex flex-col gap-4">
      <ExperimentLinkCard
        sessionId={sessionId}
        linkedExperiment={linkedExperiment}
        onLinked={onSessionRefresh}
      />

      <section className="border-border bg-surface rounded-lg border px-4 py-3">
        <p className="text-foreground text-sm font-medium">Chemical formula</p>
        <p className="text-muted mt-1 text-xs leading-snug">{formulaHint}</p>
        <TextField
          className="mt-3"
          isDisabled={Boolean(linkedExperiment && moleculeQuery.data?.chemicalFormula)}
        >
          <Label>Manual formula fallback</Label>
          <Input
            value={manualFormula}
            onChange={(event) => onManualFormulaChange(event.target.value)}
            placeholder="e.g. C8H8"
          />
        </TextField>
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
  );
}
