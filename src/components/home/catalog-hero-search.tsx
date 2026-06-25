"use client";

/**
 * Full-catalog hero search for the home page.
 *
 * On empty focus: popularity panel from `experiments.facetCounts` (portaled to
 * `document.body` so the hero `overflow-hidden` section does not clip it).
 * From two characters: grouped typeahead via `molecules.autosuggest` and
 * `experiments.searchEntities`.
 *
 * Navigation targets:
 *   - Molecule result  -> `/molecules/[slug]`
 *   - Edge result      -> `/browse/nexafs?edge=<id>`
 *   - Instrument result -> `/browse/nexafs?instrument=<id>`
 *   - Contributor      -> `/browse/nexafs?contributor=<orcid>`
 *   - Enter / submit   -> `/browse/nexafs?q=<query>`
 *
 * A Meta+K global shortcut focuses the input and opens the panel.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
} from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import { CatalogDataErrorState } from "@/components/feedback/catalog-data-error-state";
import { buildPopularitySections } from "~/components/browse/unified-search/catalog-search-popularity";
import { CatalogSearchPopularityPanel } from "~/components/browse/unified-search/catalog-search-popularity-panel";
import type { FacetField, FacetItem } from "~/components/browse/unified-search/types";
import { PortaledAnchorDropdown } from "~/components/ui/portaled-anchor-dropdown";

type MolCandidate = {
  kind: "mol";
  id: string;
  name: string;
  formula: string;
  slug: string;
};

type EdgeCandidate = {
  kind: "edge";
  id: string;
  label: string;
  count: number;
};

type InstrumentCandidate = {
  kind: "instrument";
  id: string;
  label: string;
  count: number;
};

type Candidate = MolCandidate | EdgeCandidate | InstrumentCandidate;

const SECTION_HEADING: Record<Candidate["kind"], string> = {
  mol: "Molecules",
  edge: "Edges",
  instrument: "Instruments",
};

const SECTION_HEADING_CLASS: Record<Candidate["kind"], string> = {
  mol: "text-green-600 dark:text-green-400",
  edge: "text-accent",
  instrument: "text-yellow-600 dark:text-yellow-400",
};

const SECTION_BADGE_CLASS: Record<Candidate["kind"], string> = {
  mol: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25",
  edge: "bg-[color-mix(in_oklch,var(--accent)_15%,transparent)] text-accent border-[color-mix(in_oklch,var(--accent)_30%,transparent)]",
  instrument:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/25",
};

const SECTION_BADGE_LABEL: Record<Candidate["kind"], string> = {
  mol: "Molecule",
  edge: "Edge",
  instrument: "Instrument",
};

const DROPDOWN_SHELL_CLASS =
  "border-border bg-surface shadow-surface-2 z-max max-h-[min(480px,60vh)] overflow-y-auto rounded-xl border shadow-lg";

function candidateHref(c: Candidate): string {
  if (c.kind === "mol") return `/molecules/${c.slug}`;
  if (c.kind === "edge") return `/browse/nexafs?edge=${c.id}`;
  return `/browse/nexafs?instrument=${c.id}`;
}

function popularityItemHref(field: FacetField, item: FacetItem): string {
  if (field === "mol") {
    return `/molecules/${slugifyMoleculeSynonym(item.label)}`;
  }
  if (field === "edge") {
    return `/browse/nexafs?edge=${item.id}`;
  }
  if (field === "instrument") {
    return `/browse/nexafs?instrument=${item.id}`;
  }
  return `/browse/nexafs?contributor=${encodeURIComponent(item.id)}`;
}

export interface CatalogHeroSearchProps {
  /** Input placeholder text. */
  placeholder?: string;
  /** Extra class names applied to the root container. */
  className?: string;
}

/**
 * Hero search bar that queries molecules and NEXAFS entities in parallel and
 * presents grouped typeahead results.
 *
 * @param placeholder - Text shown when the input is empty (default: "Search molecules, edges, instruments...").
 * @param className - Additional Tailwind classes for the root wrapper.
 */
