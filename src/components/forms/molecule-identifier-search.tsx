"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import {
  Button,
  Description,
  ErrorMessage,
  InputGroup,
  Label,
  Spinner,
  Tab,
  Tabs,
  TextField,
} from "@heroui/react";
import {
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  FingerPrintIcon,
  MagnifyingGlassIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { CatalogSearchChrome } from "~/components/browse/catalog-search-chrome";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  applyCompoundKindSuggestionIfDefault,
  applyPubChemResultToForm,
  createLookupRequestGeneration,
  firstTrimmedNonEmpty,
  MoleculeStructureSearchTab,
  readPubChemCidCache,
  trimmedOrNull,
  writePubChemCidCache,
  type MoleculeIdentifierSearchMode,
  type MoleculeLookupCandidate,
  type MoleculePendingLookup,
  type MoleculeResolvedIdentity,
} from "~/features/molecule-registry-workflow";
import type { PubChemCandidateSummary } from "~/lib/pubchem-compound";
import { trpc } from "~/trpc/client";
import type { MoleculeUploadData } from "~/types/upload";

export type { MoleculeResolvedIdentity } from "~/features/molecule-registry-workflow";

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
  onPendingLookup: (pending: MoleculePendingLookup) => void;
  onClearSearchFeedback: () => void;
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
  matchType: string;
};

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

/** Imperative handle for structure-initiated PubChem identifier lookup. */
export type MoleculeIdentifierSearchHandle = {
  lookupFromSmiles: (smiles: string) => Promise<void>;
  selectPubChemCandidate: (candidate: PubChemCandidateSummary) => Promise<void>;
};

const PUBCHEM_DEBOUNCE_MS = 320;

function pubchemSynonyms(result: PubChemLookupResult): string[] {
  return (
    result.synonyms?.filter(
      (synonym): synonym is string =>
        typeof synonym === "string" && synonym.trim().length > 0,
    ) ?? []
  );
}

function toLookupCandidates(
  candidates: PubChemCandidateSummary[],
  previewSmiles: string | null,
): MoleculeLookupCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    previewSmiles,
  }));
}

