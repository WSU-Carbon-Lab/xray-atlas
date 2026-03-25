"use client";

import { useState, useEffect, useMemo } from "react";
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SimpleDialog } from "~/components/ui/dialog";
import { trpc } from "~/trpc/client";
import { toMoleculeSearchResult } from "~/lib/molecule-autosuggest";
import type { MoleculeSearchResult } from "~/features/process-nexafs/types";
import type { ExperimentTypeOption } from "~/features/process-nexafs/types";
import { EXPERIMENT_TYPE_OPTIONS } from "~/features/process-nexafs/constants";
import {
  normalizeExperimentMode,
  parseNexafsFilename,
} from "~/features/process-nexafs/utils/filenameParser";
import { AddEdgeModal } from "./add-edge-modal";

type InstrumentOption = { id: string; name: string; facilityName?: string };
type EdgeOption = { id: string; targetatom: string; corestate: string };

export type MoleculeSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (moleculeId: string) => void;
};

export function MoleculeSelectModal({
  isOpen,
  onClose,
  onSelect,
}: MoleculeSelectModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MoleculeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const term = query.trim();
    if (!term || term.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      void utils.molecules.autosuggest
        .fetch({ query: term, limit: 12 })
        .then((res) => {
          setResults((res.results ?? []).map(toMoleculeSearchResult));
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query, utils.molecules.autosuggest]);

  const handleAddNew = () => {
    window.open("/contribute/molecule", "_blank");
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Select molecule"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="relative">
          <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            placeholder="Search by formula, common name, IUPAC, CAS, or PubChem CID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            aria-label="Search molecules"
            className="border-border bg-surface focus-visible:ring-accent w-full rounded-md border py-2 pr-9 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
              aria-label="Clear molecule search"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="border-border max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
          {loading && (
            <p className="text-muted-foreground py-2 text-sm">Searching...</p>
          )}
          {!loading && query.trim().length === 0 && (
            <p className="text-muted-foreground py-2 text-sm">
              Start typing to search molecules, then choose one result.
            </p>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <p className="text-muted-foreground py-2 text-sm">
              No molecules found. Try a different search or add a new molecule.
            </p>
          )}
          {!loading &&
            results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m.id);
                  onClose();
                }}
                className="hover:bg-surface-2 focus:bg-surface-2 focus-visible:ring-accent text-foreground grid w-full grid-cols-[auto,1fr] items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2"
              >
                <span className="bg-surface-2 rounded px-2 py-1 font-mono font-semibold">
                  {m.chemicalFormula || "—"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {m.commonName || m.iupacName}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {m.iupacName}
                  </span>
                </span>
              </button>
            ))}
        </div>
        <button
          type="button"
          className="border-border bg-surface hover:bg-surface-2 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
          onClick={handleAddNew}
        >
          <PlusIcon className="h-4 w-4" />
          Add new molecule (opens in new tab)
        </button>
      </div>
    </SimpleDialog>
  );
}

export type InstrumentSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (instrumentId: string) => void;
  instruments: InstrumentOption[];
};

