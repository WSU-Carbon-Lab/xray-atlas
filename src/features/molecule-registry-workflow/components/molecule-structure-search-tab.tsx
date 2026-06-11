"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Button, Description, Spinner } from "@heroui/react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

const MoleculeContributeSketcherPanel = dynamic(
  () =>
    import("~/components/forms/molecule-contribute-sketcher-panel").then(
      (mod) => mod.MoleculeContributeSketcherPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-surface flex min-h-40 items-center justify-center rounded-lg border">
        <Spinner className="h-5 w-5" />
      </div>
    ),
  },
);

export type MoleculeStructureSearchTabProps = {
  isDark: boolean;
  onSmilesReady: (smiles: string) => void;
  lookupBusy: boolean;
};

const EXAMPLE_SMILES = "c1ccccc1";

/**
 * Structure-tab search surface: lazy mini sketcher that emits canonical SMILES
 * for the shared identifier lookup pipeline.
 */
export function MoleculeStructureSearchTab({
  isDark,
  onSmilesReady,
  lookupBusy,
}: MoleculeStructureSearchTabProps) {
  const [draftSmiles, setDraftSmiles] = useState("");
  const [sketcherVisible, setSketcherVisible] = useState(false);

  const trimmed = draftSmiles.trim();

  const handleIdentify = useCallback(() => {
    if (trimmed.length > 0) {
      onSmilesReady(trimmed);
    }
  }, [onSmilesReady, trimmed]);

  return (
    <div className="space-y-3" aria-live="polite">
      <Description className="text-muted text-sm">
        Draw to identify — we match your structure against Atlas and PubChem.
      </Description>

      {!sketcherVisible ? (
        <div className="border-border bg-default/20 flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center">
          <PencilSquareIcon className="text-accent h-8 w-8" aria-hidden />
          <p className="text-foreground text-sm font-medium">Draw to identify</p>
          <p className="text-muted max-w-sm text-xs">
            Example: benzene{" "}
            <button
              type="button"
              className="text-accent focus-visible:ring-accent font-mono underline focus:outline-none focus-visible:ring-2"
              onClick={() => {
                setDraftSmiles(EXAMPLE_SMILES);
                setSketcherVisible(true);
              }}
            >
              {EXAMPLE_SMILES}
            </button>
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onPress={() => setSketcherVisible(true)}
          >
            Open structure canvas
          </Button>
        </div>
      ) : (
        <MoleculeContributeSketcherPanel
          initialSmiles={trimmed}
          isDark={isDark}
          onSmilesChange={setDraftSmiles}
          onSnapshot={(svgMarkup, canonicalSmiles) => {
            void svgMarkup;
            const next = canonicalSmiles.trim();
            if (next.length > 0) {
              setDraftSmiles(next);
              onSmilesReady(next);
            }
          }}
        />
      )}

      {trimmed.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onPress={handleIdentify}
            isDisabled={lookupBusy}
            aria-label="Identify drawn structure"
          >
            {lookupBusy ? <Spinner className="h-4 w-4" /> : "Identify structure"}
          </Button>
          <Description className="text-muted font-mono text-xs">
            {trimmed}
          </Description>
        </div>
      ) : null}
    </div>
  );
}