export function CatalogHeroSearch({
  placeholder = "Search molecules, edges, instruments...",
  className = "",
}: CatalogHeroSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedQuery]);

  const showTypeaheadPanel = query.trim().length >= 2;
  const typeaheadEnabled = debouncedQuery.length >= 2;
  const showPopularityPanel = isOpen && !showTypeaheadPanel;

  const facetCountsQuery = trpc.experiments.facetCounts.useQuery(undefined, {
    staleTime: 300_000,
  });
  const { data: facetCounts, isLoading: facetCountsLoading, isError: facetCountsError, error: facetCountsLoadError, refetch: refetchFacetCounts } =
    facetCountsQuery;

  const popularitySections = useMemo(
    () => buildPopularitySections(facetCounts),
    [facetCounts],
  );

  const moleculesQuery = trpc.molecules.autosuggest.useQuery(
    { query: debouncedQuery, limit: 4 },
    { enabled: typeaheadEnabled, staleTime: 60_000 },
  );
  const { data: molData, isLoading: molLoading, isError: molError, error: molLoadError, refetch: refetchMolecules } =
    moleculesQuery;

  const entitiesQuery = trpc.experiments.searchEntities.useQuery(
    { query: debouncedQuery, limitPerGroup: 3 },
    { enabled: typeaheadEnabled, staleTime: 60_000 },
  );
  const { data: entityData, isLoading: entityLoading, isError: entityError, error: entityLoadError, refetch: refetchEntities } =
    entitiesQuery;

  const isTypeaheadLoading =
    typeaheadEnabled && (molLoading || entityLoading);

  const dropdownLoadError = showPopularityPanel
    ? facetCountsError
      ? facetCountsLoadError
      : null
    : typeaheadEnabled && (molError || entityError)
      ? (molLoadError ?? entityLoadError)
      : null;

  const handleDropdownRetry = useCallback(() => {
    if (showPopularityPanel) {
      void refetchFacetCounts();
      return;
    }
    if (typeaheadEnabled) {
      void refetchMolecules();
      void refetchEntities();
    }
  }, [
    refetchEntities,
    refetchFacetCounts,
    refetchMolecules,
    showPopularityPanel,
    typeaheadEnabled,
  ]);

  const candidates = useMemo<Candidate[]>(() => {
    if (!typeaheadEnabled) return [];
    const out: Candidate[] = [];

    if (molData?.results) {
      for (const item of molData.results) {
        const name = item.commonName || item.iupacName;
        out.push({
          kind: "mol",
          id: item.id,
          name,
          formula: item.chemicalFormula,
          slug: slugifyMoleculeSynonym(name || "molecule"),
        });
      }
    }

    if (entityData?.edges) {
      for (const e of entityData.edges) {
        out.push({ kind: "edge", id: e.id, label: e.label, count: e.count });
      }
    }

    if (entityData?.instruments) {
      for (const i of entityData.instruments) {
        out.push({
          kind: "instrument",
          id: i.id,
          label: i.label,
          count: i.count,
        });
      }
    }

    return out;
  }, [typeaheadEnabled, molData, entityData]);

  const sectionBreakSet = useMemo<Set<number>>(() => {
    const s = new Set<number>();
    let prev: Candidate["kind"] | null = null;
    candidates.forEach((c, i) => {
      if (c.kind !== prev) {
        s.add(i);
        prev = c.kind;
      }
    });
    return s;
  }, [candidates]);

  const showDropdown = isOpen;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setHighlightedIndex(-1);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k" &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigate = useCallback(
    (c: Candidate) => {
      router.push(candidateHref(c));
      setIsOpen(false);
      setQuery("");
      setDebouncedQuery("");
    },
    [router],
  );

  const navigatePopularity = useCallback(
    (field: FacetField, item: FacetItem) => {
      router.push(popularityItemHref(field, item));
      setIsOpen(false);
      setQuery("");
      setDebouncedQuery("");
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!showTypeaheadPanel || candidates.length === 0) return;
        setHighlightedIndex((i) => Math.min(i + 1, candidates.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const c = highlightedIndex >= 0 ? candidates[highlightedIndex] : null;
        if (c) {
          navigate(c);
        } else if (query.trim()) {
          router.push(
            `/browse/nexafs?q=${encodeURIComponent(query.trim())}`,
          );
          setIsOpen(false);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setQuery("");
        setDebouncedQuery("");
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
      }
    },
    [
      showTypeaheadPanel,
      candidates,
      highlightedIndex,
      navigate,
      query,
      router,
    ],
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className={[
          "border-border bg-surface flex min-h-[3rem] w-full items-center gap-2 rounded-lg border px-4 transition-shadow",
          isOpen ? "ring-accent ring-2 ring-offset-0" : "",
        ].join(" ")}
        onClick={() => inputRef.current?.focus()}
      >
        <MagnifyingGlassIcon
          className="text-muted h-5 w-5 shrink-0"
          aria-hidden
        />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-label="Search catalog"
          aria-keyshortcuts="Meta+K"
          aria-activedescendant={
            highlightedIndex >= 0 && candidates[highlightedIndex]
              ? `hero-candidate-${highlightedIndex}`
              : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="text-foreground placeholder:text-muted min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
        />

        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clearSearch}
            className="text-muted hover:text-foreground focus-visible:ring-accent shrink-0 rounded p-0.5 focus:outline-none focus-visible:ring-1"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden />
          </button>
        ) : !isOpen ? (
          <kbd
            className="border-border bg-default text-muted flex shrink-0 items-center gap-0.5 rounded-md border px-2 py-1 font-sans text-[11px] font-medium tabular-nums shadow-sm"
            aria-hidden
          >
            <span>&#8984;</span>
            <span>K</span>
          </kbd>
        ) : null}
      </div>

      <PortaledAnchorDropdown
        anchorRef={containerRef}
        isOpen={showDropdown}
        dropdownRef={dropdownRef}
        className={DROPDOWN_SHELL_CLASS}
      >
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
        >
          {dropdownLoadError ? (
            <CatalogDataErrorState
              error={dropdownLoadError}
              title="Catalog search unavailable"
              compact
              className="mx-2 my-3 border-dashed shadow-none"
              onRetry={handleDropdownRetry}
            />
          ) : showPopularityPanel ? (
            <CatalogSearchPopularityPanel
              sections={popularitySections}
              variant="home"
              isLoading={facetCountsLoading}
              onSelectItem={navigatePopularity}
            />
          ) : (isTypeaheadLoading ||
              (showTypeaheadPanel && !typeaheadEnabled)) &&
            candidates.length === 0 ? (
            <div className="py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <div className="bg-muted/40 h-3.5 w-16 animate-pulse rounded" />
                  <div className="bg-muted/30 h-3.5 flex-1 animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : showTypeaheadPanel && candidates.length > 0 ? (
            <div className="py-1">
              {candidates.map((c, i) => (
                <div key={`${c.kind}-${c.id}`}>
                  {sectionBreakSet.has(i) ? (
                    <p
                      className={[
                        "mt-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide",
                        SECTION_HEADING_CLASS[c.kind],
                      ].join(" ")}
                    >
                      {SECTION_HEADING[c.kind]}
                    </p>
                  ) : null}
                  <button
                    id={`hero-candidate-${i}`}
                    role="option"
                    aria-selected={i === highlightedIndex}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(i)}
                    onClick={() => navigate(c)}
                    className={[
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      i === highlightedIndex
                        ? "bg-accent/10"
                        : "hover:bg-default",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium",
                        SECTION_BADGE_CLASS[c.kind],
                      ].join(" ")}
                    >
                      {SECTION_BADGE_LABEL[c.kind]}
                    </span>

                    {c.kind === "mol" ? (
                      <span className="flex min-w-0 flex-1 items-baseline gap-2">
                        <span className="text-foreground truncate font-medium">
                          {c.name}
                        </span>
                        {c.formula ? (
                          <span className="text-muted shrink-0 text-xs">
                            {c.formula}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-foreground min-w-0 flex-1 truncate">
                        {c.label}
                      </span>
                    )}

                    {c.kind !== "mol" ? (
                      <span className="text-muted shrink-0 tabular-nums text-xs">
                        {c.count}
                      </span>
                    ) : null}
                  </button>
                </div>
              ))}

              <div className="border-border border-t px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    router.push(
                      `/browse/nexafs?q=${encodeURIComponent(query.trim())}`,
                    );
                    setIsOpen(false);
                  }}
                  className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
                >
                  Search all NEXAFS for &ldquo;{query}&rdquo; &rarr;
                </button>
              </div>
            </div>
          ) : showTypeaheadPanel ? (
            <div className="text-muted px-4 py-6 text-center text-sm">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </div>
          ) : null}
        </div>
      </PortaledAnchorDropdown>
    </div>
  );
}
