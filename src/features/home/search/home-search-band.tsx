"use client";

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@heroui/react";
import type { ExperimentType } from "~/prisma/browser";
import dynamic from "next/dynamic";
import type { EdgeOption } from "~/components/browse/unified-search/periodic-edge-modal";
import { HOME_SNAPSHOT } from "../snapshot/home-snapshot.generated";
import type { HomeEdgeOption } from "../snapshot/types";
import { buildBrowseHref } from "./build-browse-href";
import { PeriodicStrip } from "./periodic-strip";

const PeriodicEdgeModal = dynamic(
  () =>
    import("~/components/browse/unified-search/periodic-edge-modal").then(
      (m) => m.PeriodicEdgeModal,
    ),
  { ssr: false },
);

const MODES: ReadonlyArray<{
  token: string;
  value: ExperimentType;
  label: string;
}> = [
  {
    token: "TEY",
    value: "TOTAL_ELECTRON_YIELD",
    label: "Total electron yield",
  },
  {
    token: "PEY",
    value: "PARTIAL_ELECTRON_YIELD",
    label: "Partial electron yield",
  },
  { token: "FY", value: "FLUORESCENT_YIELD", label: "Fluorescence yield" },
  { token: "TRANS", value: "TRANSMISSION", label: "Transmission" },
];

const MODAL_EDGES: EdgeOption[] = HOME_SNAPSHOT.edges.map((e) => ({
  id: e.edgeId,
  targetatom: e.symbol,
  corestate: e.label.slice(e.symbol.length).trim(),
}));

/** Home search: free text, edge picks from the periodic strip, one detection mode; submits to NEXAFS browse. */
export function HomeSearchBand(): ReactElement {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [edges, setEdges] = useState<readonly HomeEdgeOption[]>([]);
  const [mode, setMode] = useState<ExperimentType | undefined>(undefined);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableMounted, setTableMounted] = useState(false);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return HOME_SNAPSHOT.molecules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.formula.toLowerCase().includes(q),
    );
  }, [query]);

  const toggleEdge = (e: HomeEdgeOption): void =>
    setEdges((cur) =>
      cur.some((c) => c.edgeId === e.edgeId)
        ? cur.filter((c) => c.edgeId !== e.edgeId)
        : [...cur, e],
    );

  const setEdgeIds = (ids: string[]): void =>
    setEdges(HOME_SNAPSHOT.edges.filter((e) => ids.includes(e.edgeId)));

  const submit = (ev: FormEvent<HTMLFormElement>): void => {
    ev.preventDefault();
    router.push(
      buildBrowseHref({
        query,
        edgeIds: edges.map((e) => e.edgeId),
        experimentType: mode,
      }),
    );
  };

  return (
    <form role="search" onSubmit={submit} className="home-search">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Search molecules, formulas, and spectra"
          placeholder="Search molecules, formulas, instruments…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary">
          Search the Atlas
        </Button>
      </div>
      {suggestions.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Featured matches">
          {suggestions.map((m) => (
            <li key={m.id}>
              <Link className="home-chip" href={`/molecules/${m.slug}`}>
                {m.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <PeriodicStrip
        edges={HOME_SNAPSHOT.edges}
        selected={edges.map((e) => e.edgeId)}
        onToggle={toggleEdge}
      />
      <div
        role="group"
        aria-label="Detection mode"
        className="flex flex-wrap items-center gap-2"
      >
        {MODES.map((m) => (
          <button
            key={m.token}
            type="button"
            title={m.label}
            aria-label={m.label}
            aria-pressed={mode === m.value}
            onClick={() =>
              setMode((cur) => (cur === m.value ? undefined : m.value))
            }
            className={
              mode === m.value
                ? "home-chip border-accent text-accent"
                : "home-chip"
            }
          >
            {m.token}
          </button>
        ))}
        <button
          type="button"
          className="home-chip"
          onClick={() => {
            setTableMounted(true);
            setTableOpen(true);
          }}
        >
          Full table
        </button>
        {edges.map((e) => (
          <button
            key={e.edgeId}
            type="button"
            className="home-chip border-accent text-accent"
            onClick={() => toggleEdge(e)}
            aria-label={`Remove ${e.label} edge`}
          >
            {e.label} ×
          </button>
        ))}
      </div>
      {tableMounted && (
        <PeriodicEdgeModal
          isOpen={tableOpen}
          onClose={() => setTableOpen(false)}
          edges={MODAL_EDGES}
          selectedEdgeIds={edges.map((e) => e.edgeId)}
          onChange={setEdgeIds}
        />
      )}
    </form>
  );
}