export function InstrumentSelectModal({
  isOpen,
  onClose,
  onSelect,
  instruments,
}: InstrumentSelectModalProps) {
  const handleAddNew = () => {
    window.open("/contribute/facility", "_blank");
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Select instrument"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Required: choose the instrument used for this dataset.
        </p>
        <div className="border-border max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
          {instruments.length === 0 && (
            <p className="text-muted-foreground py-2 text-sm">
              No instruments loaded. Add a facility and instrument first.
            </p>
          )}
          {instruments.map((inst) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => {
                onSelect(inst.id);
                onClose();
              }}
              className="hover:bg-surface-2 focus:bg-surface-2 focus-visible:ring-accent text-foreground flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2"
            >
              {inst.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="border-border bg-surface hover:bg-surface-2 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
          onClick={handleAddNew}
        >
          <PlusIcon className="h-4 w-4" />
          Add new instrument (opens in new tab)
        </button>
      </div>
    </SimpleDialog>
  );
}

export type ExperimentSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (experimentType: ExperimentTypeOption) => void;
  fileName: string;
  currentType: ExperimentTypeOption;
};

export function ExperimentSelectModal({
  isOpen,
  onClose,
  onSelect,
  fileName,
  currentType,
}: ExperimentSelectModalProps) {
  const filenameParse = useMemo(() => {
    const parsed = parseNexafsFilename(fileName);
    const raw = parsed.experimentMode?.trim() ?? null;
    const normalized = raw ? normalizeExperimentMode(raw) : null;
    const mapped =
      normalized &&
      EXPERIMENT_TYPE_OPTIONS.some((o) => o.value === normalized)
        ? (normalized as ExperimentTypeOption)
        : null;
    const mappedLabel = mapped
      ? EXPERIMENT_TYPE_OPTIONS.find((o) => o.value === mapped)?.label
      : null;
    return { raw, normalized, mapped, mappedLabel };
  }, [fileName]);

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Experiment type (detection mode)"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="border-border bg-surface-2/80 rounded-lg border px-3 py-2 text-sm">
          <p className="text-muted-foreground font-medium">From filename</p>
          <p className="text-foreground mt-1 font-mono text-xs break-all">
            {fileName || "(no file name)"}
          </p>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs">
            <li>
              Token 2 (after edge):{" "}
              <span className="text-foreground font-mono">
                {filenameParse.raw ?? "(missing)"}
              </span>
            </li>
            <li>
              Normalized to enum:{" "}
              <span className="text-foreground font-mono">
                {filenameParse.mapped ?? filenameParse.normalized ?? "—"}
              </span>
              {filenameParse.mapped && filenameParse.mappedLabel
                ? ` (${filenameParse.mappedLabel})`
                : filenameParse.raw && !filenameParse.mapped
                  ? " (not in TEY / PEY / FY / TRANS set)"
                  : ""}
            </li>
            <li>
              Currently selected:{" "}
              <span className="text-foreground font-medium">
                {
                  EXPERIMENT_TYPE_OPTIONS.find((o) => o.value === currentType)
                    ?.label
                }
              </span>
            </li>
          </ul>
        </div>
        <p className="text-muted-foreground text-sm">
          Choose the technique that matches this spectrum. This maps to
          database NEXAFS experiment kinds (TEY, PEY, FY, TRANS).
        </p>
        <div className="border-border max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
          {EXPERIMENT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                onClose();
              }}
              className="hover:bg-surface-2 focus:bg-surface-2 focus-visible:ring-accent text-foreground flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2"
            >
              <span className="font-medium">{opt.label}</span>
              <span className="text-muted-foreground font-mono text-xs">
                {opt.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    </SimpleDialog>
  );
}

export type EdgeSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (edgeId: string) => void;
  edges: EdgeOption[];
};

export function EdgeSelectModal({
  isOpen,
  onClose,
  onSelect,
  edges,
}: EdgeSelectModalProps) {
  const [showAddEdge, setShowAddEdge] = useState(false);

  const handleAddNew = () => {
    setShowAddEdge(true);
  };

  const handleEdgeCreated = (edgeId: string) => {
    onSelect(edgeId);
    onClose();
  };

  return (
    <>
      <SimpleDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Select edge"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Required: choose the absorption edge for this dataset (e.g. C K, Zn L).
          </p>
          <div className="border-border max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {edges.length === 0 && (
              <p className="text-muted-foreground py-2 text-sm">
                No edges loaded. Add an edge below.
              </p>
            )}
            {edges.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  onSelect(e.id);
                  onClose();
                }}
                className="hover:bg-surface-2 focus:bg-surface-2 focus-visible:ring-accent text-foreground flex w-full items-center rounded-md px-3 py-2 text-left font-mono text-sm transition-colors focus:outline-none focus-visible:ring-2"
              >
                {e.targetatom}({e.corestate})
              </button>
            ))}
          </div>
          <button
            type="button"
            className="border-border bg-surface hover:bg-surface-2 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
            onClick={handleAddNew}
          >
            <PlusIcon className="h-4 w-4" />
            Add new edge
          </button>
        </div>
      </SimpleDialog>
      <AddEdgeModal
        isOpen={showAddEdge}
        onClose={() => setShowAddEdge(false)}
        onEdgeCreated={handleEdgeCreated}
      />
    </>
  );
}
