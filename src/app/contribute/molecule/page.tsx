"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { DefaultButton as Button } from "~/app/components/Button";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import type { MoleculeUploadData } from "~/types/upload";
import {
  MoleculeDisplay,
  type DisplayMolecule,
} from "~/app/components/MoleculeDisplay";
import { trpc } from "~/trpc/client";
import {
  DocumentArrowUpIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { FieldTooltip } from "~/app/components/FieldTooltip";
import { SearchIcon } from "../../components/icons";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type MoleculeSearchResponse = RouterOutputs["molecules"]["search"];
type MoleculeSearchData = NonNullable<MoleculeSearchResponse["data"]>;
type PubChemSearchResponse = RouterOutputs["external"]["searchPubchem"];
type PubChemSearchData = NonNullable<PubChemSearchResponse["data"]>;
type CasSearchResponse = RouterOutputs["external"]["searchCas"];
type CreateMoleculeResponse = RouterOutputs["molecules"]["create"];

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
  const [newSynonym, setNewSynonym] = useState("");
  const [editingMoleculeId, setEditingMoleculeId] = useState<string | null>(
    null,
  );

  // tRPC hooks
  const utils = trpc.useUtils();
  const createMolecule = trpc.molecules.create.useMutation();
  const updateMolecule = trpc.molecules.update.useMutation();
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

  const addSynonym = () => {
    const trimmed = newSynonym.trim();
    if (trimmed && !formData.synonyms.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        synonyms: [...prev.synonyms, trimmed],
      }));
      setNewSynonym("");
    }
  };

  const removeSynonym = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      synonyms: prev.synonyms.filter((_, i) => i !== index),
    }));
  };

  // Drag and drop handlers for synonyms
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === undefined) return;

    if (draggedIndex !== index) {
      const newSynonyms = [...formData.synonyms];
      const draggedItem = newSynonyms[draggedIndex];
      if (draggedItem !== undefined) {
        newSynonyms.splice(draggedIndex, 1);
        newSynonyms.splice(index, 0, draggedItem);

        setFormData((prev) => ({
          ...prev,
          synonyms: newSynonyms,
        }));
        setDraggedIndex(index);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSynonymKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSynonym();
    }
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
            const commonNameValue = typeof result.commonName === "string"
              ? result.commonName
              : (result.commonName ?? "");

            // Handle chemicalFormula - may be string or array
            const chemicalFormulaValue = Array.isArray(result.chemicalFormula)
              ? result.chemicalFormula.join(", ")
              : (result.chemicalFormula ?? "");

            // Synonyms array is already provided by tRPC
            const allSynonyms = Array.isArray(result.synonyms) ? result.synonyms : [];

            setFormData({
              iupacName: result.iupacName ?? "",
              commonName: commonNameValue,
              synonyms: allSynonyms.filter(Boolean),
              inchi: result.inchi ?? "",
              smiles: result.smiles ?? "",
              chemicalFormula: chemicalFormulaValue,
              casNumber: result.casNumber ?? null,
              pubchemCid: result.pubChemCid ?? null,
            });

            // Store the molecule ID for update operation
            setEditingMoleculeId(result.id ?? null);

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

      // If not found in database (or if searching by CID), try PubChem
      // If CID is provided, search by CID; otherwise search by name
      const searchType = hasCid ? "cid" : "name";
      const query = hasCid
        ? (formData.pubchemCid ?? "").trim()
        : formData.commonName.trim();

      const pubChemResponse: PubChemSearchResponse =
        await utils.external.searchPubchem.fetch({
          query,
          type: searchType as "name" | "cid" | "smiles",
        });

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

        // Set image if available
        if (result.image) {
          setImagePreview(result.image);
          // Note: We can't directly set a File object from base64 data URL
          // The image preview will show, but user would need to upload separately if they want to save it
        }

        setSearchSuccess("PubChem search successful");
        const generatedPubChemUrl = result.pubChemCid
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${result.pubChemCid}`
          : null;
        setPubChemUrl(generatedPubChemUrl);

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
                }));
                setSearchWarnings((prev) => [
                  ...prev,
                  "CAS Registry Number found via InChI search",
                ]);
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
                  }));
                  setSearchWarnings((prev) => [
                    ...prev,
                    `CAS Registry Number found via synonym search: "${synonym}"`,
                  ]);
                  casFound = true;
                  break; // Stop searching once we find a match
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
              setSearchWarnings((prev) => [
                ...prev,
                inchiFromResult
                  ? "CAS Registry Number not found via InChI or synonym search"
                  : "CAS Registry Number not found via synonym search",
              ]);
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
          ...formData,
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
            imageError instanceof Error
              ? imageError.message
              : "Unknown error";
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

      // Reset form
      setFormData({
        iupacName: "",
        commonName: "",
        synonyms: [],
        inchi: "",
        smiles: "",
        chemicalFormula: "",
        casNumber: null,
        pubchemCid: null,
      });
      setNewSynonym("");
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

  // Create preview molecule object
  const previewMolecule: DisplayMolecule | null =
    (formData.iupacName ?? formData.commonName)
      ? {
          name: formData.iupacName ?? formData.commonName ?? "",
          commonName: formData.commonName
            ? [formData.commonName, ...formData.synonyms]
            : formData.synonyms,
          SMILES: formData.smiles ?? "",
          InChI: formData.inchi ?? "",
          chemical_formula: formData.chemicalFormula ?? "",
          imageUrl: imagePreview ?? undefined,
          pubChemCid: formData.pubchemCid ?? null,
          casNumber: formData.casNumber ?? null,
        }
      : null;

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-100">
          Contribute Molecule
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          Please sign in to contribute molecules to the X-ray Atlas database.
        </p>
      </div>
    );
  }

  if (false) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-accent mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
              className="text-sm text-gray-600 hover:text-accent dark:text-gray-400 dark:hover:text-accent-light"
            >
              ← Back to contribution type selection
            </Link>
          </div>
        )}
        <h1 className="mb-8 text-4xl font-bold text-gray-900 dark:text-gray-100">
          Contribute Molecule
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Upload Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Fields */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Required Information
                </h2>

                <div className="space-y-4">
                  {/* Common Name and PubChem CID/CAS with Search Button */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <div>
                      <label
                        htmlFor="commonName"
                        className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Common Name <span className="text-red-500">*</span>
                        <FieldTooltip description="The common or trade name for the molecule, such as 'PC61BM' or 'aspirin'. This is different from the systematic IUPAC name." />
                      </label>
                      <input
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
                        className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="e.g., PC61BM"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pubChemCid"
                        className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        PubChem
                        <FieldTooltip description="PubChem Compound Identifier. A unique numeric identifier used to reference the compound in the PubChem database. Enter a CID to search PubChem and auto-populate fields." />
                      </label>
                      <input
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
                        className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="205"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="casNumber"
                        className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        CAS
                        <FieldTooltip description="Chemical Abstracts Service Registry Number. A unique numeric identifier (format: XXX-XX-X) assigned to chemical substances by CAS. Used for precise chemical identification and regulatory compliance." />
                      </label>
                      <input
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
                        className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="50-5-5"
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
                        className="h-10 w-10 justify-center p-0"
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
                  {searchError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      {searchError}
                    </div>
                  )}

                  {searchSuccess && (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {searchSuccess}
                      </div>
                      {searchWarnings.length > 0 && (
                        <div className="space-y-1">
                          {searchWarnings.map((warning, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                            >
                              {warning}
                            </div>
                          ))}
                        </div>
                      )}
                      {pubChemUrl && (
                        <a
                          href={pubChemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-dark hover:underline dark:text-accent-light dark:hover:text-accent-light/80"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          View on PubChem
                        </a>
                      )}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="iupacName"
                      className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      IUPAC Name <span className="text-red-500">*</span>
                      <FieldTooltip description="The systematic IUPAC (International Union of Pure and Applied Chemistry) name. This is the standardized chemical nomenclature that uniquely identifies the molecular structure. Usually a long name with numbers and brackets." />
                    </label>
                    <input
                      type="text"
                      id="iupacName"
                      name="iupacName"
                      required
                      value={formData.iupacName}
                      onChange={handleInputChange}
                      className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., 2,2'-[[6,6,12,12-tetrakis(4-hexylphenyl)-6,12-dihydrodithieno[2,3-d:2',3'-d']s-indaceno[1,2-b:5,6-b']dithiophene-2,8-diyl]bis[methylidyne(3-oxo-1H-indene-2,1(3H)-diylidene)]]bis[propanedinitrile]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="synonyms"
                      className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Synonyms
                      <FieldTooltip description="Alternative names, aliases, or common designations for this molecule. Examples include trade names, abbreviations, or other chemical names. Each synonym can be added individually." />
                    </label>
                    {/* Synonyms list */}
                    {formData.synonyms.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {formData.synonyms.map((synonym, index) => (
                          <span
                            key={index}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className="inline-flex cursor-grab items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-all hover:bg-gray-200 active:cursor-grabbing dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            style={{
                              opacity: draggedIndex === index ? 0.5 : 1,
                            }}
                          >
                            {synonym}
                            <button
                              type="button"
                              onClick={() => removeSynonym(index)}
                              className="text-gray-500 hover:text-red-600 focus:outline-none dark:text-gray-400 dark:hover:text-red-400"
                              aria-label={`Remove ${synonym}`}
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Add synonym input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        id="newSynonym"
                        value={newSynonym}
                        onChange={(e) => setNewSynonym(e.target.value)}
                        onKeyDown={handleSynonymKeyDown}
                        className="focus:border-accent focus:ring-accent/20 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="Add a synonym (press Enter)"
                      />
                      <Button
                        type="button"
                        onClick={addSynonym}
                        isDisabled={!newSynonym.trim()}
                        className="h-10 shrink-0 justify-center whitespace-nowrap"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="smiles"
                      className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      SMILES <span className="text-red-500">*</span>
                      <FieldTooltip description="Simplified Molecular-Input Line-Entry System. A line notation that uses ASCII characters to describe the molecular structure. Example: 'CCO' represents ethanol (C-C-O). Canonical SMILES is preferred when available." />
                    </label>
                    <input
                      type="text"
                      id="smiles"
                      name="smiles"
                      required
                      value={formData.smiles}
                      onChange={handleInputChange}
                      className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-mono text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., CC1=C(C2=C(S1)C=C3C(=C2)C4=C(C(=O)C(=C4)C#N)SC3=C5C6=C(C=C5)C(=O)C(=C6)C#N)C..."
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="inchi"
                      className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      InChI <span className="text-red-500">*</span>
                      <FieldTooltip description="International Chemical Identifier. A standardized textual identifier for chemical substances that encodes molecular structure. Always starts with 'InChI=1S/' or 'InChI=1/' followed by layers of structural information." />
                    </label>
                    <input
                      type="text"
                      id="inchi"
                      name="inchi"
                      required
                      value={formData.inchi}
                      onChange={handleInputChange}
                      className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-mono text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., InChI=1S/C82H86F4N8O2S5/c1-15-..."
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="chemicalFormula"
                      className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Chemical Formula <span className="text-red-500">*</span>
                      <FieldTooltip description="The molecular formula showing the number of atoms of each element in the molecule. Written with element symbols and subscripts, such as 'C82H86F4N8O2S5'. Elements are typically listed in Hill order (C, H, then others alphabetically)." />
                    </label>
                    <input
                      type="text"
                      id="chemicalFormula"
                      name="chemicalFormula"
                      required
                      value={formData.chemicalFormula}
                      onChange={handleInputChange}
                      className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., C82H86F4N8O2S5"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Molecule Image
                </h2>
                <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  The molecule should be a high-quality svg image of the
                  molecule. Atoms should be colored by element following the CPK
                  coloring scheme. Side chains should be simplified.
                </h3>

                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative">
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
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
                        className="absolute top-2 right-2 rounded-full bg-red-500 p-2 text-white transition-colors hover:bg-red-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="group relative flex w-full cursor-pointer items-center justify-between gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-6 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold uppercase tracking-wide text-accent dark:text-accent-light">
                          Upload Molecule Image
                        </span>
                        <span className="text-base text-gray-700 transition-colors duration-200 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
                          Click to upload molecule image
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          PNG, JPG, GIF up to 10MB
                        </span>
                      </div>
                      <div className="hidden shrink-0 text-gray-300 transition-colors duration-200 group-hover:text-accent dark:text-accent-light md:block">
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
              <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
                <Button
                  type="submit"
                  isDisabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <DocumentArrowUpIcon className="h-5 w-5" />
                  {isSubmitting ? "Uploading..." : "Upload Molecule"}
                </Button>
              </div>

              {/* Status Messages */}
              {submitStatus.type && (
                <div
                  className={`rounded-lg p-4 ${
                    submitStatus.type === "success"
                      ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
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
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Preview
              </h2>
              {previewMolecule ? (
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <MoleculeDisplay molecule={previewMolecule} />
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-gray-500 dark:text-gray-400">
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
