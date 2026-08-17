"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
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
import {
  bandOverlapsSpectrum,
  classifyEdgePickerSection,
  compareEdgePickerRows,
  EDGE_PICKER_SECTION_LABELS,
  EDGE_PICKER_SECTION_ORDER,
  edgeBandFeasibilityScore,
  edgeCatalogPriorityRank,
  edgeEnergyTypicalRangeHint,
  edgeLabelFromAtomCore,
  typicalBandForEdgeLabel,
  type EdgePickerSectionId,
  type TypicalEdgeEnergyBand,
} from "~/lib/nexafs/edge-energy-bands";
import { cn } from "@heroui/styles";

type InstrumentOption = { id: string; name: string; facilityName?: string };
type EdgeOption = { id: string; targetatom: string; corestate: string };

type RankedEdgeRow = {
  edge: EdgeOption;
  compatible: boolean | null;
  band: TypicalEdgeEnergyBand | null;
  feasibility: number;
  catalogPriority: number;
  index: number;
  section: EdgePickerSectionId | null;
  inAtlasCatalog: boolean;
};

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
  /** When set, shows filename-token parse hints (contribute upload). Omit on browse edit. */
  fileName?: string;
  currentType: ExperimentTypeOption | null;
};

export function ExperimentSelectModal({
  isOpen,
  onClose,
  onSelect,
  fileName,
  currentType,
}: ExperimentSelectModalProps) {
  const showFilenameHints = Boolean(fileName && fileName.trim().length > 0);
  const filenameParse = useMemo(() => {
    if (!showFilenameHints || !fileName) {
      return null;
    }
    const parsed = parseNexafsFilename(fileName);
    const raw = parsed.experimentMode?.trim() ?? null;
    const normalized = raw ? normalizeExperimentMode(raw) : null;
    const mapped =
      normalized && EXPERIMENT_TYPE_OPTIONS.some((o) => o.value === normalized)
        ? (normalized as ExperimentTypeOption)
        : null;
    const mappedLabel = mapped
      ? EXPERIMENT_TYPE_OPTIONS.find((o) => o.value === mapped)?.label
      : null;
    return { raw, normalized, mapped, mappedLabel };
  }, [fileName, showFilenameHints]);

  const currentLabel =
    currentType != null
      ? EXPERIMENT_TYPE_OPTIONS.find((o) => o.value === currentType)?.label
      : null;

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Experiment type (detection mode)"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {filenameParse ? (
          <div className="border-border bg-surface-2/80 rounded-lg border px-3 py-2 text-sm">
            <p className="text-muted-foreground font-medium">From filename</p>
            <p className="text-foreground mt-1 font-mono text-xs break-all">
              {fileName}
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
                  {currentLabel ?? "Not set"}
                </span>
              </li>
            </ul>
          </div>
        ) : null}
        <p className="text-muted-foreground text-sm">
          Choose the technique that matches this spectrum. This maps to database
          NEXAFS experiment kinds (TEY, PEY, FY, TRANS).
          {currentLabel ? (
            <>
              {" "}
              Current:{" "}
              <span className="text-foreground font-medium">
                {currentLabel}
              </span>
              .
            </>
          ) : null}
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
  /** Lowest finite spectrum energy (eV) for ranking / hints; omit when unknown. */
  spectrumEnergyMin?: number | null;
  /** Highest finite spectrum energy (eV) for ranking / hints; omit when unknown. */
  spectrumEnergyMax?: number | null;
};

