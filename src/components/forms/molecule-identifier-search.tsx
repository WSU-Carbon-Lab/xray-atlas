"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  Button,
  Description,
  ErrorMessage,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import {
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { CatalogSearchChrome } from "~/components/browse/catalog-search-chrome";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  appendUniqueMoleculeSynonym,
} from "~/lib/molecule-synonym-dedupe";
import type { PubChemCandidateSummary } from "~/lib/pubchem-compound";
import { trpc } from "~/trpc/client";
import type { MoleculeUploadData } from "~/types/upload";
import type { MoleculeResolvedIdentity } from "./molecule-resolved-identity-card";

export type MoleculeIdentifierSearchCompletePayload = {
  searchError: string | null;
  searchSuccess: string | null;
  searchWarnings: string[];
  pubChemUrl: string | null;
  resolvedIdentity: MoleculeResolvedIdentity | null;
};

export type MoleculeIdentifierSearchProps = {
  formData: MoleculeUploadData;
  onFormDataChange: (
    updater: MoleculeUploadData | ((prev: MoleculeUploadData) => MoleculeUploadData),
  ) => void;
  editingMoleculeId: string | null;
  onEditingMoleculeIdChange: (id: string | null) => void;
  onSearchComplete: (payload: MoleculeIdentifierSearchCompletePayload) => void;
  onClearSearchFeedback: () => void;
  onImportedSynonyms?: (synonyms: string[]) => void;
  structureSmiles?: string;
  onStructureLookupBusyChange?: (busy: boolean) => void;
};

type AutosuggestHit = {
  id: string | null;
  commonName: string | null;
  iupacName: string | null;
  inchi: string | null;
  smiles: string | null;
  chemicalFormula: string | null;
  casNumber: string | null;
  pubChemCid: string | null;
  synonyms: string[] | null;
  imageUrl?: string | null;
  matchType: string;
};

