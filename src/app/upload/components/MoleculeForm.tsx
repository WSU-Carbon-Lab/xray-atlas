"use client";

import { useState } from "react";
import { FieldTooltip } from "./FieldTooltip";
import type { Molecule } from "@prisma/client";

type MoleculeFormProps = {
  onSubmit: (molecule: Molecule) => void | Promise<void>;
  initialData?: Partial<Molecule>;
  submitLabel?: string;
};

export function MoleculeForm({
  onSubmit,
  initialData,
  submitLabel = "Save Molecule",
}: MoleculeFormProps) {
  // Use local state for synonyms as string (for textarea), convert to array when submitting
  const [synonymsText, setSynonymsText] = useState(
    initialData?.synonyms?.join(", ") || "",
  );

  const [molecule, setMolecule] = useState<
    Omit<Molecule, "synonyms"> & { synonyms: string[] }
  >({
    name: initialData?.name || "",
    iupacName: initialData?.iupacName || "",
    synonyms: initialData?.synonyms || [],
    molecularFormula: initialData?.molecularFormula || "",
    smiles: initialData?.smiles || "",
    inchi: initialData?.inchi || "",
    image: initialData?.image || null,
    inchiKey: initialData?.inchiKey || null,
    casNumber: initialData?.casNumber || null,
    pubChemCid: initialData?.pubChemCid || null,
    createdAt: initialData?.createdAt || new Date(),
    updatedAt: initialData?.updatedAt || new Date(),
    id: initialData?.id || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);
  const [pubChemUrl, setPubChemUrl] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<"name" | "smiles">("name");

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchError("Please enter a search query");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchSuccess(null);
    setPubChemUrl(null);

    try {
      const res = await fetch("/api/pubchem/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          type: searchType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Search failed (${res.status})`);
      }

      const data = await res.json();
      if (data.ok && data.data) {
        // Populate form with search results
        setMolecule({
          name: data.data.name || molecule.name,
          iupacName: data.data.iupacName || molecule.iupacName,
          synonyms: Array.isArray(data.data.synonyms)
            ? data.data.synonyms
            : typeof data.data.synonyms === "string"
              ? data.data.synonyms
                  .split(/[,\n]+/)
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : molecule.synonyms,
          molecularFormula:
            data.data.molecularFormula || molecule.molecularFormula,
          smiles: data.data.smiles || molecule.smiles,
          inchi: data.data.inchi || molecule.inchi,
          image: data.data.image || molecule.image || null,
          inchiKey: data.data.inchiKey || molecule.inchiKey || null,
          casNumber: data.data.casNumber || molecule.casNumber || null,
          pubChemCid: data.data.pubChemCid || molecule.pubChemCid || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          id: initialData?.id || "",
        });
        // Update synonyms text for the textarea
        setSynonymsText(
          Array.isArray(data.data.synonyms)
            ? data.data.synonyms.join(", ")
            : typeof data.data.synonyms === "string"
              ? data.data.synonyms
              : "",
        );
        setSearchError(null);
        setSearchSuccess(
          `Successfully found "${data.data.name}" from PubChem. Form fields have been populated.`,
        );
        setPubChemUrl(data.data.pubChemUrl || null);
      } else {
        throw new Error("Invalid response from PubChem search");
      }
    } catch (err: any) {
      setSearchError(err?.message ?? "Failed to search PubChem");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Convert synonyms text to array
      const synonymsArray = synonymsText
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      await onSubmit({
        ...molecule,
        synonyms: synonymsArray,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* PubChem Search Section */}
      <section className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-md font-medium">Search PubChem Database</h3>
        <p className="text-sm text-gray-600">
          Search by molecule name or SMILES to auto-populate form fields
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <div className="flex gap-2">
              <select
                className="rounded border border-gray-300 bg-white p-2 text-sm"
                value={searchType}
                onChange={(e) =>
                  setSearchType(e.target.value as "name" | "smiles")
                }
              >
                <option value="name">Search by Name</option>
                <option value="smiles">Search by SMILES</option>
              </select>
              <input
                type="text"
                className="flex-1 rounded border p-2"
                placeholder={
                  searchType === "name"
                    ? "e.g., benzene, caffeine, aspirin"
                    : "e.g., c1ccccc1, CC(=O)OC1=CC=CC=C1C(=O)O"
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError(null);
                  setSearchSuccess(null);
                  setPubChemUrl(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                disabled={searching}
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
            {searchError && (
              <p className="mt-2 text-sm text-red-600">{searchError}</p>
            )}
            {searchSuccess && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-green-600">{searchSuccess}</p>
                {pubChemUrl && (
                  <a
                    href={pubChemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    View on PubChem
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add Molecule</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Name
              <FieldTooltip description="The common name for the molecule being studied" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={molecule.name}
              onChange={(e) =>
                setMolecule({ ...molecule, name: e.target.value })
              }
              title="The common name for the molecule being studied"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Molecular Formula
              <FieldTooltip description="The chemical formula showing the number of atoms of each element (e.g., C6H6 for benzene)" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={molecule.molecularFormula}
              onChange={(e) =>
                setMolecule({ ...molecule, molecularFormula: e.target.value })
              }
              title="The chemical formula showing the number of atoms of each element (e.g., C6H6 for benzene)"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="flex items-center">
              IUPAC Name
              <FieldTooltip description="The International Union of Pure and Applied Chemistry (IUPAC) name of the molecule being studied" />
            </span>
            <textarea
              required
              className="rounded border p-2"
              rows={3}
              value={molecule.iupacName}
              onChange={(e) =>
                setMolecule({ ...molecule, iupacName: e.target.value })
              }
              title="The International Union of Pure and Applied Chemistry (IUPAC) name of the molecule being studied"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="flex items-center">
              Synonyms (comma or newline separated)
              <FieldTooltip description="Alternative names or aliases for the molecule (e.g., benzene, benzol, cyclohexatriene). Separate multiple synonyms with commas or new lines" />
            </span>
            <textarea
              className="rounded border p-2"
              rows={2}
              value={synonymsText}
              onChange={(e) => setSynonymsText(e.target.value)}
              title="Alternative names or aliases for the molecule. Separate multiple synonyms with commas or new lines"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              SMILES
              <FieldTooltip description="Simplified Molecular Input Line Entry System - a line notation for describing molecular structure using ASCII strings (e.g., c1ccccc1 for benzene)" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={molecule.smiles}
              onChange={(e) =>
                setMolecule({ ...molecule, smiles: e.target.value })
              }
              title="Simplified Molecular Input Line Entry System - a line notation for describing molecular structure"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              InChI
              <FieldTooltip description="International Chemical Identifier - a textual identifier for chemical substances that standardizes molecular representation (e.g., InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H for benzene)" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={molecule.inchi}
              onChange={(e) =>
                setMolecule({ ...molecule, inchi: e.target.value })
              }
              title="International Chemical Identifier - a textual identifier for chemical substances"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              InChI Key (optional)
              <FieldTooltip description="A fixed-length (27 character) condensed representation of the InChI identifier, useful for database lookups and indexing" />
            </span>
            <input
              className="rounded border p-2"
              value={molecule.inchiKey ?? ""}
              onChange={(e) =>
                setMolecule({ ...molecule, inchiKey: e.target.value })
              }
              title="A fixed-length condensed representation of the InChI identifier, useful for database lookups"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              CAS Number (optional)
              <FieldTooltip description="Chemical Abstracts Service Registry Number - a unique numeric identifier assigned by CAS to every chemical substance described in the open scientific literature" />
            </span>
            <input
              className="rounded border p-2"
              value={molecule.casNumber ?? ""}
              onChange={(e) =>
                setMolecule({ ...molecule, casNumber: e.target.value })
              }
              title="Chemical Abstracts Service Registry Number - a unique numeric identifier for chemical substances"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="flex items-center">
              PubChem CID (optional)
              <FieldTooltip description="PubChem Compound Identifier - a unique identifier for chemical compounds in the PubChem database" />
            </span>
            <input
              className="rounded border p-2"
              value={molecule.pubChemCid ?? ""}
              onChange={(e) =>
                setMolecule({ ...molecule, pubChemCid: e.target.value })
              }
              title="PubChem Compound Identifier - a unique identifier for chemical compounds in the PubChem database"
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
