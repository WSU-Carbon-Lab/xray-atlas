"use client";

/**
 * URL-synchronized multi-select facet state for the unified NEXAFS search bar.
 *
 * Reads initial state from `URLSearchParams` via `readFacetParams`, mirrors
 * every change back to the URL via `router.replace` (no scroll), and debounces
 * the free-text query exactly as the legacy single-select section does (300 ms).
 * Resetting any filter or clearing all filters resets the page to 1.
 *
 * Labels for active tokens are resolved from `facetData` (edge, instrument,
 * molecule, contributor maps). Pass `null` while data is loading; tokens for
 * unresolved ids fall back to the raw id string.
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
import {
  readFacetParams,
  writeFacetParams,
  emptyFacetSelection,
} from "./url-state";
import type { FacetData, FacetField, FacetSelection, FacetToken } from "./types";

export interface UseFacetSelectionOptions {
  basePath: string;
  /** When set, the molecule facet is locked to this id and hidden from the URL. */
  lockedMoleculeId?: string;
  /** Facet label data used to resolve token display names. */
  facetData?: FacetData | null;
}

export interface UseFacetSelectionReturn {
  selection: FacetSelection;
  tokens: FacetToken[];
  query: string;
  debouncedQuery: string;
  urlSynced: boolean;
  setQuery: (q: string) => void;
  add: (field: FacetField, id: string) => void;
  remove: (field: FacetField, id: string) => void;
  toggle: (field: FacetField, id: string) => void;
  clearField: (field: FacetField) => void;
  clearAll: () => void;
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

/**
 * Manages `FacetSelection` state synchronized to the browser URL.
 *
 * The hook owns URL reading (on mount via `useLayoutEffect`), URL writing
 * (on any selection or debounced-query change), the debounced free-text query,
 * and page-reset side effects. It does not own sort or items-per-page state.
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
    if (debouncedQuery) sp.set("q", debouncedQuery);
    if (currentPage > 1) sp.set("page", currentPage.toString());
    const qs = sp.toString();
    router.replace(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [urlSynced, selection, debouncedQuery, currentPage, basePath, router]);

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
    (field: FacetField, id: string) => {
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
    resetPage();
  }, [lockedMoleculeId, resetPage]);

  const tokens = useMemo<FacetToken[]>(() => {
    const out: FacetToken[] = [];
    const fields: FacetField[] = ["edge", "mol", "instrument", "contributor"];
    for (const field of fields) {
      if (field === "mol" && lockedMoleculeId) continue;
      for (const id of selection[field]) {
        out.push({ field, id, label: resolveLabel(field, id, facetData) });
      }
    }
    return out;
  }, [selection, facetData, lockedMoleculeId]);

  return {
    selection,
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
    currentPage,
    setCurrentPage,
  };
}