export function EdgeSelectModal({
  isOpen,
  onClose,
  onSelect,
  edges,
  spectrumEnergyMin = null,
  spectrumEnergyMax = null,
}: EdgeSelectModalProps) {
  const [showAddEdge, setShowAddEdge] = useState(false);

  const catalogStatsQuery = trpc.experiments.edgeCatalogStats.useQuery(
    undefined,
    { enabled: isOpen, staleTime: 60_000 },
  );

  const atlasEdgeIds = useMemo(() => {
    const rows = catalogStatsQuery.data?.edgesInCatalog ?? [];
    return new Set(rows.map((row) => row.id));
  }, [catalogStatsQuery.data?.edgesInCatalog]);

  const spectrumExtent = useMemo(() => {
    if (
      spectrumEnergyMin === null ||
      spectrumEnergyMax === null ||
      spectrumEnergyMin === undefined ||
      spectrumEnergyMax === undefined ||
      !Number.isFinite(spectrumEnergyMin) ||
      !Number.isFinite(spectrumEnergyMax)
    ) {
      return null;
    }
    return {
      minEv: spectrumEnergyMin,
      maxEv: spectrumEnergyMax,
      midEv: (spectrumEnergyMin + spectrumEnergyMax) / 2,
    };
  }, [spectrumEnergyMin, spectrumEnergyMax]);

  const rankedEdges = useMemo((): RankedEdgeRow[] => {
    const ranked = edges.map((edge, index) => {
      const band = typicalBandForEdgeLabel(
        edgeLabelFromAtomCore(edge.targetatom, edge.corestate),
      );
      const inAtlasCatalog = atlasEdgeIds.has(edge.id);
      const compatible = spectrumExtent
        ? band === null
          ? true
          : bandOverlapsSpectrum(band, spectrumExtent)
        : null;
      const feasibility =
        spectrumExtent && band
          ? edgeBandFeasibilityScore(band, spectrumExtent)
          : 0;
      return {
        edge,
        compatible,
        band,
        feasibility,
        catalogPriority: edgeCatalogPriorityRank(
          edge.targetatom,
          edge.corestate,
        ),
        index,
        section: classifyEdgePickerSection({ compatible, inAtlasCatalog }),
        inAtlasCatalog,
      };
    });

    return ranked.sort((a, b) => {
      if (a.section !== null && b.section !== null && a.section !== b.section) {
        return (
          EDGE_PICKER_SECTION_ORDER.indexOf(a.section) -
          EDGE_PICKER_SECTION_ORDER.indexOf(b.section)
        );
      }
      if (a.section === null && b.section === null) {
        if (a.inAtlasCatalog !== b.inAtlasCatalog) {
          return a.inAtlasCatalog ? -1 : 1;
        }
      }
      return compareEdgePickerRows(a, b);
    });
  }, [atlasEdgeIds, edges, spectrumExtent]);

  const edgeSections = useMemo(() => {
    const useSections = rankedEdges.some((row) => row.section !== null);
    if (!useSections) {
      return [
        {
          id: null as EdgePickerSectionId | null,
          label: null as string | null,
          rows: rankedEdges,
        },
      ].filter((section) => section.rows.length > 0);
    }
    return EDGE_PICKER_SECTION_ORDER.map((sectionId) => ({
      id: sectionId,
      label: EDGE_PICKER_SECTION_LABELS[sectionId],
      rows: rankedEdges.filter((row) => row.section === sectionId),
    })).filter((section) => section.rows.length > 0);
  }, [rankedEdges]);

  const handleAddNew = () => {
    setShowAddEdge(true);
  };

  const handleEdgeCreated = (edgeId: string) => {
    onSelect(edgeId);
    onClose();
  };

  const handlePickEdge = (edgeId: string, compatible: boolean | null) => {
    if (compatible === false) {
      const confirmed = window.confirm(
        "This edge is outside the typical CXRO energy window for the uploaded spectrum. Use it anyway?",
      );
      if (!confirmed) {
        return;
      }
    }
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
            Choose the absorption edge for this dataset
            {spectrumExtent
              ? ` (~${Math.round(spectrumExtent.minEv)}–${Math.round(spectrumExtent.maxEv)} eV).`
              : "."}
          </p>
          <div className="border-border max-h-64 overflow-y-auto rounded-lg border p-1.5">
            {rankedEdges.length === 0 ? (
              <p className="text-muted-foreground px-2 py-2 text-sm">
                No edges loaded. Add an edge below.
              </p>
            ) : (
              edgeSections.map((section, sectionIndex) => (
                <div key={section.id ?? "all"} className="min-w-0">
                  {section.label ? (
                    <div
                      className={cn(
                        "text-muted px-2.5 pb-1 text-[11px] font-semibold tracking-wide uppercase",
                        sectionIndex === 0 ? "pt-1.5" : "pt-3",
                      )}
                    >
                      {section.label}
                    </div>
                  ) : null}
                  <div className="space-y-0.5">
                    {section.rows.map(
                      ({ edge: e, compatible, band, section: rowSection }) => {
                        const label = `${e.targetatom}(${e.corestate})`;
                        const hint =
                          band != null
                            ? edgeEnergyTypicalRangeHint(band)
                            : null;
                        const isFeasibleMatch =
                          compatible === true &&
                          (rowSection === "in-atlas" ||
                            rowSection === "matches");
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => handlePickEdge(e.id, compatible)}
                            className={cn(
                              "focus-visible:ring-accent text-foreground flex w-full flex-col items-start rounded-md px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2",
                              isFeasibleMatch
                                ? "border-accent/40 bg-accent/10 hover:bg-accent/15 border"
                                : "hover:bg-surface-2 focus:bg-surface-2",
                            )}
                          >
                            <span
                              className={cn(
                                "font-mono text-sm",
                                isFeasibleMatch && "font-medium",
                              )}
                            >
                              {label}
                            </span>
                            {hint ? (
                              <span className="text-muted-foreground mt-0.5 text-xs">
                                {hint}
                              </span>
                            ) : null}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ))
            )}
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
