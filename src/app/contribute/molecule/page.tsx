"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { DefaultButton as Button } from "@/components/ui/button";
import { ContributionAgreementModal } from "@/components/contribute";
import type { MoleculeUploadData } from "~/types/upload";
import {
  MoleculeDisplay,
  type DisplayMolecule,
} from "@/components/molecules/molecule-display";
import { SynonymTagGroupEditable } from "@/components/molecules/synonyms-list";
import { CategoryTagGroupEditable } from "@/components/molecules/category-tags";
import { trpc } from "~/trpc/client";
import {
  DocumentArrowUpIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { FieldTooltip } from "@/components/ui/field-tooltip";
import { SearchIcon } from "@/components/icons";
import { Label, Input as HeroInput } from "@heroui/react";
import { parseMoleculeJsonFile } from "~/app/contribute/molecule/utils/parseMoleculeJson";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type MoleculeSearchResponse = RouterOutputs["molecules"]["search"];
type MoleculeSearchData = NonNullable<MoleculeSearchResponse["data"]>;
type PubChemSearchResponse = RouterOutputs["external"]["searchPubchem"];
type PubChemSearchData = NonNullable<PubChemSearchResponse["data"]>;
type CasSearchResponse = RouterOutputs["external"]["searchCas"];
type CreateMoleculeResponse = RouterOutputs["molecules"]["create"];

const formInputClass =
  "w-full rounded-xl border border-zinc-300 bg-zinc-50/80 px-4 py-2.5 text-zinc-900 placeholder:text-zinc-500 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-0 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-400";

type MoleculeContributePageProps = {
  variant?: "page" | "modal";
  onCompleted?: (payload: { moleculeId?: string }) => void;
  onClose?: () => void;
};

export default function MoleculeContributePage({
  variant = "page",
  onCompleted,
  onClose,
}: MoleculeContributePageProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const isModal = variant === "modal";

  const handleAgreementAccepted = () => {
    setShowAgreementModal(false);
  };
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
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const dragCounterRef = useRef(0);

  // tRPC hooks
  const utils = trpc.useUtils();
  const createMolecule = trpc.molecules.create.useMutation();
  const updateMolecule = trpc.molecules.update.useMutation();
  const setTags = trpc.molecules.setTags.useMutation();
  const uploadImage = trpc.molecules.uploadImage.useMutation();
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
      // First, search the database for common name matches
      // Only search database if we have a common name (not CID-only searches)
      if (hasCommonName) {
        try {
          const dbSearchData: MoleculeSearchResponse =
            await utils.molecules.search.fetch({
              query: formData.commonName.trim(),
            });

          if (dbSearchData.ok && dbSearchData.data) {
            // Found in database - populate form
            const result: MoleculeSearchData = dbSearchData.data;

            // Handle commonName - tRPC returns it as a string (first synonym or iupacname)
            const commonNameValue =
              typeof result.commonName === "string"
                ? result.commonName
                : (result.commonName ?? "");

            // Handle chemicalFormula - may be string or array
            const chemicalFormulaValue = Array.isArray(result.chemicalFormula)
              ? result.chemicalFormula.join(", ")
              : (result.chemicalFormula ?? "");

            // Synonyms array is already provided by tRPC
            const allSynonyms = Array.isArray(result.synonyms)
              ? result.synonyms
              : [];

            const moleculeIdFromSearch = result.id ?? null;
            let tagIds: string[] = [];
            if (moleculeIdFromSearch) {
              try {
                const tagsData = await utils.molecules.getTags.fetch({
                  moleculeId: moleculeIdFromSearch,
                });
                tagIds = tagsData.map((t) => t.id);
              } catch {
                // leave tagIds empty if fetch fails
              }
            }
            setFormData({
              iupacName: result.iupacName ?? "",
              commonName: commonNameValue,
              synonyms: allSynonyms.filter(Boolean),
              inchi: result.inchi ?? "",
              smiles: result.smiles ?? "",
              chemicalFormula: chemicalFormulaValue,
              casNumber: result.casNumber ?? null,
              pubchemCid: result.pubChemCid ?? null,
              tagIds,
            });

            setEditingMoleculeId(moleculeIdFromSearch);

            // Set image preview if available from database
            if (result.imageUrl) {
              setImagePreview(result.imageUrl);
              // Note: We set the preview URL, but don't set imageFile since it's already uploaded
              // The user can still upload a new image if they want to replace it
            }

            setSearchSuccess(
              `Found molecule in database: ${result.iupacName}. You can now edit and update it.`,
            );
            setIsSearching(false);
            return; // Stop here - don't search PubChem
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
      setTimeout(() => {
        void searchHandlerRef.current();
      }, 150);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Failed to parse JSON file",
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
        const hasJson = items.some((item) => {
          if (item.kind !== "file") return false;
          const f = item.getAsFile();
          return f?.name.toLowerCase().endsWith(".json");
        });
        if (hasJson) setIsDraggingJson(true);
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
      if (dragCounterRef.current === 0) setIsDraggingJson(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingJson(false);
      const files = Array.from(e.dataTransfer?.files ?? []).filter((file) =>
        file.name.toLowerCase().endsWith(".json"),
      );
      const jsonFile = files[0];
      if (jsonFile) void handleJsonDropped(jsonFile);
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
  }, [handleJsonDropped]);

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
          tagIds: formData.tagIds ?? [],
        });
        moleculeId = editingMoleculeId;
        actionVerb = "updated";
      } else {
        const createResult: CreateMoleculeResponse =
          await createMolecule.mutateAsync(formData);
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

  const previewMolecule: DisplayMolecule | null =
    (formData.iupacName ?? formData.commonName)
      ? {
          name: formData.iupacName ?? formData.commonName ?? "",
          iupacName: formData.iupacName ?? formData.commonName ?? "",
          commonName: formData.commonName
            ? [formData.commonName, ...formData.synonyms]
            : formData.synonyms,
          chemicalFormula: formData.chemicalFormula ?? "",
          SMILES: formData.smiles ?? "",
          InChI: formData.inchi ?? "",
          imageUrl: imagePreview ?? undefined,
          pubChemCid: formData.pubchemCid ?? null,
          casNumber: formData.casNumber ?? null,
          id: "",
          favoriteCount: 0,
          userHasFavorited: false,
        }
      : null;

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-slate-100">
          Contribute Molecule
        </h1>
        <p className="mb-8 text-slate-600 dark:text-slate-400">
          Please sign in to contribute molecules to the X-ray Atlas database.
        </p>
      </div>
    );
  }

  return (
    <>
      <ContributionAgreementModal
        isOpen={showAgreementModal}
        onClose={() => {
          if (isModal) {
            onClose?.();
          } else {
            router.push("/contribute");
          }
        }}
        onAgree={handleAgreementAccepted}
      />
      <div className={`${isModal ? "" : "container mx-auto"} px-4 py-8`}>
        <div className="mx-auto max-w-6xl">
          {!isModal && (
            <div className="mb-6">
              <Link
                href="/contribute"
                className="hover:text-accent dark:hover:text-accent-light text-sm text-slate-600 dark:text-slate-400"
              >
                ← Back to contribution type selection
              </Link>
            </div>
          )}
          <h1 className="mb-8 text-4xl font-bold text-slate-900 dark:text-slate-100">
            Contribute Molecule
          </h1>

          {isDraggingJson && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
              <div className="border-accent flex flex-col items-center gap-6 rounded-3xl border-4 border-dashed bg-white/98 px-16 py-14 shadow-2xl dark:bg-slate-900/98">
                <div className="bg-accent/10 dark:bg-accent/20 rounded-full p-5">
                  <DocumentArrowUpIcon
                    className="text-accent h-20 w-20"
                    aria-hidden
                  />
                </div>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Drop JSON file here
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Load molecule data and run PubChem and CAS search for synonyms
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Upload Form */}
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Required Fields */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Required Information
                  </h2>

                  <div className="space-y-4">
                    {/* Common Name and PubChem CID/CAS with Search Button */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
                      <div>
                        <Label
                          htmlFor="commonName"
                          className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Common Name{" "}
                          <span className="text-red-500" aria-hidden>
                            *
                          </span>
                          <FieldTooltip description="The common or trade name for the molecule, such as 'PC61BM' or 'aspirin'. This is different from the systematic IUPAC name." />
                        </Label>
                        <HeroInput
                          type="text"
                          id="commonName"
                          name="commonName"
                          required
                          value={formData.commonName}
                          onChange={(e) => {
                            handleInputChange(e);
                            setSearchError(null);
                            setSearchSuccess(null);
                            setSearchWarnings([]);
                          }}
                          className={formInputClass}
                          placeholder="e.g., PC61BM…"
                          autoComplete="off"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="pubChemCid"
                          className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          PubChem
                          <FieldTooltip description="PubChem Compound Identifier. A unique numeric identifier used to reference the compound in the PubChem database. Enter a CID to search PubChem and auto-populate fields." />
                        </Label>
                        <HeroInput
                          type="text"
                          id="pubChemCid"
                          name="pubchemCid"
                          value={formData.pubchemCid ?? ""}
                          onChange={(e) => {
                            handleInputChange(e);
                            setSearchError(null);
                            setSearchSuccess(null);
                            setSearchWarnings([]);
                          }}
                          className={formInputClass}
                          placeholder="e.g., 205…"
                          autoComplete="off"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="casNumber"
                          className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          CAS
                          <FieldTooltip description="Chemical Abstracts Service Registry Number. A unique numeric identifier (format: XXX-XX-X) assigned to chemical substances by CAS. Used for precise chemical identification and regulatory compliance." />
                        </Label>
                        <HeroInput
                          type="text"
                          id="casNumber"
                          name="casNumber"
                          value={formData.casNumber ?? ""}
                          onChange={(e) => {
                            handleInputChange(e);
                            setSearchError(null);
                            setSearchSuccess(null);
                            setSearchWarnings([]);
                          }}
                          className={formInputClass}
                          placeholder="e.g., 50-5-5…"
                          autoComplete="off"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          onPress={handlePubChemSearch}
                          isDisabled={
                            isSearching ||
                            isSearchingCAS ||
                            (!formData.commonName.trim() &&
                              !(formData.pubchemCid?.trim() ?? ""))
                          }
                          className="h-11 w-11 shrink-0 justify-center rounded-xl p-0"
                          aria-label={
                            isSearching || isSearchingCAS
                              ? "Searching…"
                              : "Search PubChem and CAS"
                          }
                        >
                          {isSearching || isSearchingCAS ? (
                            <svg
                              className="h-4 w-4 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          ) : (
                            <SearchIcon className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Search Messages */}
                    {searchError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                        {searchError}
                      </div>
                    ) : null}

                    {searchSuccess ? (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {searchSuccess}
                        </div>
                        {searchWarnings.length > 0 ? (
                          <div className="space-y-1">
                            {searchWarnings.map((warning, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl border border-amber-200 bg-amber-50/90 p-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                {warning}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {pubChemUrl ? (
                          <a
                            href={pubChemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-dark dark:text-accent-light dark:hover:text-accent-light/80 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:underline"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            View on PubChem
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <Label
                        htmlFor="iupacName"
                        className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        IUPAC Name{" "}
                        <span className="text-red-500" aria-hidden>
                          *
                        </span>
                        <FieldTooltip description="The systematic IUPAC (International Union of Pure and Applied Chemistry) name. This is the standardized chemical nomenclature that uniquely identifies the molecular structure. Usually a long name with numbers and brackets." />
                      </Label>
                      <HeroInput
                        type="text"
                        id="iupacName"
                        name="iupacName"
                        required
                        value={formData.iupacName}
                        onChange={handleInputChange}
                        className={formInputClass}
                        placeholder="e.g., 2,2'-[[6,6,12,12-tetrakis(4-hexylphenyl)-…]…"
                        autoComplete="off"
                      />
                    </div>

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
                      label="Category tags"
                      description={
                        <FieldTooltip description="Optional tags to categorize this molecule (e.g. OPV, polymer). Used for filtering in browse." />
                      }
                    />

                    <div>
                      <Label
                        htmlFor="smiles"
                        className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        SMILES{" "}
                        <span className="text-red-500" aria-hidden>
                          *
                        </span>
                        <FieldTooltip description="Simplified Molecular-Input Line-Entry System. A line notation that uses ASCII characters to describe the molecular structure. Example: 'CCO' represents ethanol (C-C-O). Canonical SMILES is preferred when available." />
                      </Label>
                      <HeroInput
                        type="text"
                        id="smiles"
                        name="smiles"
                        required
                        value={formData.smiles}
                        onChange={handleInputChange}
                        className={`${formInputClass} font-mono text-sm`}
                        placeholder="e.g., CC1=C(C2=C(S1)C=C3……"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="inchi"
                        className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        InChI{" "}
                        <span className="text-red-500" aria-hidden>
                          *
                        </span>
                        <FieldTooltip description="International Chemical Identifier. A standardized textual identifier for chemical substances that encodes molecular structure. Always starts with 'InChI=1S/' or 'InChI=1/' followed by layers of structural information." />
                      </Label>
                      <HeroInput
                        type="text"
                        id="inchi"
                        name="inchi"
                        required
                        value={formData.inchi}
                        onChange={handleInputChange}
                        className={`${formInputClass} font-mono text-sm`}
                        placeholder="e.g., InChI=1S/C82H86F4N8O2S5/c1-15-…"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="chemicalFormula"
                        className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Chemical Formula{" "}
                        <span className="text-red-500" aria-hidden>
                          *
                        </span>
                        <FieldTooltip description="The molecular formula showing the number of atoms of each element in the molecule. Written with element symbols and subscripts, such as 'C82H86F4N8O2S5'. Elements are typically listed in Hill order (C, H, then others alphabetically)." />
                      </Label>
                      <HeroInput
                        type="text"
                        id="chemicalFormula"
                        name="chemicalFormula"
                        required
                        value={formData.chemicalFormula}
                        onChange={handleInputChange}
                        className={formInputClass}
                        placeholder="e.g., C82H86F4N8O2S5…"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Molecule Image
                  </h2>
                  <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    The molecule should be a high-quality svg image of the
                    molecule. Atoms should be colored by element following the
                    CPK coloring scheme. Side chains should be simplified.
                  </h3>

                  <div className="space-y-4">
                    {imagePreview ? (
                      <div className="relative">
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80">
                          <Image
                            src={imagePreview}
                            alt="Molecule preview"
                            fill
                            unoptimized
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 rounded-full bg-red-500 p-2 text-white transition-colors hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                          aria-label="Remove molecule image"
                        >
                          <XMarkIcon className="h-5 w-5" aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <label className="group hover:border-accent relative flex w-full cursor-pointer items-center justify-between gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-6 py-6 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-600 dark:bg-slate-800/50">
                        <div className="flex flex-col gap-2">
                          <span className="text-accent dark:text-accent-light text-sm font-semibold tracking-wide uppercase">
                            Upload Molecule Image
                          </span>
                          <span className="text-base text-slate-700 transition-colors duration-200 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                            Click to upload molecule image
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            PNG, JPG, GIF up to 10MB
                          </span>
                        </div>
                        <div className="group-hover:text-accent dark:text-accent-light hidden shrink-0 text-slate-400 transition-colors duration-200 md:block">
                          <PhotoIcon className="h-16 w-16" aria-hidden="true" />
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end border-t border-slate-200 pt-6 dark:border-slate-700">
                  <Button
                    type="submit"
                    isDisabled={isSubmitting}
                    className="flex items-center gap-2"
                    aria-label={isSubmitting ? "Uploading…" : "Upload molecule"}
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="h-5 w-5 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Uploading…</span>
                      </>
                    ) : (
                      <>
                        <DocumentArrowUpIcon className="h-5 w-5" aria-hidden />
                        <span>Upload Molecule</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Status Messages */}
                {submitStatus.type && (
                  <div
                    className={`rounded-xl border p-4 ${
                      submitStatus.type === "success"
                        ? "border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-red-200 bg-red-50/90 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    {submitStatus.message}
                  </div>
                )}
              </form>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <div className="sticky top-8">
                <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Preview
                </h2>
                {previewMolecule ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                    <MoleculeDisplay molecule={previewMolecule} />
                  </div>
                ) : (
                  <div className="flex h-96 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/50">
                    <p className="text-slate-500 dark:text-slate-400">
                      Fill in the form to see a preview
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
