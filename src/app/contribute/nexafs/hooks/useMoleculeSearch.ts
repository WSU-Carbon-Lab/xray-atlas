"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "~/trpc/client";
import type { MoleculeSearchResult } from "../types";

type UseMoleculeSearchParams = {
  onSelectionChange?: (molecule: MoleculeSearchResult | null) => void;
};

export function useMoleculeSearch(params: UseMoleculeSearchParams = {}) {
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<MoleculeSearchResult[]>([]);
  const [manualResults, setManualResults] = useState<MoleculeSearchResult[]>(
    [],
  );
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [selectedMolecule, setSelectedMolecule] =
    useState<MoleculeSearchResult | null>(null);
  const [selectedPreferredName, setSelectedPreferredName] = useState("");

  const suggestionRequestIdRef = useRef(0);
  const manualRequestIdRef = useRef(0);

  useEffect(() => {
    const term = searchTerm.trim();

    if (!term) {
      setSuggestions([]);
      setSuggestionError(null);
      setIsSuggesting(false);
      return;
    }

    if (term.length < 2) {
      setSuggestions([]);
      setSuggestionError(null);
      setIsSuggesting(false);
      return;
    }

    const timeout = setTimeout(() => {
      const requestId = suggestionRequestIdRef.current + 1;
      suggestionRequestIdRef.current = requestId;
      setIsSuggesting(true);

      void utils.molecules.searchAdvanced
        .fetch({
          query: term,
          limit: 5,
          offset: 0,
          searchCasNumber: true,
          searchPubChemCid: true,
        })
        .then((response) => {
          if (suggestionRequestIdRef.current !== requestId) {
            return;
          }
          setSuggestions(response.results ?? []);
          setSuggestionError(
            response.results.length === 0
              ? "No quick suggestions found."
              : null,
          );
        })
        .catch((error) => {
          if (suggestionRequestIdRef.current !== requestId) {
            return;
          }
          console.error("Suggestion search failed:", error);
          setSuggestions([]);
          setSuggestionError(
            error instanceof Error
              ? error.message
              : "Unable to fetch suggestions.",
          );
        })
        .finally(() => {
          if (suggestionRequestIdRef.current === requestId) {
            setIsSuggesting(false);
          }
        });
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const runManualSearch = async () => {
    const term = searchTerm.trim();
    if (!term) {
      setManualResults([]);
      setManualError("Enter a keyword to search.");
      return;
    }

    const requestId = manualRequestIdRef.current + 1;
    manualRequestIdRef.current = requestId;
    setIsManualSearching(true);
    setManualError(null);

    try {
      const response = await utils.molecules.searchAdvanced.fetch({
        query: term,
        limit: 12,
        offset: 0,
        searchCasNumber: true,
        searchPubChemCid: true,
      });

      if (manualRequestIdRef.current !== requestId) {
        return;
      }

      setManualResults(response.results ?? []);
      if (response.results.length === 0) {
        setManualError("No molecules matched those keywords.");
      }
    } catch (error) {
      if (manualRequestIdRef.current !== requestId) {
        return;
      }
      console.error("Manual molecule search failed:", error);
      setManualResults([]);
      setManualError(
        error instanceof Error
          ? error.message
          : "Unable to complete the search.",
      );
    } finally {
      if (manualRequestIdRef.current === requestId) {
        setIsManualSearching(false);
      }
    }
  };

  const selectMolecule = (result: MoleculeSearchResult) => {
    setSelectedMolecule(result);
    setSelectedPreferredName(result.commonName);
    setManualResults([]);
    params.onSelectionChange?.(result);
  };

  const clearSelection = () => {
    setSelectedMolecule(null);
    setSelectedPreferredName("");
    params.onSelectionChange?.(null);
  };

  const allMoleculeNames = useMemo(() => {
    if (!selectedMolecule) return [];
    return [
      selectedMolecule.commonName,
      selectedMolecule.iupacName,
      ...selectedMolecule.synonyms,
    ].filter((name, index, arr) => name && arr.indexOf(name) === index);
  }, [selectedMolecule]);

  return {
    searchTerm,
    setSearchTerm,
    suggestions,
    manualResults,
    suggestionError,
    manualError,
    isSuggesting,
    isManualSearching,
    runManualSearch,
    selectedMolecule,
    selectedPreferredName,
    setSelectedPreferredName,
    selectMolecule,
    clearSelection,
    allMoleculeNames,
  };
}
