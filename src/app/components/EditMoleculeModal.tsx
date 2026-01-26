"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";
import { DefaultButton as Button } from "./Button";

interface EditMoleculeModalProps {
  isOpen: boolean;
  onClose: () => void;
  moleculeId: string;
  initialData: {
    iupacName: string;
    commonNames: string[];
    chemicalFormula: string;
    SMILES: string;
    InChI: string;
    casNumber: string | null;
    pubChemCid: string | null;
  };
  onSuccess?: () => void;
}

export function EditMoleculeModal({
  isOpen,
  onClose,
  moleculeId,
  initialData,
  onSuccess,
}: EditMoleculeModalProps) {
  const [formData, setFormData] = useState(initialData);
  const [synonyms, setSynonyms] = useState<string[]>(initialData.commonNames);

  const utils = trpc.useUtils();
  const updateMutation = trpc.molecules.update.useMutation({
    onSuccess: () => {
      void utils.molecules.getById.invalidate({ id: moleculeId });
      onSuccess?.();
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setSynonyms(initialData.commonNames);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      moleculeId,
      iupacName: formData.iupacName,
      commonNames: synonyms.filter((s) => s.trim().length > 0),
      chemicalFormula: formData.chemicalFormula,
      SMILES: formData.SMILES,
      InChI: formData.InChI,
      casNumber:
        formData.casNumber?.trim().length ? formData.casNumber.trim() : null,
      pubChemCid:
        formData.pubChemCid?.trim().length ? formData.pubChemCid.trim() : null,
    });
  };

  const addSynonym = () => {
    setSynonyms((prev) => [...prev, ""]);
  };

  const removeSynonym = (index: number) => {
    setSynonyms((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSynonym = (index: number, value: string) => {
    setSynonyms((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Edit Molecule
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                IUPAC Name *
              </label>
              <input
                type="text"
                value={formData.iupacName}
                onChange={(e) =>
                  setFormData({ ...formData, iupacName: e.target.value })
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Common Names / Synonyms
              </label>
              <div className="space-y-2">
                {synonyms.map((synonym, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={synonym}
                      onChange={(e) => updateSynonym(index, e.target.value)}
                      placeholder="Synonym name"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                    {synonyms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSynonym(index)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSynonym}
                  className="text-sm text-accent dark:text-accent-light hover:underline"
                >
                  + Add Synonym
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Chemical Formula *
              </label>
              <input
                type="text"
                value={formData.chemicalFormula}
                onChange={(e) =>
                  setFormData({ ...formData, chemicalFormula: e.target.value })
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                SMILES *
              </label>
              <input
                type="text"
                value={formData.SMILES}
                onChange={(e) =>
                  setFormData({ ...formData, SMILES: e.target.value })
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                InChI *
              </label>
              <input
                type="text"
                value={formData.InChI}
                onChange={(e) =>
                  setFormData({ ...formData, InChI: e.target.value })
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CAS Number
                </label>
                <input
                  type="text"
                  value={formData.casNumber ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      casNumber: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  PubChem CID
                </label>
                <input
                  type="text"
                  value={formData.pubChemCid ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pubChemCid: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            {updateMutation.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                {updateMutation.error?.message ?? "Failed to update molecule"}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                isDisabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
