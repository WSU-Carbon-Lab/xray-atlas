"use client";

/**
 * URL-synchronized multi-select facet state for the unified NEXAFS search bar.
 *
 * Reads initial state from `URLSearchParams` via `readFacetParams` and
 * `readNexafsCatalogFilterParams`, mirrors every change back to the URL via
 * `router.replace` (no scroll), and debounces the free-text query (300 ms).
 * Resetting any filter or clearing all filters resets the page to 1.
 */

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ExperimentType } from "~/prisma/browser";
import {
  EXPERIMENT_TYPE_LABELS,
  VERIFICATION_SOURCE_LABELS,
  type VerificationSource,
} from "../nexafs-browse-experiment-utils";
import {
  readFacetParams,
  writeFacetParams,
  emptyFacetSelection,
  readNexafsCatalogFilterParams,
  writeNexafsCatalogFilterParams,
  emptyNexafsCatalogFilters,
} from "./url-state";
import type {
  CatalogToken,
  FacetData,
  FacetField,
  FacetSelection,
  NexafsCatalogFilters,
} from "./types";

export interface UseFacetSelectionOptions {
  basePath: string;
  /** When set, the molecule facet is locked to this id and hidden from the URL. */
  lockedMoleculeId?: string;
  /** Facet label data used to resolve token display names. */
  facetData?: FacetData | null;
}

export interface UseFacetSelectionReturn {
  selection: FacetSelection;
  catalogFilters: NexafsCatalogFilters;
  tokens: CatalogToken[];
  query: string;
  debouncedQuery: string;
  urlSynced: boolean;
  setQuery: (q: string) => void;
  add: (field: FacetField, id: string) => void;
  remove: (field: CatalogToken["field"], id: string) => void;
  toggle: (field: FacetField, id: string) => void;
  clearField: (field: FacetField) => void;
  clearAll: () => void;
  setExperimentType: (value: ExperimentType | undefined) => void;
  setVerifiedOnly: (value: boolean) => void;
  setVerificationSource: (source: VerificationSource) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

function resolveLabel(
  field: FacetField,
  id: string,
  facetData?: FacetData | null,
): string {
  if (!facetData) return id;
  const list =
    field === "edge"
      ? facetData.edges
      : field === "instrument"
        ? facetData.instruments
        : field === "mol"
          ? facetData.molecules
          : facetData.contributors;
  return list.find((item) => item.id === id)?.label ?? id;
}

function catalogFilterTokens(filters: NexafsCatalogFilters): CatalogToken[] {
  const out: CatalogToken[] = [];
  if (filters.experimentType) {
    out.push({
      field: "acquisition",
      id: filters.experimentType,
      label:
        EXPERIMENT_TYPE_LABELS[filters.experimentType] ?? filters.experimentType,
    });
  }
  if (filters.verifiedOnly) {
    out.push({
      field: "verification",
      id: filters.verificationSource,
      label: VERIFICATION_SOURCE_LABELS[filters.verificationSource],
    });
  }
  return out;
}

/**
 * Manages facet selection and catalog filters synchronized to the browser URL.
 *
 * @param options.basePath - Path prefix used when constructing the push URL.
 * @param options.lockedMoleculeId - Molecule id locked by the embed context; excluded from URL.
 * @param options.facetData - Label data for token display; may be `null` while loading.
 */
export function useFacetSelection({
  basePath,
  lockedMoleculeId,
  facetData,
}: UseFacetSelectionOptions): UseFacetSelectionReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlKey = searchParams.toString();

