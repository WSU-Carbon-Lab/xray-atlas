"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  ContributionFileDropOverlay,
  type ContributionFileDropOverlayFileKind,
} from "~/components/contribute";
import type { MoleculeUploadData } from "~/types/upload";
import { SynonymTagGroupEditable } from "~/components/molecules/synonyms-list";
import {
  CategoryTagGroupEditable,
  type MoleculePendingTag,
} from "~/components/molecules/category-tags";
import { trpc } from "~/trpc/client";
import {
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  Button,
  Card,
  Chip,
  Description,
  ErrorMessage,
  Form,
  InputGroup,
  Label as HeroLabel,
  Separator,
  Spinner,
  TextField,
  Tooltip,
} from "@heroui/react";
import { parseMoleculeJsonFile } from "~/app/contribute/molecule/utils/parseMoleculeJson";
import { parseMoleculeCsvFile } from "~/app/contribute/molecule/utils/parseMoleculeCsv";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import type { MoleculeContributionFormProps } from "./types";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PubChemSearchResponse = RouterOutputs["external"]["searchPubchem"];
type PubChemSearchData = NonNullable<PubChemSearchResponse["data"]>;
type CasSearchResponse = RouterOutputs["external"]["searchCas"];
type CreateMoleculeResponse = RouterOutputs["molecules"]["create"];

