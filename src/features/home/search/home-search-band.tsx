"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@heroui/react";
import type { ExperimentType } from "~/prisma/browser";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import { HOME_SNAPSHOT } from "../snapshot/home-snapshot.generated";
import type { HomeEdgeOption } from "../snapshot/types";
import { buildBrowseHref } from "./build-browse-href";
import { PeriodicStrip } from "./periodic-strip";
import { SearchIcon } from "~/components/icons";
import { trpc } from "~/trpc/client";

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

const MAX_SUGGESTIONS = 6;
const MIN_QUERY_CHARS = 2;
const SUGGEST_DEBOUNCE_MS = 200;

interface Suggestion {
  id: string;
  name: string;
  href: string;
  formula: string;
  imageUrl: string | null;
  datasetCount: number | null;
}

const FEATURED: readonly Suggestion[] = HOME_SNAPSHOT.molecules.map((m) => ({
  id: m.id,
  name: m.name,
  href: `/molecules/${m.slug}`,
  formula: m.formula,
  imageUrl: m.imageUrl,
  datasetCount: m.datasetCount,
}));

const DATASET_COUNT_BY_ID = new Map(
  HOME_SNAPSHOT.molecules.map((m) => [m.id, m.datasetCount]),
);

function datasetLabel(count: number): string {
  return `${count} ${count === 1 ? "dataset" : "datasets"}`;
}

function edgeSummary(edges: readonly HomeEdgeOption[]): string {
  if (edges.length === 0) return "Any";
  if (edges.length === 1) return edges[0]!.label;
  return `${edges.length} edges`;
}

function PeriodicGlyph(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect
        x="9"
        y="1"
        width="6"
        height="6"
        rx="1.2"
        fill="currentColor"
        opacity="0.4"
      />
      <rect
        x="1"
        y="9"
        width="6"
        height="6"
        rx="1.2"
        fill="currentColor"
        opacity="0.4"
      />
      <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
    </svg>
  );
}

const filterButtonClass =
  "border-border bg-background text-foreground hover:border-accent/60 focus-visible:ring-accent/50 flex h-14 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none";