function firstTrimmedNonEmpty(
  ...values: Array<string | null | undefined>
): string {
  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function trimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

type PubChemLookupResult = {
  title?: string;
  iupacName?: string;
  commonName?: string;
  synonyms?: string[];
  inchi?: string;
  smiles?: string;
  chemicalFormula?: string;
  casNumber?: string | null;
  pubChemCid?: string;
};

function mergeImportedSynonyms(
  existing: readonly string[],
  imported: readonly string[],
): string[] {
  let merged = [...existing];
  for (const synonym of imported) {
    merged = appendUniqueMoleculeSynonym(merged, synonym);
  }
  return merged;
}

function applyPubChemResultToForm(
  result: PubChemLookupResult,
  lookupQuery: string,
  options?: { preserveDrawnSmiles?: string; fillEmptyFieldsOnly?: boolean },
): (prev: MoleculeUploadData) => MoleculeUploadData {
  const displayName =
    result.title?.trim() ??
    result.iupacName?.trim() ??
    result.commonName?.trim() ??
    lookupQuery.trim();
  const commonName =
    lookupQuery.trim().length > 0 &&
    lookupQuery.trim().toLowerCase() !== displayName.toLowerCase()
      ? lookupQuery.trim()
      : (result.commonName?.trim() ?? lookupQuery.trim());

  const importedSynonyms =
    result.synonyms?.filter(
      (synonym): synonym is string =>
        typeof synonym === "string" && synonym.trim().length > 0,
    ) ?? [];
  const drawnSmiles = options?.preserveDrawnSmiles?.trim() ?? "";
  const fillEmptyOnly = options?.fillEmptyFieldsOnly === true;

  return (prev) => {
    if (!fillEmptyOnly) {
      return {
        ...prev,
        iupacName: displayName,
        commonName:
          prev.commonName.trim().length > 0 ? prev.commonName : commonName,
        synonyms: importedSynonyms.length > 0 ? importedSynonyms : prev.synonyms,
        inchi: result.inchi ?? prev.inchi,
        smiles: result.smiles ?? prev.smiles,
        chemicalFormula: result.chemicalFormula ?? prev.chemicalFormula,
        casNumber: result.casNumber ?? prev.casNumber,
        pubchemCid: result.pubChemCid ?? prev.pubchemCid,
      };
    }

    return {
      ...prev,
      iupacName: prev.iupacName.trim().length > 0 ? prev.iupacName : displayName,
      commonName:
        prev.commonName.trim().length > 0 ? prev.commonName : commonName,
      synonyms:
        importedSynonyms.length > 0
          ? mergeImportedSynonyms(prev.synonyms, importedSynonyms)
          : prev.synonyms,
      inchi: prev.inchi.trim().length > 0 ? prev.inchi : (result.inchi ?? ""),
      smiles:
        drawnSmiles.length > 0
          ? drawnSmiles
          : prev.smiles.trim().length > 0
            ? prev.smiles
            : (result.smiles ?? ""),
      chemicalFormula:
        prev.chemicalFormula.trim().length > 0
          ? prev.chemicalFormula
          : (result.chemicalFormula ?? ""),
      casNumber: prev.casNumber ?? result.casNumber ?? null,
      pubchemCid: prev.pubchemCid ?? result.pubChemCid ?? null,
    };
  };
}

/** Imperative handle for structure-initiated PubChem identifier lookup. */
export type MoleculeIdentifierSearchHandle = {
  lookupFromSmiles: (smiles: string) => Promise<void>;
};

/**
 * Unified identifier search row for the molecule registry form: catalog autosuggest,
 * PubChem/CAS fields, and explicit lookup actions.
 */
export const MoleculeIdentifierSearch = forwardRef<
  MoleculeIdentifierSearchHandle,
  MoleculeIdentifierSearchProps
>(function MoleculeIdentifierSearch(
  {
    formData,
    onFormDataChange,
    editingMoleculeId,
    onEditingMoleculeIdChange,
    onSearchComplete,
    onClearSearchFeedback,
    onImportedSynonyms,
    structureSmiles = "",
    onStructureLookupBusyChange,
  },
  ref,
) {
  const utils = trpc.useUtils();
  const listboxId = useId();

  const [query, setQuery] = useState(formData.commonName);
  const [debouncedQuery, setDebouncedQuery] = useState(formData.commonName);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingCas, setIsSearchingCas] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [manualPubChemCandidates, setManualPubChemCandidates] = useState<
    PubChemCandidateSummary[]
  >([]);
  const [structureLookupSmiles, setStructureLookupSmiles] = useState<
    string | null
  >(null);

  useEffect(() => {
    setQuery(formData.commonName);
  }, [formData.commonName]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const pubchemQueryEnabled =
    debouncedQuery.length >= 2 && editingMoleculeId === null;

  const { data: suggestData, isFetching: isSuggesting } =
    trpc.molecules.autosuggest.useQuery(
      { query: debouncedQuery, limit: 10 },
      { enabled: debouncedQuery.length >= 2, staleTime: 30_000 },
    );

  const { data: pubchemCandidateData, isFetching: isPubchemSuggesting } =
    trpc.external.searchPubchemCandidates.useQuery(
      { query: debouncedQuery, limit: 10 },
      { enabled: pubchemQueryEnabled, staleTime: 60_000 },
    );

  const suggestions = useMemo(
    () => suggestData?.results ?? [],
    [suggestData?.results],
  );

  const pubChemCandidates = useMemo(() => {
    if (manualPubChemCandidates.length > 0) {
      return manualPubChemCandidates;
    }
    return pubchemCandidateData?.candidates ?? [];
  }, [manualPubChemCandidates, pubchemCandidateData?.candidates]);

  const pubchemSearchType = pubchemCandidateData?.searchType;

  const optionCount = suggestions.length + pubChemCandidates.length;

  useEffect(() => {
    setHighlightedIndex(optionCount > 0 ? 0 : -1);
  }, [debouncedQuery, optionCount]);

  const applyDatabaseHit = useCallback(
    async (hit: AutosuggestHit) => {
      onClearSearchFeedback();
      const moleculeId = hit.id ?? null;
      let tagIds: string[] = [];
      if (moleculeId) {
        try {
          const tagsData = await utils.molecules.getTags.fetch({
            moleculeId,
          });
          tagIds = tagsData.map((t) => t.id);
        } catch {
          tagIds = [];
        }
      }
      const atlasSynonyms = Array.isArray(hit.synonyms)
        ? hit.synonyms.filter(
            (synonym): synonym is string =>
              typeof synonym === "string" && synonym.trim().length > 0,
          )
        : [];
      onImportedSynonyms?.(atlasSynonyms);
      onFormDataChange({
        iupacName: hit.iupacName ?? "",
        commonName: hit.commonName ?? query.trim(),
        synonyms: atlasSynonyms,
        inchi: hit.inchi ?? "",
        smiles: hit.smiles ?? "",
        chemicalFormula: hit.chemicalFormula ?? "",
        casNumber: hit.casNumber ?? null,
        pubchemCid: hit.pubChemCid ?? null,
        tagIds,
      });
      onEditingMoleculeIdChange(moleculeId);
      setQuery(hit.commonName ?? query.trim());
      setManualPubChemCandidates([]);
      const displayName = firstTrimmedNonEmpty(
        hit.iupacName,
        hit.commonName,
        query,
      );
      onSearchComplete({
        searchError: null,
        searchSuccess: null,
        searchWarnings: [],
        pubChemUrl: hit.pubChemCid
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${hit.pubChemCid}`
          : null,
        resolvedIdentity: moleculeId
          ? {
              source: "atlas",
              displayName,
              chemicalFormula: trimmedOrNull(hit.chemicalFormula),
              pubChemCid: trimmedOrNull(hit.pubChemCid),
              casNumber: trimmedOrNull(hit.casNumber),
              atlasMoleculeId: moleculeId,
              casVerified: Boolean(hit.casNumber?.trim()),
              statusDetail: null,
            }
          : null,
      });
    },
    [
      onClearSearchFeedback,
      onEditingMoleculeIdChange,
      onFormDataChange,
      onImportedSynonyms,
      onSearchComplete,
      query,
      utils.molecules.getTags,
    ],
  );

  const enrichPubChemWithCas = useCallback(
    async (
      result: PubChemLookupResult,
      commonName: string,
      lookupLabel: string,
      options?: { preserveDrawnSmiles?: string },
    ): Promise<{ warnings: string[]; casNumber: string | null }> => {
      const preserveDrawnSmiles = options?.preserveDrawnSmiles?.trim() ?? "";
      const warnings: string[] = [];
      let resolvedCas = (result.casNumber ?? "").trim() || null;
      const needsCas = !resolvedCas;
      const needsSmiles = !result.smiles?.trim();
      if (!needsCas && !needsSmiles) {
        return { warnings, casNumber: resolvedCas };
      }

      setIsSearchingCas(true);
      try {
        const casLookupInput = needsCas
          ? result.inchi?.trim()
            ? { inchi: result.inchi.trim() }
            : {
                synonym:
                  commonName.trim().length > 0
                    ? commonName
                    : (result.commonName?.trim() ??
                      result.title?.trim() ??
                      lookupLabel),
              }
          : { casNumber: resolvedCas ?? "" };
        const casDetail = await utils.external.searchCas.fetch(casLookupInput);
        if (casDetail.ok && casDetail.data) {
          const detailSmiles = casDetail.data.smiles?.trim();
          const detailInchi = casDetail.data.inchi?.trim();
          const detailCas = casDetail.data.casRegistryNumber?.trim();
          if (detailCas) {
            resolvedCas = detailCas;
          }
          onFormDataChange((prev) => ({
            ...prev,
            casNumber: detailCas ?? prev.casNumber,
            smiles:
              preserveDrawnSmiles.length > 0
                ? preserveDrawnSmiles
                : needsSmiles && detailSmiles
                  ? detailSmiles
                  : prev.smiles,
            inchi: detailInchi ?? prev.inchi,
          }));
          if (needsSmiles && !detailSmiles) {
            warnings.push(
              "SMILES not returned from PubChem; CAS enrichment did not resolve it.",
            );
          }
        } else if (needsSmiles) {
          warnings.push(
            "SMILES not returned from PubChem; CAS enrichment did not resolve it.",
          );
        }
      } catch {
        if (needsSmiles) {
          warnings.push(
            "SMILES not returned from PubChem; CAS enrichment did not resolve it.",
          );
        }
      } finally {
        setIsSearchingCas(false);
      }
      return { warnings, casNumber: resolvedCas };
    },
    [onFormDataChange, utils.external.searchCas],
  );

  const applyResolvedPubChem = useCallback(
    async (
      result: PubChemLookupResult,
      lookupQuery: string,
      candidate?: PubChemCandidateSummary,
      options?: { preserveDrawnSmiles?: string; fillEmptyFieldsOnly?: boolean },
    ) => {
      const pubchemSynonyms =
        result.synonyms?.filter(
          (synonym): synonym is string =>
            typeof synonym === "string" && synonym.trim().length > 0,
        ) ?? [];
      if (pubchemSynonyms.length > 0) {
        onImportedSynonyms?.(pubchemSynonyms);
      }
      onFormDataChange(
        applyPubChemResultToForm(result, lookupQuery, options),
      );
      onEditingMoleculeIdChange(null);
      setManualPubChemCandidates([]);
      const { warnings, casNumber } = await enrichPubChemWithCas(
        result,
        lookupQuery,
        candidate?.title ?? lookupQuery,
        options,
      );
      const displayName = firstTrimmedNonEmpty(
        result.title,
        result.iupacName,
        result.commonName,
        lookupQuery,
      );
      onSearchComplete({
        searchError: null,
        searchSuccess: null,
        searchWarnings: warnings,
        pubChemUrl: result.pubChemCid
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${result.pubChemCid}`
          : null,
        resolvedIdentity: {
          source: "pubchem",
          displayName,
          chemicalFormula: trimmedOrNull(result.chemicalFormula),
          pubChemCid: trimmedOrNull(result.pubChemCid),
          casNumber: trimmedOrNull(casNumber),
          atlasMoleculeId: null,
          casVerified: Boolean(casNumber && casNumber.length > 0),
          statusDetail: null,
        },
      });
    },
    [
      enrichPubChemWithCas,
      onEditingMoleculeIdChange,
      onFormDataChange,
      onImportedSynonyms,
      onSearchComplete,
    ],
  );

  const resolvePubChemByCid = useCallback(
    async (
      cid: string,
      lookupQuery: string,
      candidate?: PubChemCandidateSummary,
      applyOptions?: { preserveDrawnSmiles?: string; fillEmptyFieldsOnly?: boolean },
    ) => {
      const pubChemResponse = await utils.external.searchPubchem.fetch({
        query: cid,
        type: "cid",
      });
      if (!pubChemResponse.ok || !pubChemResponse.data) {
        throw new Error("Molecule not found in PubChem.");
      }
      await applyResolvedPubChem(
        pubChemResponse.data,
        lookupQuery,
        candidate,
        applyOptions,
      );
    },
    [applyResolvedPubChem, utils.external.searchPubchem],
  );

  const selectPubChemCandidate = useCallback(
    async (candidate: PubChemCandidateSummary) => {
      setIsSearching(true);
      setLocalError(null);
      onClearSearchFeedback();
      const drawnSmiles = structureLookupSmiles?.trim() ?? "";
      const applyOptions =
        drawnSmiles.length > 0
          ? {
              preserveDrawnSmiles: drawnSmiles,
              fillEmptyFieldsOnly: true,
            }
          : undefined;
      try {
        await resolvePubChemByCid(
          candidate.cid,
          drawnSmiles.length > 0 ? drawnSmiles : query.trim(),
          candidate,
          applyOptions,
        );
        setStructureLookupSmiles(null);
        setShowDropdown(false);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "PubChem lookup failed.";
        setLocalError(message);
        onSearchComplete({
          searchError: message,
          searchSuccess: null,
          searchWarnings: [],
          pubChemUrl: null,
          resolvedIdentity: null,
        });
      } finally {
        setIsSearching(false);
        setIsSearchingCas(false);
      }
    },
    [
      onClearSearchFeedback,
      onSearchComplete,
      query,
      resolvePubChemByCid,
      structureLookupSmiles,
    ],
  );

  const runExternalLookup = useCallback(async () => {
    const commonName = query.trim();
    const cid = (formData.pubchemCid ?? "").trim();
    const cas = (formData.casNumber ?? "").trim();

    if (commonName.length < 2 && cid.length === 0 && cas.length === 0) {
      const message =
        "Enter a common name (2+ characters), PubChem CID, or CAS number to search.";
      setLocalError(message);
      onSearchComplete({
        searchError: message,
        searchSuccess: null,
        searchWarnings: [],
        pubChemUrl: null,
        resolvedIdentity: null,
      });
      return;
    }

    setIsSearching(true);
    setIsSearchingCas(false);
    setLocalError(null);
    setManualPubChemCandidates([]);
    onClearSearchFeedback();

    try {
      if (commonName.length >= 2) {
        const autosuggest = await utils.molecules.autosuggest.fetch({
          query: commonName,
          limit: 1,
        });
        const top = autosuggest.results[0];
        if (
          top &&
          (top.matchType === "name_exact" || top.matchType === "name_prefix")
        ) {
          await applyDatabaseHit(top as AutosuggestHit);
          setIsSearching(false);
          return;
        }
      }

      if (cid.length > 0) {
        await resolvePubChemByCid(cid, commonName);
        setIsSearching(false);
        return;
      }

      if (cas.length > 0) {
        const casResponse = await utils.external.searchCas.fetch({ casNumber: cas });
        if (!casResponse.ok || !casResponse.data) {
          throw new Error("Compound not found for that CAS number.");
        }
        const casData = casResponse.data;
        onFormDataChange((prev) => ({
          ...prev,
          casNumber: casData.casRegistryNumber ?? prev.casNumber,
          inchi: casData.inchi?.trim() ?? prev.inchi,
          smiles: casData.smiles?.trim() ?? prev.smiles,
          commonName:
            prev.commonName.trim().length > 0
              ? prev.commonName
              : (casData.moleculeName?.trim() ?? prev.commonName),
          iupacName:
            prev.iupacName.trim().length > 0
              ? prev.iupacName
              : (casData.moleculeName?.trim() ?? prev.iupacName),
        }));
        onEditingMoleculeIdChange(null);
        const casDisplayName = firstTrimmedNonEmpty(
          casData.moleculeName,
          commonName,
          cas,
        );
        onSearchComplete({
          searchError: null,
          searchSuccess: null,
          searchWarnings: [],
          pubChemUrl: null,
          resolvedIdentity: {
            source: "cas",
            displayName: casDisplayName,
            chemicalFormula: null,
            pubChemCid: null,
            casNumber: trimmedOrNull(casData.casRegistryNumber) ?? cas,
            atlasMoleculeId: null,
            casVerified: true,
            statusDetail: null,
          },
        });
        setIsSearching(false);
        return;
      }

      const candidateResponse = await utils.external.searchPubchemCandidates.fetch({
        query: commonName,
        limit: 10,
      });
      const candidates = candidateResponse.candidates;
      if (candidates.length === 0) {
        throw new Error("Molecule not found in PubChem.");
      }
      if (candidates.length === 1) {
        await selectPubChemCandidate(candidates[0]!);
        setIsSearching(false);
        return;
      }

      setManualPubChemCandidates(candidates);
      setShowDropdown(true);
      onSearchComplete({
        searchError: null,
        searchSuccess: "Multiple PubChem matches. Select a compound below.",
        searchWarnings: [],
        pubChemUrl: null,
        resolvedIdentity: null,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Identifier lookup failed.";
      setLocalError(message);
      onSearchComplete({
        searchError: message,
        searchSuccess: null,
        searchWarnings: [],
        pubChemUrl: null,
        resolvedIdentity: null,
      });
    } finally {
      setIsSearching(false);
      setIsSearchingCas(false);
    }
  }, [
    applyDatabaseHit,
    formData.casNumber,
    formData.pubchemCid,
    onClearSearchFeedback,
    onEditingMoleculeIdChange,
    onFormDataChange,
    onSearchComplete,
    query,
    resolvePubChemByCid,
    selectPubChemCandidate,
    utils.external.searchCas,
    utils.external.searchPubchemCandidates,
    utils.molecules.autosuggest,
  ]);

  const lookupFromSmiles = useCallback(
    async (smiles: string) => {
      const trimmedSmiles = smiles.trim();
      if (trimmedSmiles.length === 0) {
        const message = "Draw or enter a SMILES string before looking up identifiers.";
        setLocalError(message);
        onSearchComplete({
          searchError: message,
          searchSuccess: null,
          searchWarnings: [],
          pubChemUrl: null,
          resolvedIdentity: null,
        });
        return;
      }

      setIsSearching(true);
      setIsSearchingCas(false);
      setLocalError(null);
      setManualPubChemCandidates([]);
      onClearSearchFeedback();
      onStructureLookupBusyChange?.(true);

      try {
        const atlasSuggest = await utils.molecules.autosuggest.fetch({
          query: trimmedSmiles,
          limit: 1,
        });
        const atlasHit = atlasSuggest.results[0];
        if (atlasHit?.matchType === "smiles_exact") {
          await applyDatabaseHit(atlasHit as AutosuggestHit);
          return;
        }

        const candidateResponse =
          await utils.external.searchPubchemCandidates.fetch({
            query: trimmedSmiles,
            limit: 10,
            type: "smiles",
          });
        const candidates = candidateResponse.candidates;
        if (candidates.length === 0) {
          throw new Error("No PubChem match for this SMILES.");
        }
        if (candidates.length > 1) {
          setStructureLookupSmiles(trimmedSmiles);
          setManualPubChemCandidates(candidates);
          onSearchComplete({
            searchError: null,
            searchSuccess:
              "Multiple PubChem matches for this structure. Select a compound in the search dropdown.",
            searchWarnings: [],
            pubChemUrl: null,
            resolvedIdentity: null,
          });
          setShowDropdown(true);
          return;
        }

        await resolvePubChemByCid(
          candidates[0]!.cid,
          trimmedSmiles,
          candidates[0],
          {
            preserveDrawnSmiles: trimmedSmiles,
            fillEmptyFieldsOnly: true,
          },
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "PubChem lookup from structure failed.";
        setLocalError(message);
        onSearchComplete({
          searchError: message,
          searchSuccess: null,
          searchWarnings: [],
          pubChemUrl: null,
          resolvedIdentity: null,
        });
      } finally {
        setIsSearching(false);
        setIsSearchingCas(false);
        onStructureLookupBusyChange?.(false);
      }
    },
    [
      applyDatabaseHit,
      onClearSearchFeedback,
      onSearchComplete,
      onStructureLookupBusyChange,
      resolvePubChemByCid,
      utils.external.searchPubchemCandidates,
      utils.molecules.autosuggest,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      lookupFromSmiles,
    }),
    [lookupFromSmiles],
  );

  const searchBusy = isSearching || isSearchingCas;
  const dropdownLoading =
    isSuggesting || isPubchemSuggesting || searchBusy;
  const trimmedStructureSmiles = structureSmiles.trim();

  const pubchemSectionLabel =
    pubchemSearchType === "formula"
      ? "PubChem formula matches"
      : "PubChem matches";

  const dropdown = useMemo(
    () => (
      <ul
        id={listboxId}
        role="listbox"
        className="border-border bg-surface max-h-80 overflow-y-auto rounded-lg border py-1 shadow-lg"
      >
        {dropdownLoading ? (
          <li className="text-muted flex items-center gap-2 px-3 py-2 text-sm">
            <Spinner className="h-4 w-4" />
            Searching Atlas catalog and PubChem…
          </li>
        ) : null}

        {!dropdownLoading && suggestions.length > 0 ? (
          <li className="text-muted border-border border-b px-3 py-2 text-xs font-medium">
            X-ray Atlas catalog
          </li>
        ) : null}

        {suggestions.map((hit, index) => {
          const label = hit.commonName ?? hit.iupacName ?? hit.id ?? "Molecule";
          return (
            <li key={hit.id ?? `${label}-${index}`}>
              <button
                type="button"
                role="option"
                aria-selected={highlightedIndex === index}
                className="hover:bg-default/40 focus:bg-default/40 w-full px-3 py-2 text-left text-sm transition-colors focus:outline-none"
                onMouseDown={(event) => {
                  event.preventDefault();
                  void applyDatabaseHit(hit as AutosuggestHit);
                  setShowDropdown(false);
                }}
              >
                <span className="text-foreground block font-medium">{label}</span>
                <span className="text-muted block truncate text-xs">
                  {hit.chemicalFormula ?? ""}
                  {hit.pubChemCid ? ` · CID ${hit.pubChemCid}` : ""}
                  {hit.casNumber ? ` · CAS ${hit.casNumber}` : ""}
                </span>
              </button>
            </li>
          );
        })}

        {!dropdownLoading && pubChemCandidates.length > 0 ? (
          <li className="text-muted border-border border-b px-3 py-2 text-xs font-medium">
            {pubchemSectionLabel}
          </li>
        ) : null}

        {pubChemCandidates.map((candidate, index) => {
          const optionIndex = suggestions.length + index;
          return (
            <li key={candidate.cid}>
              <button
                type="button"
                role="option"
                aria-selected={highlightedIndex === optionIndex}
                className="hover:bg-default/40 focus:bg-default/40 w-full px-3 py-2 text-left text-sm transition-colors focus:outline-none"
                onMouseDown={(event) => {
                  event.preventDefault();
                  void selectPubChemCandidate(candidate);
                }}
              >
                <span className="text-foreground block font-medium">
                  {candidate.title}
                </span>
                <span className="text-muted block truncate text-xs">
                  {candidate.formula ? `${candidate.formula} · ` : ""}
                  CID {candidate.cid}
                </span>
              </button>
            </li>
          );
        })}

        {!dropdownLoading &&
        suggestions.length === 0 &&
        pubChemCandidates.length === 0 &&
        debouncedQuery.length >= 2 ? (
          <li className="text-muted px-3 py-2 text-sm">
            No Atlas or PubChem matches for {debouncedQuery}.
          </li>
        ) : null}
      </ul>
    ),
    [
      applyDatabaseHit,
      debouncedQuery,
      dropdownLoading,
      highlightedIndex,
      listboxId,
      pubChemCandidates,
      pubchemSectionLabel,
      selectPubChemCandidate,
      suggestions,
    ],
  );

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
          Search catalog or external IDs
          <FieldTooltip description="One search box for Atlas catalog hits, PubChem name or formula matches, and CAS cross-check on selection. Pick a row to populate the registry form." />
        </Label>
        <CatalogSearchChrome
          tokens={[]}
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            onFormDataChange((prev) => ({ ...prev, commonName: value }));
            onClearSearchFeedback();
            setLocalError(null);
            setManualPubChemCandidates([]);
            setShowDropdown(true);
          }}
          onClearAll={() => {
            setQuery("");
            onFormDataChange((prev) => ({ ...prev, commonName: "" }));
            onClearSearchFeedback();
            setManualPubChemCandidates([]);
          }}
          placeholder="Common name, formula, synonym, or IUPAC prefix…"
          ariaLabel="Search molecule catalog or external identifiers"
          showDropdown={
            showDropdown &&
            (debouncedQuery.length >= 2 || pubChemCandidates.length > 0)
          }
          dropdown={dropdown}
          trailing={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onPress={() => {
                void runExternalLookup();
              }}
              isDisabled={searchBusy}
              aria-label={
                searchBusy ? "Searching identifiers" : "Search identifiers now"
              }
            >
              {searchBusy ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <MagnifyingGlassIcon className="h-4 w-4" />
              )}
              Search
            </Button>
          }
          onFocus={() => setShowDropdown(true)}
          onBlurClose={() => setShowDropdown(false)}
          listboxId={listboxId}
          highlightedIndex={highlightedIndex}
          onInputKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightedIndex((prev) =>
                Math.min(prev + 1, Math.max(optionCount - 1, 0)),
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightedIndex((prev) => Math.max(prev - 1, 0));
            } else if (event.key === "Enter" && highlightedIndex >= 0) {
              event.preventDefault();
              if (highlightedIndex < suggestions.length) {
                const hit = suggestions[highlightedIndex];
                if (hit) {
                  void applyDatabaseHit(hit as AutosuggestHit);
                  setShowDropdown(false);
                }
              } else {
                const candidateIndex = highlightedIndex - suggestions.length;
                const candidate = pubChemCandidates[candidateIndex];
                if (candidate) {
                  void selectPubChemCandidate(candidate);
                }
              }
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (optionCount > 0) {
                setShowDropdown(true);
                onSearchComplete({
                  searchError: null,
                  searchSuccess: "Select a match from the list below.",
                  searchWarnings: [],
                  pubChemUrl: null,
                  resolvedIdentity: null,
                });
              } else {
                void runExternalLookup();
              }
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          name="pubchemCid"
          value={formData.pubchemCid ?? ""}
          onChange={(value) => {
            onFormDataChange((prev) => ({
              ...prev,
              pubchemCid: value || null,
            }));
            onClearSearchFeedback();
          }}
          variant="secondary"
          fullWidth
        >
          <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
            PubChem CID
            <FieldTooltip description="Numeric PubChem compound identifier. Search uses CID when the common name field is empty." />
          </Label>
          <InputGroup variant="secondary" fullWidth>
            <InputGroup.Input placeholder="e.g., 154703023" autoComplete="off" />
          </InputGroup>
        </TextField>

        <TextField
          name="casNumber"
          value={formData.casNumber ?? ""}
          onChange={(value) => {
            onFormDataChange((prev) => ({
              ...prev,
              casNumber: value || null,
            }));
            onClearSearchFeedback();
          }}
          variant="secondary"
          fullWidth
        >
          <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
            CAS registry number
            <FieldTooltip description="CAS RN (XXX-XX-X). Required for registry stub entries without a structure image." />
          </Label>
          <InputGroup variant="secondary" fullWidth>
            <InputGroup.Input placeholder="e.g., 50-00-0" autoComplete="off" />
          </InputGroup>
        </TextField>
      </div>

      {trimmedStructureSmiles.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onPress={() => {
              void lookupFromSmiles(trimmedStructureSmiles);
            }}
            isDisabled={searchBusy}
          >
            {searchBusy ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <MagnifyingGlassIcon className="h-4 w-4" />
            )}
            Search PubChem from drawn structure
          </Button>
          <Description className="text-muted text-xs">
            Fills empty name, formula, InChI, CAS, and synonym fields from
            PubChem without replacing your drawn SMILES.
          </Description>
        </div>
      ) : null}

      {localError ? (
        <ErrorMessage className="text-sm font-medium">{localError}</ErrorMessage>
      ) : null}

    </div>
  );
});