  const [urlSynced, setUrlSynced] = useState(false);
  const [selection, setSelection] = useState<FacetSelection>(emptyFacetSelection);
  const [catalogFilters, setCatalogFilters] = useState<NexafsCatalogFilters>(
    emptyNexafsCatalogFilters,
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const isMounted = useRef(false);

  useLayoutEffect(() => {
    const sp = new URLSearchParams(urlKey);
    const parsed = readFacetParams(sp);
    if (lockedMoleculeId) {
      parsed.mol = [lockedMoleculeId];
    }
    setSelection(parsed);
    setCatalogFilters(readNexafsCatalogFilterParams(sp));
    const q = sp.get("q") ?? "";
    setQuery(q);
    setDebouncedQuery(q);
    const p = sp.get("page");
    const n = p ? parseInt(p, 10) : 1;
    setCurrentPage(Number.isFinite(n) && n > 0 ? n : 1);
    setUrlSynced(true);
    isMounted.current = true;
  }, [urlKey, lockedMoleculeId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  useEffect(() => {
    if (!urlSynced || !isMounted.current) return;
    const sp = new URLSearchParams();
    writeFacetParams(sp, selection);
    writeNexafsCatalogFilterParams(sp, catalogFilters);
    if (debouncedQuery) sp.set("q", debouncedQuery);
    if (currentPage > 1) sp.set("page", currentPage.toString());
    const qs = sp.toString();
    router.replace(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [
    urlSynced,
    selection,
    catalogFilters,
    debouncedQuery,
    currentPage,
    basePath,
    router,
  ]);

  const add = useCallback(
    (field: FacetField, id: string) => {
      setSelection((prev) => {
        if (prev[field].includes(id)) return prev;
        return { ...prev, [field]: [...prev[field], id] };
      });
      resetPage();
    },
    [resetPage],
  );

  const remove = useCallback(
    (field: CatalogToken["field"], id: string) => {
      if (field === "acquisition") {
        setCatalogFilters((prev) =>
          prev.experimentType === id
            ? { ...prev, experimentType: undefined }
            : prev,
        );
        resetPage();
        return;
      }
      if (field === "verification") {
        setCatalogFilters((prev) => ({
          ...prev,
          verifiedOnly: false,
          verificationSource: "either",
        }));
        resetPage();
        return;
      }
      setSelection((prev) => ({
        ...prev,
        [field]: prev[field].filter((x) => x !== id),
      }));
      resetPage();
    },
    [resetPage],
  );

  const toggle = useCallback(
    (field: FacetField, id: string) => {
      setSelection((prev) => {
        const has = prev[field].includes(id);
        return {
          ...prev,
          [field]: has ? prev[field].filter((x) => x !== id) : [...prev[field], id],
        };
      });
      resetPage();
    },
    [resetPage],
  );

  const clearField = useCallback(
    (field: FacetField) => {
      setSelection((prev) => ({ ...prev, [field]: [] }));
      resetPage();
    },
    [resetPage],
  );

  const clearAll = useCallback(() => {
    setSelection(
      lockedMoleculeId
        ? { ...emptyFacetSelection(), mol: [lockedMoleculeId] }
        : emptyFacetSelection(),
    );
    setCatalogFilters(emptyNexafsCatalogFilters());
    resetPage();
  }, [lockedMoleculeId, resetPage]);

  const setExperimentType = useCallback(
    (value: ExperimentType | undefined) => {
      setCatalogFilters((prev) => ({ ...prev, experimentType: value }));
      resetPage();
    },
    [resetPage],
  );

  const setVerifiedOnly = useCallback(
    (value: boolean) => {
      setCatalogFilters((prev) => ({
        ...prev,
        verifiedOnly: value,
        verificationSource: value ? prev.verificationSource : "either",
      }));
      resetPage();
    },
    [resetPage],
  );

  const setVerificationSource = useCallback(
    (source: VerificationSource) => {
      setCatalogFilters((prev) => ({ ...prev, verificationSource: source }));
      resetPage();
    },
    [resetPage],
  );

  const tokens = useMemo<CatalogToken[]>(() => {
    const out: CatalogToken[] = [];
    const fields: FacetField[] = ["edge", "mol", "instrument", "contributor"];
    for (const field of fields) {
      if (field === "mol" && lockedMoleculeId) continue;
      for (const id of selection[field]) {
        out.push({ field, id, label: resolveLabel(field, id, facetData) });
      }
    }
    out.push(...catalogFilterTokens(catalogFilters));
    return out;
  }, [selection, catalogFilters, facetData, lockedMoleculeId]);

  return {
    selection,
    catalogFilters,
    tokens,
    query,
    debouncedQuery,
    urlSynced,
    setQuery,
    add,
    remove,
    toggle,
    clearField,
    clearAll,
    setExperimentType,
    setVerifiedOnly,
    setVerificationSource,
    currentPage,
    setCurrentPage,
  };
}