/** One molecule row: structure image, name, formula, and dataset count when known. */
function SearchResultRow({ row }: { row: Suggestion }): ReactElement {
  return (
    <li>
      <Link href={row.href} className="home-result">
        <span className="home-result__image">
          {row.imageUrl ? (
            <MoleculeImageSVG
              imageUrl={row.imageUrl}
              name={row.name}
              className="home-mol-glyph"
              fallback={
                <span className="text-muted truncate text-[0.625rem]">
                  {row.formula}
                </span>
              }
            />
          ) : (
            <span className="text-muted truncate text-[0.625rem]">
              {row.formula}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-foreground block truncate text-sm font-semibold">
            {row.name}
          </span>
          <span className="text-muted block truncate font-mono text-xs">
            {row.formula}
          </span>
        </span>
        {row.datasetCount != null ? (
          <span className="text-muted shrink-0 text-xs tabular-nums">
            {datasetLabel(row.datasetCount)}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/**
 * Home search on one line: text field, absorption edges, and collection
 * method. Molecule matches open in an overlay under the field and do not
 * change the height of the row. Submits to NEXAFS browse.
 */
export function HomeSearchBand(): ReactElement {
  const router = useRouter();
  const fieldRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [edges, setEdges] = useState<readonly HomeEdgeOption[]>([]);
  const [mode, setMode] = useState<ExperimentType | undefined>(undefined);
  const [focused, setFocused] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      SUGGEST_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [query]);
  const live = trpc.molecules.autosuggest.useQuery(
    { query: debouncedQuery, limit: MAX_SUGGESTIONS },
    {
      enabled: focused && debouncedQuery.length >= MIN_QUERY_CHARS,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const suggestions = useMemo((): Suggestion[] => {
    const q = query.trim().toLowerCase();
    if (q.length < MIN_QUERY_CHARS) return [];
    const featured = FEATURED.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.formula.toLowerCase().includes(q),
    );
    const seen = new Set(featured.map((m) => m.id));
    const fresh =
      debouncedQuery.toLowerCase() === q ? (live.data?.results ?? []) : [];
    const liveMatches: Suggestion[] = fresh
      .filter((r) => !seen.has(r.id))
      .map((r) => ({
        id: r.id,
        name: r.commonName,
        href: `/molecules/${r.id}`,
        formula: r.chemicalFormula,
        imageUrl: r.imageUrl ?? null,
        datasetCount: DATASET_COUNT_BY_ID.get(r.id) ?? null,
      }));
    return [...featured, ...liveMatches].slice(0, MAX_SUGGESTIONS);
  }, [query, debouncedQuery, live.data]);

  useEffect(() => {
    if (!focused) return;
    const close = (event: PointerEvent): void => {
      const target = event.target;
      if (
        target instanceof Node &&
        fieldRef.current &&
        !fieldRef.current.contains(target)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [focused]);

  const toggleEdge = (e: HomeEdgeOption): void =>
    setEdges((cur) =>
      cur.some((c) => c.edgeId === e.edgeId)
        ? cur.filter((c) => c.edgeId !== e.edgeId)
        : [...cur, e],
    );

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

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <form
      id="home-search-form"
      role="search"
      onSubmit={submit}
      className="home-search"
    >
      <div
        ref={fieldRef}
        className="relative w-full min-w-0 sm:min-w-48 sm:flex-1"
      >
        <label className="home-search__field">
          <SearchIcon className="text-muted size-5 shrink-0" aria-hidden />
          <Input
            aria-label="Search molecules, formulas, and spectra"
            aria-expanded={showSuggestions}
            aria-controls="home-search-results"
            placeholder="Search molecules, formulas, instruments…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            className="text-lg"
          />
        </label>
        {showSuggestions ? (
          <ul
            id="home-search-results"
            className="home-search__results"
            aria-label="Matching molecules"
            onMouseDown={(event) => event.preventDefault()}
          >
            {suggestions.map((row) => (
              <SearchResultRow key={row.id} row={row} />
            ))}
          </ul>
        ) : null}
      </div>
      <PopoverMenu
        placement="bottom-end"
        align="end"
        renderTrigger={({ triggerProps }) => (
          <button
            {...triggerProps}
            className={filterButtonClass}
            aria-label="Absorption edge"
          >
            <PeriodicGlyph />
            <span className="text-muted">Edge</span>
            <span className="font-medium">{edgeSummary(edges)}</span>
          </button>
        )}
        renderContent={({ contentProps }) => (
          <PopoverMenuContent
            {...contentProps}
            className="w-[min(22rem,calc(100vw-2rem))] p-3"
          >
            <PeriodicStrip
              edges={HOME_SNAPSHOT.edges}
              selected={edges.map((e) => e.edgeId)}
              onToggle={toggleEdge}
            />
          </PopoverMenuContent>
        )}
      />
      <PopoverMenu
        placement="bottom-end"
        align="end"
        renderTrigger={({ triggerProps }) => (
          <button
            {...triggerProps}
            className={filterButtonClass}
            aria-label="Collection method"
          >
            <span className="text-muted">Collection</span>
            <span className="font-medium">
              {MODES.find((m) => m.value === mode)?.token ?? "Any"}
            </span>
          </button>
        )}
        renderContent={({ close, contentProps }) => (
          <PopoverMenuContent
            {...contentProps}
            className="w-[min(18rem,calc(100vw-2rem))] p-1"
          >
            <ul className="flex flex-col">
              {MODES.map((m) => (
                <li key={m.token}>
                  <button
                    type="button"
                    aria-pressed={mode === m.value}
                    className={
                      mode === m.value
                        ? "bg-accent/10 text-accent flex w-full flex-col rounded-lg px-3 py-2 text-left"
                        : "hover:bg-default flex w-full flex-col rounded-lg px-3 py-2 text-left"
                    }
                    onClick={() => {
                      setMode((cur) => (cur === m.value ? undefined : m.value));
                      close();
                    }}
                  >
                    <span className="text-sm font-medium">{m.token}</span>
                    <span className="text-muted text-xs">{m.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </PopoverMenuContent>
        )}
      />
      <Button type="submit" variant="primary" className="h-14 shrink-0">
        Search
      </Button>
    </form>
  );
}
