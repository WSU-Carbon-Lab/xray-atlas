"use client";

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
  readMoleculeFacetParams,
  writeMoleculeFacetParams,
  emptyMoleculeFacetSelection,
} from "./url-state";
import type {
  MoleculeFacetField,
  MoleculeFacetSelection,
  MoleculeFacetToken,
  MoleculeTagFacetItem,
} from "./types";

export interface UseMoleculeFacetSelectionOptions {
  basePath: string;
  tagLabels?: Map<string, string>;
}

export interface UseMoleculeFacetSelectionReturn {
  selection: MoleculeFacetSelection;
  tokens: MoleculeFacetToken[];
  query: string;
  debouncedQuery: string;
  urlSynced: boolean;
  setQuery: (q: string) => void;
  addTag: (tagId: string) => void;
  removeTag: (tagId: string) => void;
  toggleTag: (tagId: string) => void;
  setBooleanFacet: (
    field: "hasData" | "hasCas" | "hasPubchem",
    active: boolean,
  ) => void;
  toggleBooleanFacet: (field: "hasData" | "hasCas" | "hasPubchem") => void;
  clearAll: () => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

const BOOL_LABELS: Record<"hasData" | "hasCas" | "hasPubchem", string> = {
  hasData: "Has NEXAFS data",
  hasCas: "Has CAS number",
  hasPubchem: "Has PubChem ID",
};

function buildTokens(
  selection: MoleculeFacetSelection,
  tagLabels: Map<string, string>,
): MoleculeFacetToken[] {
  const out: MoleculeFacetToken[] = [];
  for (const id of selection.tagIds) {
    out.push({
      field: "tag",
      id,
      label: tagLabels.get(id) ?? id,
    });
  }
  if (selection.hasExperimentData) {
    out.push({
      field: "hasData",
      id: "1",
      label: BOOL_LABELS.hasData,
    });
  }
  if (selection.hasCas) {
    out.push({
      field: "hasCas",
      id: "1",
      label: BOOL_LABELS.hasCas,
    });
  }
  if (selection.hasPubchem) {
    out.push({
      field: "hasPubchem",
      id: "1",
      label: BOOL_LABELS.hasPubchem,
    });
  }
  return out;
}

export function tagLabelsFromFacetItems(
  items: MoleculeTagFacetItem[],
): Map<string, string> {
  return new Map(items.map((t) => [t.id, t.label]));
}

export function useMoleculeFacetSelection({
  basePath,
  tagLabels = new Map(),
}: UseMoleculeFacetSelectionOptions): UseMoleculeFacetSelectionReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlKey = searchParams.toString();

  const [urlSynced, setUrlSynced] = useState(false);
  const [selection, setSelection] = useState<MoleculeFacetSelection>(
    emptyMoleculeFacetSelection,
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const isMounted = useRef(false);

  useLayoutEffect(() => {
    const sp = new URLSearchParams(urlKey);
    setSelection(readMoleculeFacetParams(sp));
    const q = sp.get("q") ?? "";
    setQuery(q);
    setDebouncedQuery(q);
    const p = sp.get("page");
    const n = p ? parseInt(p, 10) : 1;
    setCurrentPage(Number.isFinite(n) && n > 0 ? n : 1);
    setUrlSynced(true);
    isMounted.current = true;
  }, [urlKey]);

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
    writeMoleculeFacetParams(sp, selection);
    if (debouncedQuery) sp.set("q", debouncedQuery);
    if (currentPage > 1) sp.set("page", currentPage.toString());
    const qs = sp.toString();
    router.replace(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [urlSynced, selection, debouncedQuery, currentPage, basePath, router]);

  const addTag = useCallback(
    (tagId: string) => {
      setSelection((prev) => {
        if (prev.tagIds.includes(tagId)) return prev;
        return { ...prev, tagIds: [...prev.tagIds, tagId] };
      });
      resetPage();
    },
    [resetPage],
  );

  const removeTag = useCallback(
    (tagId: string) => {
      setSelection((prev) => ({
        ...prev,
        tagIds: prev.tagIds.filter((x) => x !== tagId),
      }));
      resetPage();
    },
    [resetPage],
  );

  const toggleTag = useCallback(
    (tagId: string) => {
      setSelection((prev) => {
        const has = prev.tagIds.includes(tagId);
        return {
          ...prev,
          tagIds: has
            ? prev.tagIds.filter((x) => x !== tagId)
            : [...prev.tagIds, tagId],
        };
      });
      resetPage();
    },
    [resetPage],
  );

  const setBooleanFacet = useCallback(
    (field: "hasData" | "hasCas" | "hasPubchem", active: boolean) => {
      setSelection((prev) => ({
        ...prev,
        hasExperimentData:
          field === "hasData" ? active : prev.hasExperimentData,
        hasCas: field === "hasCas" ? active : prev.hasCas,
        hasPubchem: field === "hasPubchem" ? active : prev.hasPubchem,
      }));
      resetPage();
    },
    [resetPage],
  );

  const toggleBooleanFacet = useCallback(
    (field: "hasData" | "hasCas" | "hasPubchem") => {
      setSelection((prev) => ({
        ...prev,
        hasExperimentData:
          field === "hasData" ? !prev.hasExperimentData : prev.hasExperimentData,
        hasCas: field === "hasCas" ? !prev.hasCas : prev.hasCas,
        hasPubchem: field === "hasPubchem" ? !prev.hasPubchem : prev.hasPubchem,
      }));
      resetPage();
    },
    [resetPage],
  );

  const clearAll = useCallback(() => {
    setSelection(emptyMoleculeFacetSelection());
    resetPage();
  }, [resetPage]);

  const tokens = useMemo(
    () => buildTokens(selection, tagLabels),
    [selection, tagLabels],
  );

  return {
    selection,
    tokens,
    query,
    debouncedQuery,
    urlSynced,
    setQuery,
    addTag,
    removeTag,
    toggleTag,
    setBooleanFacet,
    toggleBooleanFacet,
    clearAll,
    currentPage,
    setCurrentPage,
  };
}

export function moleculeFacetFieldFromToken(
  field: MoleculeFacetField,
): "hasData" | "hasCas" | "hasPubchem" | null {
  if (field === "hasData") return "hasData";
  if (field === "hasCas") return "hasCas";
  if (field === "hasPubchem") return "hasPubchem";
  return null;
}
