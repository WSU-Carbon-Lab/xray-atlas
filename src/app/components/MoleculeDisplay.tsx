"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { trpc } from "~/trpc/client";

// Updated type to match Prisma schema and include external links
export type DisplayMolecule = {
  name: string; // IUPAC name or common name
  commonName?: string[]; // Array of common names
  chemical_formula: string | string[]; // Chemical formula (can be string or array from Prisma)
  SMILES: string;
  InChI: string;
  imageUrl?: string;
  pubChemCid?: string | null;
  casNumber?: string | null;
  description?: string;
  experimentCount?: number; // Optional experiment count badge
};

// Compact copy button component - only shows label and copy icon
const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!text) return null;

  return (
    <button
      onClick={handleCopy}
      className="group hover:border-wsu-crimson focus:ring-wsu-crimson dark:hover:border-wsu-crimson inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 focus:ring-2 focus:ring-offset-1 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      title={`Click to copy ${label}`}
    >
      <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </span>
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      ) : (
        <ClipboardDocumentIcon className="group-hover:text-wsu-crimson h-3.5 w-3.5 text-gray-400 transition-colors dark:text-gray-500" />
      )}
    </button>
  );
};

// Badge-style external link component with PubChem/CAS logo
const ExternalLinkBadge = ({
  href,
  label,
  isPubChem = false,
  isCAS = false,
  disabled = false,
}: {
  href: string | null;
  label: string;
  isPubChem?: boolean;
  isCAS?: boolean;
  disabled?: boolean;
}) => {
  const baseClasses = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none ${
    disabled
      ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
      : "border-gray-200 bg-white text-gray-700 hover:border-wsu-crimson hover:bg-wsu-crimson hover:text-white focus:ring-wsu-crimson dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-wsu-crimson"
  }`;

  const iconContent = isPubChem ? (
    <Image
      src="https://pubchem.ncbi.nlm.nih.gov/pcfe/favicon/apple-touch-icon.png"
      alt="PubChem"
      width={12}
      height={12}
      className={`h-3 w-3 object-contain ${disabled ? "opacity-50" : ""}`}
    />
  ) : isCAS ? (
    <Image
      src="https://cdn.prod.website-files.com/650861f00f97fe8153979335/6585a20f2b9c762a8e082a87_cas-favicon.png"
      alt="CAS"
      width={12}
      height={12}
      className={`h-3 w-3 object-contain ${disabled ? "opacity-50" : ""}`}
    />
  ) : null;

  if (disabled || !href) {
    return (
      <span className={baseClasses}>
        {iconContent}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={baseClasses}
    >
      {iconContent}
      <span>{label}</span>
    </a>
  );
};

// Synonyms Popover component
const SynonymsPopover = ({
  synonyms,
  displayedCount,
}: {
  synonyms: string[];
  displayedCount: number;
}) => {
  const remainingSynonyms = synonyms.slice(displayedCount);

  if (remainingSynonyms.length === 0) return null;

  return (
    <Popover className="relative flex shrink-0 items-center">
      <PopoverButton className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600">
        +{remainingSynonyms.length}
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        className="z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          All Synonyms ({synonyms.length})
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {synonyms.map((synonym, idx) => (
            <div
              key={idx}
              className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {synonym}
            </div>
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  );
};

// Synonym badge - simple display without reordering
const SynonymBadge = ({ name }: { name: string }) => {
  return (
    <span className="inline-flex max-w-[120px] min-w-0 shrink items-center">
      <span className="truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs whitespace-nowrap text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        {name}
      </span>
    </span>
  );
};

// Main MoleculeDisplay component - Horizontal compact layout
export const MoleculeDisplay = ({
  molecule,
}: {
  molecule: DisplayMolecule;
}) => {
  // Helper function to extract valid common names from molecule
  const getCommonNames = (): string[] => {
    const commonNameValue = molecule.commonName;

    // Handle array of common names
    if (Array.isArray(commonNameValue)) {
      // Filter out empty strings and return valid array
      const validNames = commonNameValue.filter(
        (name): name is string =>
          typeof name === "string" && name.trim().length > 0,
      );
      if (validNames.length > 0) {
        return validNames;
      }
    }

    // If no common names, return empty array (will fall back to IUPAC name)
    return [];
  };

  // Use local state for reorderable synonyms - initialize from commonName array or empty array
  const [orderedSynonyms, setOrderedSynonyms] =
    useState<string[]>(getCommonNames);

  // Sync state when molecule prop changes
  useEffect(() => {
    const newCommonNames = getCommonNames();
    // Only update if the arrays are different (length or content)
    if (
      newCommonNames.length !== orderedSynonyms.length ||
      !newCommonNames.every((name, idx) => orderedSynonyms[idx] === name)
    ) {
      setOrderedSynonyms(newCommonNames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [molecule]);

  // Update primary name when synonyms are reordered - it's always the first synonym
  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;

  // Format chemical formula (handle array or string)
  const chemicalFormula = (() => {
    if (typeof molecule.chemical_formula === "string") {
      return molecule.chemical_formula;
    }
    if (Array.isArray(molecule.chemical_formula)) {
      const formulas = molecule.chemical_formula as unknown[];
      return formulas
        .filter((f): f is string => typeof f === "string")
        .join(", ");
    }
    return "";
  })();

  // State for CAS registry number (may be fetched from SMILES if not provided)
  const [casRegistryNumber, setCasRegistryNumber] = useState<string | null>(
    molecule.casNumber || null,
  );
  const [isFetchingCAS, setIsFetchingCAS] = useState(false);

  // Build external links
  const pubChemUrl = molecule.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubChemCid}`
    : null;

  const casUrl = casRegistryNumber
    ? `https://commonchemistry.cas.org/detail?cas_rn=${casRegistryNumber}&search=${casRegistryNumber}`
    : null;

  const utils = trpc.useUtils();

  // Fetch CAS registry number from InChI if not already present
  useEffect(() => {
    if (!casRegistryNumber && molecule.InChI && molecule.InChI.trim()) {
      setIsFetchingCAS(true);
      utils.external.searchCas
        .fetch({ inchi: molecule.InChI })
        .then((data) => {
          if (data.ok && data.data?.casRegistryNumber) {
            setCasRegistryNumber(data.data.casRegistryNumber);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch CAS registry number:", error);
        })
        .finally(() => {
          setIsFetchingCAS(false);
        });
    }
  }, [molecule.InChI, casRegistryNumber, utils]);

  // Synonyms are display-only (reordering happens in upload form)

  return (
    <div className="group hover:border-wsu-crimson dark:hover:border-wsu-crimson flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl dark:border-gray-700 dark:bg-gray-800">
      {/* Image Section - Top */}
      {molecule.imageUrl && (
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          {molecule.imageUrl.startsWith("data:") ||
          molecule.imageUrl.toLowerCase().endsWith(".svg") ? (
            <img
              className="h-full w-full object-contain"
              src={molecule.imageUrl}
              alt={primaryName || "Molecule structure"}
            />
          ) : (
            <Image
              src={molecule.imageUrl}
              alt={primaryName || "Molecule structure"}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 100vw, 400px"
            />
          )}
        </div>
      )}

      {/* Content Section - Below image */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {/* Name and Formula Header */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
              {primaryName}
            </h3>
            {molecule.experimentCount !== undefined &&
              molecule.experimentCount > 0 && (
                <span className="bg-wsu-crimson shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white">
                  {molecule.experimentCount}
                </span>
              )}
          </div>
          {orderedSynonyms.length > 0 && (
            <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
              {/* Show all synonyms - display first 3, rest in popover */}
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-hidden">
                {orderedSynonyms.slice(0, 5).map((name, idx) => (
                  <SynonymBadge
                    key={`${name}-${idx}-${orderedSynonyms.length}`}
                    name={name}
                  />
                ))}
              </div>
              {/* Show popover when there are more than 3 synonyms */}
              {orderedSynonyms.length > 5 && (
                <SynonymsPopover
                  synonyms={orderedSynonyms}
                  displayedCount={3}
                />
              )}
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Formula:
            </span>
            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
              {chemicalFormula || "N/A"}
            </span>
          </div>
        </div>

        {/* Copy Buttons and External Links - Compact row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Fields */}
          {molecule.SMILES && (
            <CopyButton text={molecule.SMILES} label="SMILES" />
          )}
          {molecule.InChI && <CopyButton text={molecule.InChI} label="InChI" />}

          {/* External Link Badges */}
          {molecule.SMILES || molecule.InChI ? (
            <span className="mx-0.5 h-3 w-px bg-gray-300 dark:bg-gray-600" />
          ) : null}

          <ExternalLinkBadge
            href={pubChemUrl}
            label="PubChem"
            isPubChem={true}
            disabled={!pubChemUrl}
          />
          {isFetchingCAS ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300" />
              Loading...
            </span>
          ) : (
            <ExternalLinkBadge
              href={casUrl}
              label="CAS"
              isCAS={true}
              disabled={!casUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
};