/**
 * Unified identifier search for the molecule registry form: Name, ID, and
 * Structure tabs with confirmation-before-apply lookup results.
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
    onPendingLookup,
    onClearSearchFeedback,
    structureSmiles = "",
    onStructureLookupBusyChange,
  },
  ref,
) {
  const utils = trpc.useUtils();
  const listboxId = useId();
  const statusLiveId = useId();
  const lookupGeneration = useRef(createLookupRequestGeneration());
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  const [searchMode, setSearchMode] =
    useState<MoleculeIdentifierSearchMode>("name");
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
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    setQuery(formData.commonName);
  }, [formData.commonName]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), PUBCHEM_DEBOUNCE_MS);
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

  const reportError = useCallback(
    (message: string, generation: number) => {
      if (!lookupGeneration.current.isCurrent(generation)) {
        return;
      }
      setLocalError(message);
      onSearchComplete({
        searchError: message,
        searchSuccess: null,
        searchWarnings: [],
        pubChemUrl: null,
        resolvedIdentity: null,
      });
    },
    [onSearchComplete],
  );

  const queuePendingLookup = useCallback(
    (pending: MoleculePendingLookup, generation: number) => {
      if (!lookupGeneration.current.isCurrent(generation)) {
        return;
      }
      onPendingLookup(pending);
      onSearchComplete({
        searchError: null,
        searchSuccess: null,
        searchWarnings: pending.warnings,
        pubChemUrl: pending.pubChemUrl,
        resolvedIdentity: null,
      });
      setLocalError(null);
      setManualPubChemCandidates([]);
      setShowDropdown(false);
    },
    [onPendingLookup, onSearchComplete],
  );

  const buildAtlasPending = useCallback(
    async (
      hit: AutosuggestHit,
      generation: number,
    ): Promise<MoleculePendingLookup | null> => {
      const moleculeId = hit.id ?? null;
      let tagIds: string[] = [];
      if (moleculeId) {
        try {
          const tagsData = await utils.molecules.getTags.fetch({ moleculeId });
          if (!lookupGeneration.current.isCurrent(generation)) {
            return null;
          }
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
      const displayName = firstTrimmedNonEmpty(
        hit.iupacName,
        hit.commonName,
        query,
      );
      const formPatch: Partial<MoleculeUploadData> = {
        iupacName: hit.iupacName ?? "",
        commonName: hit.commonName ?? query.trim(),
        synonyms: atlasSynonyms,
        inchi: hit.inchi ?? "",
        smiles: hit.smiles ?? "",
        chemicalFormula: hit.chemicalFormula ?? "",
        casNumber: hit.casNumber ?? null,
        pubchemCid: hit.pubChemCid ?? null,
      };
      const suggestion = applyCompoundKindSuggestionIfDefault(
        displayName,
        formPatch.chemicalFormula ?? "",
        formData.compoundKind,
      );
      return {
        identity: {
          source: "atlas",
          displayName,
          chemicalFormula: trimmedOrNull(hit.chemicalFormula),
          pubChemCid: trimmedOrNull(hit.pubChemCid),
          casNumber: trimmedOrNull(hit.casNumber),
          atlasMoleculeId: moleculeId,
          casVerified: Boolean(hit.casNumber?.trim()),
          statusDetail: null,
          previewSmiles: trimmedOrNull(hit.smiles),
        },
        formPatch,
        editingMoleculeId: moleculeId,
        importedSynonyms: atlasSynonyms,
        warnings: [],
        pubChemUrl: hit.pubChemCid
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${hit.pubChemCid}`
          : null,
        tagIds,
        compoundKindSuggestion: suggestion.suggested ? suggestion : null,
      };
    },
    [formData.compoundKind, query, utils.molecules.getTags],
  );

  const enrichPubChemWithCas = useCallback(
    async (
      result: PubChemLookupResult,
      commonName: string,
      lookupLabel: string,
      options?: { preserveDrawnSmiles?: string },
    ): Promise<{ warnings: string[]; casNumber: string | null; result: PubChemLookupResult }> => {
      const preserveDrawnSmiles = options?.preserveDrawnSmiles?.trim() ?? "";
      const warnings: string[] = [];
      let resolvedCas = (result.casNumber ?? "").trim() || null;
      let enriched = { ...result };
      const needsCas = !resolvedCas;
      const needsSmiles = !result.smiles?.trim();
      if (!needsCas && !needsSmiles) {
        return { warnings, casNumber: resolvedCas, result: enriched };
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
          enriched = {
            ...enriched,
            casNumber: detailCas ?? enriched.casNumber,
            inchi: detailInchi ?? enriched.inchi,
            smiles:
              preserveDrawnSmiles.length > 0
                ? preserveDrawnSmiles
                : needsSmiles && detailSmiles
                  ? detailSmiles
                  : enriched.smiles,
          };
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
      return { warnings, casNumber: resolvedCas, result: enriched };
    },
    [utils.external.searchCas],
  );

  const buildPubChemPending = useCallback(
    async (
      result: PubChemLookupResult,
      lookupQuery: string,
      generation: number,
      options?: { preserveDrawnSmiles?: string; fillEmptyFieldsOnly?: boolean },
    ): Promise<MoleculePendingLookup | null> => {
      const { warnings, casNumber, result: enriched } =
        await enrichPubChemWithCas(
          result,
          lookupQuery,
          lookupQuery,
          options,
        );
      if (!lookupGeneration.current.isCurrent(generation)) {
        return null;
      }
      const importedSynonyms = pubchemSynonyms(enriched);
      const displayName = firstTrimmedNonEmpty(
        enriched.title,
        enriched.iupacName,
        enriched.commonName,
        lookupQuery,
      );
      const draft = applyPubChemResultToForm(
        { ...enriched, casNumber },
        lookupQuery,
        options,
      )(formData);
      const suggestion = applyCompoundKindSuggestionIfDefault(
        displayName,
        draft.chemicalFormula,
        formData.compoundKind,
      );
      return {
        identity: {
          source: "pubchem",
          displayName,
          chemicalFormula: trimmedOrNull(enriched.chemicalFormula),
          pubChemCid: trimmedOrNull(enriched.pubChemCid),
          casNumber: trimmedOrNull(casNumber),
          atlasMoleculeId: null,
          casVerified: Boolean(casNumber && casNumber.length > 0),
          statusDetail: null,
          previewSmiles: trimmedOrNull(
            options?.preserveDrawnSmiles ?? enriched.smiles ?? null,
          ),
        },
        formPatch: draft,
        editingMoleculeId: null,
        importedSynonyms,
        warnings,
        pubChemUrl: enriched.pubChemCid
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${enriched.pubChemCid}`
          : null,
        tagIds: [],
        compoundKindSuggestion: suggestion.suggested ? suggestion : null,
      };
    },
    [enrichPubChemWithCas, formData],
  );

  const applyDatabaseHit = useCallback(
    async (hit: AutosuggestHit) => {
      const generation = lookupGeneration.current.next();
      onClearSearchFeedback();
      setIsSearching(true);
      try {
        const pending = await buildAtlasPending(hit, generation);
        if (pending) {
          queuePendingLookup(pending, generation);
          setQuery(hit.commonName ?? query.trim());
        }
      } finally {
        if (lookupGeneration.current.isCurrent(generation)) {
          setIsSearching(false);
        }
      }
    },
    [buildAtlasPending, onClearSearchFeedback, queuePendingLookup, query],
  );

  const resolvePubChemByCid = useCallback(
    async (
      cid: string,
      lookupQuery: string,
      generation: number,
      options?: { preserveDrawnSmiles?: string; fillEmptyFieldsOnly?: boolean },
    ) => {
      const cached = readPubChemCidCache(cid);
      const pubChemResponse =
        cached !== null
          ? { ok: true as const, data: cached }
          : await utils.external.searchPubchem.fetch({
              query: cid,
              type: "cid",
            });
      if (!lookupGeneration.current.isCurrent(generation)) {
        return null;
      }
      if (!pubChemResponse.ok || !pubChemResponse.data) {
        throw new Error("Molecule not found in PubChem.");
      }
      if (cached === null) {
        writePubChemCidCache(cid, pubChemResponse.data);
      }
      return buildPubChemPending(
        pubChemResponse.data,
        lookupQuery,
        generation,
        options,
      );
    },
    [buildPubChemPending, utils.external.searchPubchem],
  );

  const selectPubChemCandidate = useCallback(
    async (candidate: PubChemCandidateSummary) => {
      const generation = lookupGeneration.current.next();
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
        const pending = await resolvePubChemByCid(
          candidate.cid,
          drawnSmiles.length > 0 ? drawnSmiles : query.trim(),
          generation,
          applyOptions,
        );
        if (pending) {
          queuePendingLookup(pending, generation);
        }
        setStructureLookupSmiles(null);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "PubChem lookup failed.";
        reportError(message, generation);
      } finally {
        if (lookupGeneration.current.isCurrent(generation)) {
          setIsSearching(false);
          setIsSearchingCas(false);
        }
      }
    },
    [
      onClearSearchFeedback,
      query,
      queuePendingLookup,
      reportError,
      resolvePubChemByCid,
      structureLookupSmiles,
    ],
  );

  const runExternalLookup = useCallback(async () => {
    const generation = lookupGeneration.current.next();
    const commonName = query.trim();
    const cid = (formData.pubchemCid ?? "").trim();
    const cas = (formData.casNumber ?? "").trim();

    if (commonName.length < 2 && cid.length === 0 && cas.length === 0) {
      reportError(
        "Enter a common name (2+ characters), PubChem CID, or CAS number to search.",
        generation,
      );
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
        if (!lookupGeneration.current.isCurrent(generation)) {
          return;
        }
        const top = autosuggest.results[0];
        if (
          top &&
          (top.matchType === "name_exact" || top.matchType === "name_prefix")
        ) {
          await applyDatabaseHit(top as AutosuggestHit);
          return;
        }
      }

      if (cid.length > 0) {
        const pending = await resolvePubChemByCid(cid, commonName, generation);
        if (pending) {
          queuePendingLookup(pending, generation);
        }
        return;
      }

      if (cas.length > 0) {
        const casResponse = await utils.external.searchCas.fetch({ casNumber: cas });
        if (!lookupGeneration.current.isCurrent(generation)) {
          return;
        }
        if (!casResponse.ok || !casResponse.data) {
          throw new Error("Compound not found for that CAS number.");
        }
        const casData = casResponse.data;
        const casDisplayName = firstTrimmedNonEmpty(
          casData.moleculeName,
          commonName,
          cas,
        );
        const formPatch: Partial<MoleculeUploadData> = {
          casNumber: casData.casRegistryNumber ?? cas,
          inchi: casData.inchi?.trim() ?? "",
          smiles: casData.smiles?.trim() ?? "",
          commonName: casData.moleculeName?.trim() ?? commonName,
          iupacName: casData.moleculeName?.trim() ?? "",
        };
        const suggestion = applyCompoundKindSuggestionIfDefault(
          casDisplayName,
          formData.chemicalFormula,
          formData.compoundKind,
        );
        queuePendingLookup(
          {
            identity: {
              source: "cas",
              displayName: casDisplayName,
              chemicalFormula: null,
              pubChemCid: null,
              casNumber: trimmedOrNull(casData.casRegistryNumber) ?? cas,
              atlasMoleculeId: null,
              casVerified: true,
              statusDetail: null,
              previewSmiles: trimmedOrNull(casData.smiles),
            },
            formPatch,
            editingMoleculeId: null,
            importedSynonyms: [],
            warnings: [],
            pubChemUrl: null,
            tagIds: [],
            compoundKindSuggestion: suggestion.suggested ? suggestion : null,
          },
          generation,
        );
        return;
      }

      const candidateResponse = await utils.external.searchPubchemCandidates.fetch({
        query: commonName,
        limit: 10,
      });
      if (!lookupGeneration.current.isCurrent(generation)) {
        return;
      }
      const candidates = candidateResponse.candidates;
      if (candidates.length === 0) {
        throw new Error("Molecule not found in PubChem.");
      }
      if (candidates.length === 1) {
        await selectPubChemCandidate(candidates[0]!);
        return;
      }

      const previewSmiles = structureLookupSmiles?.trim() ?? null;
      queuePendingLookup(
        {
          identity: {
            source: "pubchem",
            displayName: commonName,
            chemicalFormula: null,
            pubChemCid: null,
            casNumber: null,
            atlasMoleculeId: null,
            casVerified: false,
            statusDetail: "Multiple PubChem matches",
            previewSmiles,
          },
          formPatch: {},
          editingMoleculeId: null,
          importedSynonyms: [],
          warnings: [],
          pubChemUrl: null,
          tagIds: [],
          compoundKindSuggestion: null,
          candidates: toLookupCandidates(candidates, previewSmiles),
        },
        generation,
      );
      setShowDropdown(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Identifier lookup failed.";
      reportError(message, generation);
    } finally {
      if (lookupGeneration.current.isCurrent(generation)) {
        setIsSearching(false);
        setIsSearchingCas(false);
      }
    }
  }, [
    applyDatabaseHit,
    formData.casNumber,
    formData.chemicalFormula,
    formData.compoundKind,
    formData.pubchemCid,
    onClearSearchFeedback,
    query,
    queuePendingLookup,
    reportError,
    resolvePubChemByCid,
    selectPubChemCandidate,
    structureLookupSmiles,
    utils.external.searchCas,
    utils.external.searchPubchemCandidates,
    utils.molecules.autosuggest,
  ]);

  const lookupFromSmiles = useCallback(
    async (smiles: string) => {
      const generation = lookupGeneration.current.next();
      const trimmedSmiles = smiles.trim();
      if (trimmedSmiles.length === 0) {
        reportError(
          "Draw or enter a SMILES string before looking up identifiers.",
          generation,
        );
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
        if (!lookupGeneration.current.isCurrent(generation)) {
          return;
        }
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
        if (!lookupGeneration.current.isCurrent(generation)) {
          return;
        }
        const candidates = candidateResponse.candidates;
        if (candidates.length === 0) {
          throw new Error("No PubChem match for this SMILES.");
        }
        if (candidates.length > 1) {
          setStructureLookupSmiles(trimmedSmiles);
          queuePendingLookup(
            {
              identity: {
                source: "pubchem",
                displayName: trimmedSmiles,
                chemicalFormula: null,
                pubChemCid: null,
                casNumber: null,
                atlasMoleculeId: null,
                casVerified: false,
                statusDetail: "Multiple PubChem matches",
                previewSmiles: trimmedSmiles,
              },
              formPatch: { smiles: trimmedSmiles },
              editingMoleculeId: null,
              importedSynonyms: [],
              warnings: [],
              pubChemUrl: null,
              tagIds: [],
              compoundKindSuggestion: null,
              candidates: toLookupCandidates(candidates, trimmedSmiles),
            },
            generation,
          );
          return;
        }

        setStructureLookupSmiles(trimmedSmiles);
        const pending = await resolvePubChemByCid(
          candidates[0]!.cid,
          trimmedSmiles,
          generation,
          {
            preserveDrawnSmiles: trimmedSmiles,
            fillEmptyFieldsOnly: true,
          },
        );
        if (pending) {
          queuePendingLookup(pending, generation);
        }
        setStructureLookupSmiles(null);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "PubChem lookup from structure failed.";
        reportError(message, generation);
      } finally {
        if (lookupGeneration.current.isCurrent(generation)) {
          setIsSearching(false);
          setIsSearchingCas(false);
          onStructureLookupBusyChange?.(false);
        }
      }
    },
    [
      applyDatabaseHit,
      onClearSearchFeedback,
      onStructureLookupBusyChange,
      queuePendingLookup,
      reportError,
      resolvePubChemByCid,
      utils.external.searchPubchemCandidates,
      utils.molecules.autosuggest,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      lookupFromSmiles,
      selectPubChemCandidate,
    }),
    [lookupFromSmiles, selectPubChemCandidate],
  );

  const searchBusy = isSearching || isSearchingCas;
  const dropdownLoading =
    isSuggesting || isPubchemSuggesting || searchBusy;
  const isDark = themeMounted && resolvedTheme === "dark";

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
                className="hover:bg-default/40 focus:bg-default/40 focus-visible:ring-accent w-full px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2"
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
                className="hover:bg-default/40 focus:bg-default/40 focus-visible:ring-accent w-full px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2"
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
      <Tabs
        selectedKey={searchMode}
        onSelectionChange={(key) => {
          if (typeof key === "string") {
            setSearchMode(key as MoleculeIdentifierSearchMode);
          }
        }}
        className="w-full"
      >
        <Tabs.List
          aria-label="Molecule lookup method"
          className="border-border bg-surface-2 w-full rounded-lg border p-1"
        >
          <Tab id="name" className="flex-1">
            <TagIcon className="mr-1.5 inline h-4 w-4 shrink-0" aria-hidden />
            Name
          </Tab>
          <Tab id="id" className="flex-1">
            <FingerPrintIcon className="mr-1.5 inline h-4 w-4 shrink-0" aria-hidden />
            ID
          </Tab>
          <Tab id="structure" className="flex-1">
            <BeakerIcon className="mr-1.5 inline h-4 w-4 shrink-0" aria-hidden />
            Structure
          </Tab>
        </Tabs.List>

        <Tabs.Panel id="name" className="pt-4">
          <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
            Search catalog or external names
            <FieldTooltip description="Atlas catalog hits, PubChem name or formula matches, and CAS cross-check on selection." />
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
                } else {
                  void runExternalLookup();
                }
              }
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel id="id" className="space-y-4 pt-4">
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
                <FingerPrintIcon className="h-4 w-4" aria-hidden />
                PubChem CID
              </Label>
              <InputGroup variant="secondary" fullWidth>
                <InputGroup.Input placeholder="e.g., 241" autoComplete="off" />
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
                <FingerPrintIcon className="h-4 w-4" aria-hidden />
                CAS registry number
              </Label>
              <InputGroup variant="secondary" fullWidth>
                <InputGroup.Input placeholder="e.g., 50-00-0" autoComplete="off" />
              </InputGroup>
            </TextField>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onPress={() => {
              void runExternalLookup();
            }}
            isDisabled={searchBusy}
          >
            {searchBusy ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <MagnifyingGlassIcon className="h-4 w-4" />
            )}
            Look up by ID
          </Button>
        </Tabs.Panel>

        <Tabs.Panel id="structure" className="pt-4">
          <MoleculeStructureSearchTab
            isDark={isDark}
            lookupBusy={searchBusy}
            onSmilesReady={(smiles) => {
              void lookupFromSmiles(smiles);
            }}
          />
        </Tabs.Panel>
      </Tabs>

      <div id={statusLiveId} aria-live="polite" aria-atomic="true" className="sr-only">
        {searchBusy ? "Searching identifiers" : localError ?? ""}
      </div>

      {localError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {localError}
        </ErrorMessage>
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
 * Renders transient lookup feedback beneath the identifier search row.
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
    <div className="space-y-2" aria-live="polite">
      {searchError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {searchError}
        </ErrorMessage>
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
          className="text-accent focus-visible:ring-accent inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
          View on PubChem
        </a>
      ) : null}
    </div>
  );
}