export function MoleculeContributionForm({
  variant = "page",
  onCompleted,
  onClose,
  className = "",
}: MoleculeContributionFormProps = {}) {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const isModal = variant === "modal";

  const [formData, setFormData] = useState<MoleculeUploadData>({
    iupacName: "",
    commonName: "",
    synonyms: [],
    inchi: "",
    smiles: "",
    chemicalFormula: "",
    casNumber: null,
    pubchemCid: null,
    tagIds: [],
  });
  const [pendingTags, setPendingTags] = useState<MoleculePendingTag[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // PubChem search state
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingCAS, setIsSearchingCAS] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);
  const [searchWarnings, setSearchWarnings] = useState<string[]>([]);
  const [pubChemUrl, setPubChemUrl] = useState<string | null>(null);
  const [editingMoleculeId, setEditingMoleculeId] = useState<string | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFileType, setDraggedFileType] =
    useState<ContributionFileDropOverlayFileKind | null>(null);
  const [draggedFileName, setDraggedFileName] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  // tRPC hooks
  const utils = trpc.useUtils();
  const createMolecule = trpc.molecules.create.useMutation();
  const updateMolecule = trpc.molecules.update.useMutation();
  const setTags = trpc.molecules.setTags.useMutation();
  const findOrCreateTag = trpc.molecules.findOrCreateTag.useMutation();
  const uploadImage = trpc.molecules.uploadImage.useMutation();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const handlePubChemSearch = async () => {
    // Determine search type based on which field has a value
    const hasCommonName = formData.commonName.trim().length > 0;
    const hasCid = formData.pubchemCid && formData.pubchemCid.trim().length > 0;

    if (!hasCommonName && !hasCid) {
      setSearchError("Please enter a Common Name or PubChem CID");
      return;
    }

    setIsSearching(true);
    setIsSearchingCAS(false);
    setSearchError(null);
    setSearchSuccess(null);
    setSearchWarnings([]);
    setPubChemUrl(null);
    setSubmitStatus({ type: null, message: "" });

    try {
      if (hasCommonName) {
        try {
          const autosuggest = await utils.molecules.autosuggest.fetch({
            query: formData.commonName.trim(),
            limit: 1,
          });

          const top = autosuggest.results[0];

          if (
            top &&
            (top.matchType === "name_exact" || top.matchType === "name_prefix")
          ) {
            const moleculeIdFromSearch = top.id ?? null;
            const commonNameValue = top.commonName ?? "";
            const chemicalFormulaValue = top.chemicalFormula ?? "";
            const allSynonyms = Array.isArray(top.synonyms) ? top.synonyms : [];

            let tagIds: string[] = [];
            if (moleculeIdFromSearch) {
              try {
                const tagsData = await utils.molecules.getTags.fetch({
                  moleculeId: moleculeIdFromSearch,
                });
                tagIds = tagsData.map((t) => t.id);
              } catch {}
            }
            setFormData({
              iupacName: top.iupacName ?? "",
              commonName: commonNameValue,
              synonyms: allSynonyms.filter(Boolean),
              inchi: top.inchi ?? "",
              smiles: top.smiles ?? "",
              chemicalFormula: chemicalFormulaValue,
              casNumber: top.casNumber ?? null,
              pubchemCid: top.pubChemCid ?? null,
              tagIds,
            });
            setPendingTags([]);

            setEditingMoleculeId(moleculeIdFromSearch);

            if (top.imageUrl) {
              setImagePreview(top.imageUrl);
            }

            setSearchSuccess(
              `Found molecule in database: ${top.iupacName}. You can now edit and update it.`,
            );
            setIsSearching(false);
            return;
          }
        } catch (dbError: unknown) {
          // Continue to PubChem search if database search fails
          // tRPC throws errors, so we check if it's a NOT_FOUND error
          const trpcError =
            dbError && typeof dbError === "object"
              ? (dbError as { data?: { code?: string } })
              : null;
          if (trpcError?.data?.code !== "NOT_FOUND") {
            // Only log if it's not a "not found" error
            console.error("Database search error:", dbError);
          }
        }
      }

      let pubChemResponse: PubChemSearchResponse;

      if (hasCid) {
        pubChemResponse = await utils.external.searchPubchem.fetch({
          query: (formData.pubchemCid ?? "").trim(),
          type: "cid",
        });
      } else {
        const nameCandidates = Array.from(
          new Set(
            [
              formData.commonName.trim(),
              ...formData.synonyms.map((s) => s.trim()),
            ].filter((s) => s.length > 0 && s.length < 300),
          ),
        );
        if (nameCandidates.length === 0) {
          throw new Error("Please enter a Common Name or synonym to search");
        }
        let found: PubChemSearchResponse | null = null;
        for (const candidate of nameCandidates) {
          try {
            const res = await utils.external.searchPubchem.fetch({
              query: candidate,
              type: "name",
            });
            if (res.ok && res.data) {
              found = res;
              break;
            }
          } catch {
            // continue to next candidate
          }
        }
        if (!found) {
          throw new Error("Molecule not found in PubChem");
        }
        pubChemResponse = found;
      }

      if (!pubChemResponse.ok) {
        throw new Error("Molecule not found in PubChem");
      }

      if (pubChemResponse.data) {
        // Auto-populate form with search results
        const result: PubChemSearchData = pubChemResponse.data;

        const commonNameValue = result.commonName ?? "";
        const chemicalFormulaValue =
          result.chemicalFormula ?? formData.chemicalFormula ?? "";
        const sanitizedSynonyms =
          result.synonyms?.filter(
            (synonym): synonym is string =>
              typeof synonym === "string" && synonym.trim().length > 0,
          ) ?? [];

        const inchiFromResult = result.inchi ?? formData.inchi ?? "";
        const preferredCommonName =
          formData.commonName.trim().length > 0
            ? formData.commonName
            : commonNameValue;

        setFormData({
          iupacName: result.iupacName ?? formData.iupacName ?? "",
          commonName: preferredCommonName,
          synonyms: sanitizedSynonyms,
          inchi: inchiFromResult,
          smiles: result.smiles ?? formData.smiles ?? "",
          chemicalFormula: chemicalFormulaValue,
          casNumber: result.casNumber ?? formData.casNumber ?? null,
          pubchemCid: result.pubChemCid ?? formData.pubchemCid ?? null,
        });

        setSearchSuccess("PubChem search successful");
        const generatedPubChemUrl = result.pubChemCid
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${result.pubChemCid}`
          : null;
        setPubChemUrl(generatedPubChemUrl);

        const needsSmilesFromCas =
          !result.smiles?.trim() && (result.casNumber ?? "").trim().length > 0;
        if (needsSmilesFromCas) {
          try {
            const casDetail: CasSearchResponse =
              await utils.external.searchCas.fetch({
                casNumber: (result.casNumber ?? "").trim(),
              });
            if (
              casDetail.ok &&
              casDetail.data?.smiles?.trim() &&
              casDetail.data.casRegistryNumber
            ) {
              setFormData((prev) => ({
                ...prev,
                smiles: casDetail.data.smiles!.trim(),
                ...(casDetail.data.inchi?.trim() && {
                  inchi: casDetail.data.inchi.trim(),
                }),
              }));
            }
          } catch {
            // Non-fatal; form keeps existing smiles/inchi
          }
        }

        // If we have InChI but no CAS number, try to fetch CAS
        // First try InChI, then try all synonyms as fallback
        if (!result.casNumber) {
          setIsSearchingCAS(true);
          let casFound = false;

          // Try InChI first if available
          if (inchiFromResult) {
            try {
              const casData: CasSearchResponse =
                await utils.external.searchCas.fetch({
                  inchi: inchiFromResult,
                });

              if (casData.ok && casData.data?.casRegistryNumber) {
                setFormData((prev) => ({
                  ...prev,
                  casNumber: casData.data.casRegistryNumber,
                  ...(casData.data.inchi && { inchi: casData.data.inchi }),
                  ...(casData.data.smiles && { smiles: casData.data.smiles }),
                }));
                setSearchWarnings((prev) => {
                  const msg = "CAS Registry Number found via InChI search";
                  if (prev.some((w) => w === msg)) return prev;
                  return [...prev, msg];
                });
                casFound = true;
              }
            } catch (casError: unknown) {
              console.error("CAS InChI search error:", casError);
            }
          }

          // If InChI search didn't work, try searching with all synonyms
          if (!casFound) {
            const allNamesToSearch = [
              preferredCommonName,
              ...sanitizedSynonyms,
              ...formData.synonyms,
            ].filter(
              (name): name is string =>
                typeof name === "string" &&
                name.trim().length > 0 &&
                name.trim().length < 100,
            );

            // Remove duplicates and search in order
            const uniqueNames = Array.from(new Set(allNamesToSearch));

            for (const synonym of uniqueNames) {
              try {
                const casData: CasSearchResponse =
                  await utils.external.searchCas.fetch({
                    synonym,
                  });

                if (casData.ok && casData.data?.casRegistryNumber) {
                  setFormData((prev) => ({
                    ...prev,
                    casNumber: casData.data.casRegistryNumber,
                    ...(casData.data.inchi && { inchi: casData.data.inchi }),
                    ...(casData.data.smiles && { smiles: casData.data.smiles }),
                  }));
                  setSearchWarnings((prev) => {
                    const msg = `CAS Registry Number found via synonym search: "${synonym}"`;
                    if (prev.some((w) => w === msg)) return prev;
                    return [...prev, msg];
                  });
                  casFound = true;
                  break;
                }
              } catch (casError: unknown) {
                console.error(
                  `CAS synonym search error for "${synonym}":`,
                  casError,
                );
                // Continue to next synonym
              }
            }

            if (!casFound) {
              setSearchWarnings((prev) => {
                const msg = inchiFromResult
                  ? "CAS Registry Number not found via InChI or synonym search"
                  : "CAS Registry Number not found via synonym search";
                if (prev.some((w) => w === msg)) return prev;
                return [...prev, msg];
              });
            }
          }

          setIsSearchingCAS(false);
        }
      } else {
        throw new Error("Invalid response from PubChem search");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to search PubChem";

      // If PubChem search failed, try CAS search with InChI and synonyms
      const hasInChI = formData.inchi.trim().length > 0;
      const hasSynonyms =
        (formData.commonName?.trim().length ?? 0) > 0 ||
        formData.synonyms.length > 0;

      if ((hasInChI || hasSynonyms) && !formData.casNumber) {
        setIsSearchingCAS(true);
        let casFound = false;

        // Try InChI first if available
        if (hasInChI) {
          try {
            const casData: CasSearchResponse =
              await utils.external.searchCas.fetch({
                inchi: formData.inchi,
              });

            if (casData.ok && casData.data?.casRegistryNumber) {
              setFormData((prev) => ({
                ...prev,
                casNumber: casData.data.casRegistryNumber,
                ...(casData.data.inchi && { inchi: casData.data.inchi }),
                ...(casData.data.smiles && { smiles: casData.data.smiles }),
              }));
              setSearchError(
                `${errorMessage}. However, CAS Registry Number was found via InChI search.`,
              );
              casFound = true;
            }
          } catch (casError: unknown) {
            console.error("CAS InChI search error:", casError);
          }
        }

        // If InChI didn't work, try synonyms
        if (!casFound && hasSynonyms) {
          const allNamesToSearch = [
            formData.commonName,
            ...formData.synonyms,
          ].filter(
            (name): name is string =>
              typeof name === "string" &&
              name.trim().length > 0 &&
              name.trim().length < 100,
          );

          const uniqueNames = Array.from(new Set(allNamesToSearch));

          for (const synonym of uniqueNames) {
            try {
              const casData: CasSearchResponse =
                await utils.external.searchCas.fetch({
                  synonym,
                });

              if (casData.ok && casData.data?.casRegistryNumber) {
                setFormData((prev) => ({
                  ...prev,
                  casNumber: casData.data.casRegistryNumber,
                  ...(casData.data.inchi && { inchi: casData.data.inchi }),
                  ...(casData.data.smiles && { smiles: casData.data.smiles }),
                }));
                setSearchError(
                  `${errorMessage}. However, CAS Registry Number was found via synonym search: "${synonym}".`,
                );
                casFound = true;
                break;
              }
            } catch (casError: unknown) {
              console.error(
                `CAS synonym search error for "${synonym}":`,
                casError,
              );
            }
          }
        }

        if (!casFound) {
          setSearchError(errorMessage);
        }

        setIsSearchingCAS(false);
      } else {
        setSearchError(errorMessage);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const searchHandlerRef = useRef(handlePubChemSearch);
  searchHandlerRef.current = handlePubChemSearch;

  useEffect(() => {
    const commonName = formData.commonName.trim();
    const cid = (formData.pubchemCid ?? "").trim();
    if (commonName.length < 2 && cid.length < 1) return;
    const t = setTimeout(() => {
      void searchHandlerRef.current();
    }, 700);
    return () => clearTimeout(t);
  }, [formData.commonName, formData.pubchemCid]);

  const handleJsonDropped = useCallback(async (file: File) => {
    try {
      const parsed = await parseMoleculeJsonFile(file);
      setSearchError(null);
      setSearchSuccess(null);
      setSearchWarnings([]);
      setFormData((prev) => ({
        ...prev,
        commonName: parsed.commonName || prev.commonName,
        iupacName: parsed.iupacName || prev.iupacName,
        synonyms: parsed.synonyms.length > 0 ? parsed.synonyms : prev.synonyms,
        smiles: parsed.smiles || prev.smiles,
        inchi: parsed.inchi || prev.inchi,
        chemicalFormula: parsed.chemicalFormula || prev.chemicalFormula,
        casNumber: parsed.casNumber ?? prev.casNumber,
        pubchemCid: parsed.pubchemCid ?? prev.pubchemCid,
        tagIds: parsed.tagIds.length > 0 ? parsed.tagIds : (prev.tagIds ?? []),
      }));
      setPendingTags([]);
      setTimeout(() => {
        void searchHandlerRef.current();
      }, 150);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Failed to parse JSON file",
      );
    }
  }, []);

  const handleCsvDropped = useCallback(async (file: File) => {
    try {
      const parsed = await parseMoleculeCsvFile(file);
      setSearchError(null);
      setSearchSuccess(null);
      setSearchWarnings([]);
      setFormData((prev) => ({
        ...prev,
        commonName: parsed.commonName || prev.commonName,
        iupacName: parsed.iupacName || prev.iupacName,
        synonyms: parsed.synonyms.length > 0 ? parsed.synonyms : prev.synonyms,
        smiles: parsed.smiles || prev.smiles,
        inchi: parsed.inchi || prev.inchi,
        chemicalFormula: parsed.chemicalFormula || prev.chemicalFormula,
        casNumber: parsed.casNumber ?? prev.casNumber,
        pubchemCid: parsed.pubchemCid ?? prev.pubchemCid,
        tagIds: parsed.tagIds.length > 0 ? parsed.tagIds : (prev.tagIds ?? []),
      }));
      setPendingTags([]);
      setTimeout(() => {
        void searchHandlerRef.current();
      }, 150);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Failed to parse CSV file",
      );
    }
  }, []);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        const items = Array.from(e.dataTransfer?.items ?? []);
        const fileTypes = items
          .filter((item) => item.kind === "file")
          .map((item) => {
            const f = item.getAsFile();
            const name = f?.name.toLowerCase() ?? "";
            if (name.endsWith(".json")) return "json" as const;
            if (name.endsWith(".csv")) return "csv" as const;
            return null;
          })
          .filter((t): t is "csv" | "json" => t !== null);
        if (fileTypes.length > 0) {
          setIsDragging(true);
          const unique = Array.from(new Set(fileTypes));
          setDraggedFileType(unique.length === 1 ? unique[0]! : "mixed");
          const first = items.find((item) => item.kind === "file")?.getAsFile();
          if (first?.name) setDraggedFileName(first.name);
        }
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
        setDraggedFileType(null);
        setDraggedFileName(null);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      setDraggedFileType(null);
      setDraggedFileName(null);
      const files = Array.from(e.dataTransfer?.files ?? []).filter(
        (file) =>
          file.name.toLowerCase().endsWith(".json") ||
          file.name.toLowerCase().endsWith(".csv"),
      );
      const first = files[0];
      if (!first) return;
      if (first.name.toLowerCase().endsWith(".json")) {
        void handleJsonDropped(first);
      } else {
        void handleCsvDropped(first);
      }
    };
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleJsonDropped, handleCsvDropped]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      setSubmitStatus({
        type: "error",
        message: "Please sign in to upload molecules.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      let moleculeId: string | null = null;
      let actionVerb: "updated" | "uploaded" = "uploaded";
      let moleculeName = formData.iupacName;

      const pendingIds: string[] = [];
      for (const p of pendingTags) {
        const t = await findOrCreateTag.mutateAsync({
          name: p.name,
          color: p.color,
        });
        pendingIds.push(t.id);
      }
      if (pendingIds.length > 0) {
        void utils.molecules.listTags.invalidate();
      }
      const mergedTagIds = [
        ...new Set([...(formData.tagIds ?? []), ...pendingIds]),
      ];

      if (editingMoleculeId) {
        await updateMolecule.mutateAsync({
          moleculeId: editingMoleculeId,
          iupacName: formData.iupacName,
          commonNames: [
            formData.commonName.trim(),
            ...formData.synonyms.filter((s) => s.trim().length > 0),
          ],
          chemicalFormula: formData.chemicalFormula,
          SMILES: formData.smiles,
          InChI: formData.inchi,
          casNumber: formData.casNumber,
          pubChemCid: formData.pubchemCid,
        });
        await setTags.mutateAsync({
          moleculeId: editingMoleculeId,
          tagIds: mergedTagIds,
        });
        moleculeId = editingMoleculeId;
        actionVerb = "updated";
      } else {
        const createResult: CreateMoleculeResponse =
          await createMolecule.mutateAsync({
            ...formData,
            tagIds: mergedTagIds,
          });
        moleculeId = createResult.molecule?.id ?? null;
        moleculeName = createResult.molecule?.iupacName ?? moleculeName;
        actionVerb = createResult.updated ? "updated" : "uploaded";
      }

      if (imageFile && moleculeId) {
        try {
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(new Error("Failed to read image file"));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });

          await uploadImage.mutateAsync({
            moleculeId,
            imageData: base64Data,
          });
        } catch (imageError: unknown) {
          const imageMessage =
            imageError instanceof Error ? imageError.message : "Unknown error";
          console.error("Error uploading image:", imageError);
          setSubmitStatus({
            type: "success",
            message: `Molecule "${moleculeName}" ${actionVerb} successfully, but image upload failed: ${imageMessage}`,
          });
          return;
        }
      }

      setSubmitStatus({
        type: "success",
        message: `Molecule "${moleculeName}" ${actionVerb} successfully!`,
      });

      if (onCompleted) {
        onCompleted({ moleculeId: moleculeId ?? undefined });
      }
      if (isModal) {
        onClose?.();
      }

      setFormData({
        iupacName: "",
        commonName: "",
        synonyms: [],
        inchi: "",
        smiles: "",
        chemicalFormula: "",
        casNumber: null,
        pubchemCid: null,
        tagIds: [],
      });
      setPendingTags([]);
      setImageFile(null);
      setImagePreview("");
      setEditingMoleculeId(null); // Clear editing state after successful submit
    } catch (error: unknown) {
      console.error("Error during molecule upload:", error);
      const extractedMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
            ? (error as { data?: { message?: string } }).data?.message
            : null;
      const errorMessage =
        extractedMessage ??
        (typeof error === "string"
          ? error
          : "Failed to upload molecule. Please check the console for details.");

      setSubmitStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ContributionFileDropOverlay
        isDragging={isDragging}
        fileKind={draggedFileType ?? "mixed"}
        fileName={draggedFileName}
      />
      <Form
        onSubmit={handleSubmit}
        className={className ? `space-y-8 ${className}` : "space-y-8"}
      >
            <Card className="border-border bg-surface-1 border shadow-sm">
              <Card.Content className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-foreground text-lg font-semibold">
                    Identity and identifiers
                  </h2>
                  {editingMoleculeId ? (
                    <Chip size="sm" variant="soft" color="accent">
                      Editing existing record
                    </Chip>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <TextField
                      name="commonName"
                      value={formData.commonName}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          commonName: value,
                        }));
                        setSearchError(null);
                        setSearchSuccess(null);
                        setSearchWarnings([]);
                      }}
                      isRequired
                      variant="secondary"
                      fullWidth
                    >
                      <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                        Common Name{" "}
                        <span className="text-danger" aria-hidden>
                          *
                        </span>
                        <FieldTooltip description="The common or trade name for the molecule, such as 'PC61BM' or 'aspirin'. This is different from the systematic IUPAC name." />
                      </HeroLabel>
                      <InputGroup variant="secondary" fullWidth>
                        <InputGroup.Input
                          placeholder="e.g., PC61BM…"
                          autoComplete="off"
                        />
                      </InputGroup>
                    </TextField>

                    <TextField
                      name="pubchemCid"
                      value={formData.pubchemCid ?? ""}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          pubchemCid: value || null,
                        }));
                        setSearchError(null);
                        setSearchSuccess(null);
                        setSearchWarnings([]);
                      }}
                      variant="secondary"
                      fullWidth
                    >
                      <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                        PubChem CID
                        <FieldTooltip description="PubChem Compound Identifier. A unique numeric identifier used to reference the compound in the PubChem database. Enter a CID to search PubChem and auto-populate fields." />
                      </HeroLabel>
                      <InputGroup variant="secondary" fullWidth>
                        <InputGroup.Input
                          placeholder="e.g., 205…"
                          autoComplete="off"
                        />
                      </InputGroup>
                    </TextField>

                    <TextField
                      name="casNumber"
                      value={formData.casNumber ?? ""}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          casNumber: value || null,
                        }));
                        setSearchError(null);
                        setSearchSuccess(null);
                        setSearchWarnings([]);
                      }}
                      variant="secondary"
                      fullWidth
                    >
                      <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                        CAS
                        <FieldTooltip description="Chemical Abstracts Service Registry Number. A unique numeric identifier (format: XXX-XX-X) assigned to chemical substances by CAS. Used for precise chemical identification and regulatory compliance." />
                      </HeroLabel>
                      <InputGroup variant="secondary" fullWidth>
                        <InputGroup.Input
                          placeholder="e.g., 50-5-5…"
                          autoComplete="off"
                        />
                      </InputGroup>
                    </TextField>

                    <Tooltip delay={0}>
                      <Button
                        type="button"
                        variant="secondary"
                        isIconOnly
                        onPress={() => {
                          void handlePubChemSearch();
                        }}
                        isDisabled={
                          isSearching ||
                          isSearchingCAS ||
                          (!formData.commonName.trim() &&
                            !(formData.pubchemCid?.trim() ?? ""))
                        }
                        aria-label={
                          isSearching || isSearchingCAS
                            ? "Searching…"
                            : "Search PubChem and database"
                        }
                        className="h-11 w-11 shrink-0"
                      >
                        {isSearching || isSearchingCAS ? (
                          <Spinner className="h-5 w-5" />
                        ) : (
                          <MagnifyingGlassIcon className="h-5 w-5 shrink-0" />
                        )}
                      </Button>
                      <Tooltip.Content
                        placement="top"
                        className="bg-foreground text-background rounded-lg px-3 py-2 text-sm shadow-lg"
                      >
                        {isSearching || isSearchingCAS
                          ? "Searching…"
                          : "Look up PubChem or local database (also runs after you pause typing)"}
                      </Tooltip.Content>
                    </Tooltip>
                  </div>

                  {searchError ? (
                    <ErrorMessage className="text-sm font-medium">
                      {searchError}
                    </ErrorMessage>
                  ) : null}

                  {searchSuccess ? (
                    <div className="space-y-2">
                      <Description className="text-success text-sm font-medium">
                        {searchSuccess}
                      </Description>
                      {searchWarnings.length > 0 ? (
                        <ul className="text-warning list-inside list-disc space-y-1 text-xs">
                          {searchWarnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      ) : null}
                      {pubChemUrl ? (
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
                  ) : null}

                  <TextField
                    name="iupacName"
                    value={formData.iupacName}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, iupacName: value }))
                    }
                    isRequired
                    variant="secondary"
                    fullWidth
                  >
                    <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                      IUPAC Name{" "}
                      <span className="text-danger" aria-hidden>
                        *
                      </span>
                      <FieldTooltip description="The systematic IUPAC (International Union of Pure and Applied Chemistry) name. This is the standardized chemical nomenclature that uniquely identifies the molecular structure. Usually a long name with numbers and brackets." />
                    </HeroLabel>
                    <InputGroup variant="secondary" fullWidth>
                      <InputGroup.Input
                        placeholder="e.g., 2,2'-[[6,6,12,12-tetrakis(4-hexylphenyl)-…]…"
                        autoComplete="off"
                      />
                    </InputGroup>
                  </TextField>

                  <SynonymTagGroupEditable
                    synonyms={formData.synonyms}
                    onSynonymsChange={(synonyms) =>
                      setFormData((prev) => ({ ...prev, synonyms }))
                    }
                    allowRemove
                    label="Synonyms"
                    description={
                      <FieldTooltip description="Alternative names, aliases, or common designations for this molecule. Examples include trade names, abbreviations, or other chemical names. Each synonym can be added individually." />
                    }
                    addPlaceholder="Add a synonym (press Enter)…"
                  />

                  <CategoryTagGroupEditable
                    tagIds={formData.tagIds ?? []}
                    onTagIdsChange={(tagIds) =>
                      setFormData((prev) => ({ ...prev, tagIds }))
                    }
                    pendingTags={pendingTags}
                    onPendingTagsChange={setPendingTags}
                    deferNewTagPersistence
                    label="Category tags"
                    inlineLayout
                    description={
                      <FieldTooltip description="Optional tags to categorize this molecule (e.g. OPV, polymer). Used for filtering in browse." />
                    }
                  />

                  <TextField
                    name="smiles"
                    value={formData.smiles}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, smiles: value }))
                    }
                    isRequired
                    variant="secondary"
                    fullWidth
                  >
                    <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                      SMILES{" "}
                      <span className="text-danger" aria-hidden>
                        *
                      </span>
                      <FieldTooltip description="Simplified Molecular-Input Line-Entry System. A line notation that uses ASCII characters to describe the molecular structure. Example: 'CCO' represents ethanol (C-C-O). Canonical SMILES is preferred when available." />
                    </HeroLabel>
                    <InputGroup variant="secondary" fullWidth>
                      <InputGroup.Input
                        className="font-mono text-sm"
                        placeholder="e.g., CC1=C(C2=C(S1)C=C3……"
                        autoComplete="off"
                      />
                    </InputGroup>
                  </TextField>

                  <TextField
                    name="inchi"
                    value={formData.inchi}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, inchi: value }))
                    }
                    isRequired
                    variant="secondary"
                    fullWidth
                  >
                    <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                      InChI{" "}
                      <span className="text-danger" aria-hidden>
                        *
                      </span>
                      <FieldTooltip description="International Chemical Identifier. A standardized textual identifier for chemical substances that encodes molecular structure. Always starts with 'InChI=1S/' or 'InChI=1/' followed by layers of structural information." />
                    </HeroLabel>
                    <InputGroup variant="secondary" fullWidth>
                      <InputGroup.Input
                        className="font-mono text-sm"
                        placeholder="e.g., InChI=1S/C82H86F4N8O2S5/c1-15-…"
                        autoComplete="off"
                      />
                    </InputGroup>
                  </TextField>

                  <TextField
                    name="chemicalFormula"
                    value={formData.chemicalFormula}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        chemicalFormula: value,
                      }))
                    }
                    isRequired
                    variant="secondary"
                    fullWidth
                  >
                    <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                      Chemical Formula{" "}
                      <span className="text-danger" aria-hidden>
                        *
                      </span>
                      <FieldTooltip description="The molecular formula showing the number of atoms of each element in the molecule. Written with element symbols and subscripts, such as 'C82H86F4N8O2S5'. Elements are typically listed in Hill order (C, H, then others alphabetically)." />
                    </HeroLabel>
                    <InputGroup variant="secondary" fullWidth>
                      <InputGroup.Input
                        placeholder="e.g., C82H86F4N8O2S5…"
                        autoComplete="off"
                      />
                    </InputGroup>
                  </TextField>
                </div>
              </Card.Content>
            </Card>

            <Card className="border-border bg-surface-1 border shadow-sm">
              <Card.Content className="space-y-4 p-5 sm:p-6">
                <h2 className="text-foreground text-lg font-semibold">
                  Structure image
                </h2>
                <Description className="text-muted text-sm">
                  Prefer a high-quality depiction (e.g. SVG export). Use CPK
                  element colors and simplified side chains when possible.
                </Description>

                {imagePreview ? (
                  <div className="relative w-full">
                    <div className="border-border bg-surface relative aspect-square w-full overflow-hidden rounded-xl border">
                      <Image
                        src={imagePreview}
                        alt="Molecule structure preview"
                        fill
                        unoptimized
                        className="object-contain"
                        sizes="(max-width: 896px) 100vw, min(896px, 100vw)"
                      />
                    </div>
                    <Tooltip delay={0}>
                      <Button
                        type="button"
                        variant="primary"
                        isIconOnly
                        onPress={removeImage}
                        aria-label="Remove molecule image"
                        className="absolute top-2 right-2"
                      >
                        <XMarkIcon className="h-5 w-5 shrink-0" />
                      </Button>
                      <Tooltip.Content
                        placement="left"
                        className="bg-foreground text-background rounded-lg px-3 py-2 text-sm shadow-lg"
                      >
                        Remove image
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                ) : (
                  <label className="border-border bg-surface group hover:border-accent relative flex min-h-36 w-full cursor-pointer items-center justify-between gap-4 overflow-hidden rounded-xl border-2 border-dashed px-5 py-5 text-left transition-colors duration-200 hover:shadow-md">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-accent text-xs font-semibold tracking-wide uppercase">
                        Upload image
                      </span>
                      <span className="text-foreground text-sm">
                        Click or drop PNG, JPG, or GIF (about 10MB max)
                      </span>
                    </div>
                    <PhotoIcon
                      className="text-muted group-hover:text-accent hidden h-12 w-12 shrink-0 md:block"
                      aria-hidden
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                )}
              </Card.Content>
            </Card>

            <Separator className="bg-border" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted text-xs sm:max-w-sm">
                {editingMoleculeId
                  ? "Submit updates the existing molecule record and optional new image."
                  : "Submit creates a new molecule when the record is not already linked from search."}
              </p>
              <Button
                type="submit"
                variant="primary"
                isDisabled={isSubmitting}
                className="inline-flex items-center gap-2"
                aria-label={isSubmitting ? "Uploading…" : "Upload molecule"}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <DocumentArrowUpIcon className="h-4 w-4 shrink-0" />
                    <span>Upload molecule</span>
                  </>
                )}
              </Button>
            </div>

            {submitStatus.type ? (
              <div
                className={
                  submitStatus.type === "success"
                    ? "border-success/50 bg-success/10 text-foreground rounded-xl border p-4"
                    : "border-error/50 bg-error/10 text-foreground rounded-xl border p-4"
                }
              >
                {submitStatus.message}
              </div>
            ) : null}
      </Form>
    </>
  );
}
