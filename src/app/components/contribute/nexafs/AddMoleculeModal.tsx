"use client";

import { useState } from "react";
import { DefaultButton as Button } from "~/app/components/Button";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { FormField } from "~/app/components/FormField";
import { trpc } from "~/trpc/client";
import { MagnifyingGlassIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

interface AddMoleculeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMoleculeCreated: (moleculeId: string) => void;
}

export function AddMoleculeModal({
  isOpen,
  onClose,
  onMoleculeCreated,
}: AddMoleculeModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    iupacName: "",
    commonName: "",
    synonyms: [] as string[],
    inchi: "",
    smiles: "",
    chemicalFormula: "",
    casNumber: "",
    pubchemCid: "",
  });

  const [newSynonym, setNewSynonym] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const createMolecule = trpc.molecules.create.useMutation();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Please enter a common name, PubChem CID, or CAS number");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      // Try database search first
      try {
        const dbResult = await utils.molecules.search.fetch({
          query: searchQuery.trim(),
        });

        if (dbResult.ok && dbResult.data) {
          const result = dbResult.data;
          setFormData({
            iupacName: result.iupacName ?? "",
            commonName: typeof result.commonName === "string" ? result.commonName : "",
            synonyms: Array.isArray(result.synonyms) ? result.synonyms : [],
            inchi: result.inchi ?? "",
            smiles: result.smiles ?? "",
            chemicalFormula: Array.isArray(result.chemicalFormula)
              ? result.chemicalFormula.join(", ")
              : result.chemicalFormula ?? "",
            casNumber: result.casNumber ?? "",
            pubchemCid: result.pubChemCid ?? "",
          });
          setIsSearching(false);
          return;
        }
      } catch (dbError: any) {
        // Continue to PubChem if not found in database
        if (dbError?.data?.code !== "NOT_FOUND") {
          console.error("Database search error:", dbError);
        }
      }

      // Try PubChem search
      const isCid = /^\d+$/.test(searchQuery.trim());
      const pubchemResult = await utils.external.searchPubchem.fetch({
        query: searchQuery.trim(),
        type: isCid ? "cid" : "name",
      });

      if (pubchemResult.ok && pubchemResult.data) {
        const result = pubchemResult.data;
        const commonNameArray = Array.isArray(result.commonName)
          ? result.commonName
          : result.name
            ? [result.name]
            : [];
        const commonNameValue = commonNameArray.length > 0 ? commonNameArray[0]! : "";

        setFormData({
          iupacName: result.iupacName ?? "",
          commonName: commonNameValue,
          synonyms: Array.isArray(result.synonyms)
            ? result.synonyms
            : commonNameArray.slice(1),
          inchi: result.inchi ?? "",
          smiles: result.smiles ?? "",
          chemicalFormula: Array.isArray(result.chemicalFormula)
            ? result.chemicalFormula.join(", ")
            : result.molecularFormula ?? "",
          casNumber: result.casNumber ?? "",
          pubchemCid: result.pubchemCid ?? "",
        });
      } else {
        setSearchError("Molecule not found. Please enter details manually.");
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Search failed. Please enter details manually.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSynonym = () => {
    const trimmed = newSynonym.trim();
    if (trimmed && !formData.synonyms.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        synonyms: [...prev.synonyms, trimmed],
      }));
      setNewSynonym("");
    }
  };

  const handleRemoveSynonym = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      synonyms: prev.synonyms.filter((_, i) => i !== index),
    }));
  };

  const handleMoveSynonym = (index: number, direction: "up" | "down") => {
    const newSynonyms = [...formData.synonyms];
    if (direction === "up" && index > 0) {
      [newSynonyms[index], newSynonyms[index - 1]] = [
        newSynonyms[index - 1]!,
        newSynonyms[index]!,
      ];
    } else if (direction === "down" && index < newSynonyms.length - 1) {
      [newSynonyms[index], newSynonyms[index + 1]] = [
        newSynonyms[index + 1]!,
        newSynonyms[index]!,
      ];
    }
    setFormData((prev) => ({ ...prev, synonyms: newSynonyms }));
  };

  const handleSubmit = async () => {
    if (!formData.iupacName || !formData.inchi || !formData.smiles || !formData.chemicalFormula) {
      setSearchError("IUPAC name, InChI, SMILES, and Chemical formula are required");
      return;
    }

    try {
      const result = await createMolecule.mutateAsync({
        iupacName: formData.iupacName.trim(),
        commonName: formData.commonName.trim() || formData.iupacName.trim(),
        synonyms: formData.synonyms.filter(Boolean),
        inchi: formData.inchi.trim(),
        smiles: formData.smiles.trim(),
        chemicalFormula: formData.chemicalFormula.trim(),
        casNumber: formData.casNumber.trim() || undefined,
        pubchemCid: formData.pubchemCid.trim() || undefined,
      });

      onMoleculeCreated(result.id);
      // Reset form
      setFormData({
        iupacName: "",
        commonName: "",
        synonyms: [],
        inchi: "",
        smiles: "",
        chemicalFormula: "",
        casNumber: "",
        pubchemCid: "",
      });
      setSearchQuery("");
      setSearchError(null);
      onClose();
    } catch (error) {
      console.error("Failed to create molecule:", error);
      setSearchError(
        error instanceof Error ? error.message : "Failed to create molecule",
      );
    }
  };

  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title="Add New Molecule">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Search Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Search by name, PubChem CID, or CAS number
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="e.g., benzene, 241, 71-43-2"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-wsu-crimson focus:ring-2 focus:ring-wsu-crimson/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <Button
              type="button"
              variant="solid"
              onClick={handleSearch}
              disabled={isSearching}
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
            </Button>
          </div>
          {searchError && (
            <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <FormField
            label="IUPAC Name"
            type="text"
            name="iupacName"
            value={formData.iupacName}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, iupacName: value as string }))
            }
            required
          />
          <FormField
            label="Common Name"
            type="text"
            name="commonName"
            value={formData.commonName}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, commonName: value as string }))
            }
          />
          <FormField
            label="SMILES"
            type="text"
            name="smiles"
            value={formData.smiles}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, smiles: value as string }))
            }
            required
          />
          <FormField
            label="InChI"
            type="text"
            name="inchi"
            value={formData.inchi}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, inchi: value as string }))
            }
            required
          />
          <FormField
            label="Chemical Formula"
            type="text"
            name="chemicalFormula"
            value={formData.chemicalFormula}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, chemicalFormula: value as string }))
            }
            required
          />
          <FormField
            label="CAS Number"
            type="text"
            name="casNumber"
            value={formData.casNumber}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, casNumber: value as string }))
            }
          />
          <FormField
            label="PubChem CID"
            type="text"
            name="pubchemCid"
            value={formData.pubchemCid}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, pubchemCid: value as string }))
            }
          />
        </div>

        {/* Synonyms Management */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Synonyms (ordered by relevance)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSynonym}
              onChange={(e) => setNewSynonym(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSynonym();
                }
              }}
              placeholder="Add synonym..."
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-wsu-crimson focus:ring-2 focus:ring-wsu-crimson/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <Button type="button" variant="bordered" size="sm" onClick={handleAddSynonym}>
              Add
            </Button>
          </div>
          {formData.synonyms.length > 0 && (
            <div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/50">
              {formData.synonyms.map((synonym, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white dark:hover:bg-gray-800"
                >
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {index + 1}. {synonym}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveSynonym(index, "up")}
                      disabled={index === 0}
                      className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSynonym(index, "down")}
                      disabled={index === formData.synonyms.length - 1}
                      className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSynonym(index)}
                      className="rounded p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="bordered" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={handleSubmit}
            disabled={createMolecule.isPending}
          >
            {createMolecule.isPending ? "Creating..." : "Create Molecule"}
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}