export type MoleculeIdentifierSearchFeedbackProps = {
  searchError: string | null;
  searchSuccess: string | null;
  searchWarnings: string[];
  pubChemUrl: string | null;
  resolvedIdentity: MoleculeResolvedIdentity | null;
};

/**
 * Renders transient lookup feedback beneath the identifier search row. Resolved
 * identity success states render in {@link MoleculeResolvedIdentityCard} instead.
 */
export function MoleculeIdentifierSearchFeedback({
  searchError,
  searchSuccess,
  searchWarnings,
  pubChemUrl,
  resolvedIdentity,
}: MoleculeIdentifierSearchFeedbackProps) {
  const showInlineSuccess = searchSuccess && resolvedIdentity === null;
  const showInlineWarnings =
    searchWarnings.length > 0 && resolvedIdentity === null;
  if (!searchError && !showInlineSuccess && !showInlineWarnings) {
    return null;
  }
  return (
    <div className="space-y-2">
      {searchError ? (
        <ErrorMessage className="text-sm font-medium">{searchError}</ErrorMessage>
      ) : null}
      {showInlineSuccess ? (
        <Description className="text-muted text-sm font-medium">
          {searchSuccess}
        </Description>
      ) : null}
      {showInlineWarnings ? (
        <ul className="text-warning list-inside list-disc space-y-1 text-xs">
          {searchWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {pubChemUrl && resolvedIdentity === null ? (
        <a
          href={pubChemUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
          View on PubChem
        </a>
      ) : null}
    </div>
  );
}
