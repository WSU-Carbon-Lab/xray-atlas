"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import type { DisplayMolecule } from "./MoleculeDisplay";

// Shared components across variants
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
      className="group hover:border-wsu-crimson focus:ring-wsu-crimson dark:hover:border-wsu-crimson inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-gray-700 backdrop-blur-sm transition-all hover:bg-white hover:shadow-sm focus:ring-2 focus:ring-offset-1 focus:outline-none dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-800"
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
      ? "cursor-not-allowed border-gray-200 bg-gray-50/80 backdrop-blur-sm text-gray-400 opacity-50 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-500"
      : "border-gray-200 bg-white/80 backdrop-blur-sm text-gray-700 hover:border-wsu-crimson hover:bg-wsu-crimson/10 focus:ring-wsu-crimson dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-wsu-crimson/20"
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

const SynonymBadge = ({ name }: { name: string }) => {
  return (
    <span className="inline-flex max-w-[120px] min-w-0 shrink items-center">
      <span className="truncate rounded-full bg-gray-100/80 px-2 py-0.5 text-xs whitespace-nowrap text-gray-700 backdrop-blur-sm dark:bg-gray-700/80 dark:text-gray-300">
        {name}
      </span>
    </span>
  );
};

// Helper function to get common names
const getCommonNames = (molecule: DisplayMolecule): string[] => {
  const commonNameValue = molecule.commonName;
  if (Array.isArray(commonNameValue)) {
    const validNames = commonNameValue.filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0,
    );
    if (validNames.length > 0) {
      return validNames;
    }
  }
  return [];
};

// Helper to format chemical formula
const formatFormula = (molecule: DisplayMolecule): string => {
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
};

// Copy button for overlay (simplified with feedback)
const OverlayCopyButton = ({
  text,
  label,
}: {
  text: string;
  label: string;
}) => {
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

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
      title={`Click to copy ${label}`}
    >
      {copied ? (
        <>
          <CheckIcon className="h-3 w-3" />
          <span>Copied!</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};

/**
 * VARIANT 1: Image-First Hero Layout
 * Inspired by Liquid Glass - image is the hero element with content floating below
 */
export const MoleculeDisplayHero = ({
  molecule,
}: {
  molecule: DisplayMolecule;
}) => {
  // Sync synonyms with molecule prop changes
  const getCommonNamesHelper = (): string[] => {
    return getCommonNames(molecule);
  };

  const [orderedSynonyms, setOrderedSynonyms] =
    useState<string[]>(getCommonNamesHelper);

  useEffect(() => {
    const newCommonNames = getCommonNamesHelper();
    if (
      newCommonNames.length !== orderedSynonyms.length ||
      !newCommonNames.every((name, idx) => orderedSynonyms[idx] === name)
    ) {
      setOrderedSynonyms(newCommonNames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [molecule]);

  const [casRegistryNumber, setCasRegistryNumber] = useState<string | null>(
    molecule.casNumber || null,
  );
  const [isFetchingCAS, setIsFetchingCAS] = useState(false);

  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const chemicalFormula = formatFormula(molecule);

  const pubChemUrl = molecule.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubChemCid}`
    : null;

  const casUrl = casRegistryNumber
    ? `https://commonchemistry.cas.org/detail?cas_rn=${casRegistryNumber}&search=${casRegistryNumber}`
    : null;

  useEffect(() => {
    if (!casRegistryNumber && molecule.InChI && molecule.InChI.trim()) {
      setIsFetchingCAS(true);
      fetch("/api/cas/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inchi: molecule.InChI }),
      })
        .then((res) => res.json())
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
  }, [molecule.InChI, casRegistryNumber]);

  return (
    <div className="group relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-lg transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:border-gray-300/60 hover:shadow-2xl dark:border-gray-700/50 dark:bg-gray-800 dark:hover:border-gray-600/60">
      {/* Hero Image Section - Square aspect ratio with overlay */}
      {molecule.imageUrl ? (
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          {molecule.imageUrl.startsWith("data:") ||
          molecule.imageUrl.toLowerCase().endsWith(".svg") ? (
            <img
              className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
              src={molecule.imageUrl}
              alt={primaryName || "Molecule structure"}
            />
          ) : (
            <Image
              src={molecule.imageUrl}
              alt={primaryName || "Molecule structure"}
              fill
              className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 400px"
            />
          )}

          {/* Experiment count badge - top right with better contrast */}
          {molecule.experimentCount !== undefined &&
            molecule.experimentCount > 0 && (
              <div className="absolute top-3 right-3 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-md dark:bg-white/20 dark:text-gray-900">
                {molecule.experimentCount} exp
              </div>
            )}

          {/* Bottom overlay banner - Name visible, additional content slides up on hover */}
          <div className="absolute right-0 bottom-0 left-0 -translate-y-1 rounded-t-2xl bg-gradient-to-t from-black/50 via-black/30 to-transparent p-3 pb-4 backdrop-blur-sm transition-all duration-300 ease-out group-hover:-translate-y-4 group-hover:from-black/70 group-hover:via-black/50 group-hover:p-4 group-hover:backdrop-blur-md">
            <div className="space-y-2 overflow-hidden">
              {/* Primary Name - Always visible */}
              <h3 className="text-xl leading-tight font-bold text-white">
                {primaryName}
              </h3>

              {/* Additional Content - Slides up on hover */}
              <div className="flex translate-y-full flex-col gap-2 transition-transform duration-300 ease-out group-hover:translate-y-0">
                {/* Synonyms - Show more, properly ordered */}
                {orderedSynonyms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {orderedSynonyms.slice(0, 5).map((name, idx) => (
                      <span
                        key={`${name}-${idx}`}
                        className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white backdrop-blur-sm"
                      >
                        {name}
                      </span>
                    ))}
                    {orderedSynonyms.length > 5 && (
                      <span className="text-xs text-white/80">
                        +{orderedSynonyms.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* Chemical Formula */}
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold tracking-wide text-white/80 uppercase">
                    Formula:
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    {chemicalFormula || "N/A"}
                  </span>
                </div>

                {/* Actions - Copy buttons and external links */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {molecule.SMILES && (
                    <OverlayCopyButton text={molecule.SMILES} label="SMILES" />
                  )}
                  {molecule.InChI && (
                    <OverlayCopyButton text={molecule.InChI} label="InChI" />
                  )}

                  {molecule.SMILES || molecule.InChI ? (
                    <span className="mx-1 h-3 w-px bg-white/30" />
                  ) : null}

                  {pubChemUrl && (
                    <a
                      href={pubChemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
                    >
                      PubChem
                    </a>
                  )}
                  {isFetchingCAS ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </span>
                  ) : (
                    casUrl && (
                      <a
                        href={casUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
                      >
                        CAS
                      </a>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Fallback if no image
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {primaryName}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {chemicalFormula}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * VARIANT 2: Side-by-Side Layout
 * Image on left, content on right - good for wider layouts
 */
export const MoleculeDisplaySideBySide = ({
  molecule,
}: {
  molecule: DisplayMolecule;
}) => {
  const [orderedSynonyms] = useState<string[]>(() => getCommonNames(molecule));
  const [casRegistryNumber, setCasRegistryNumber] = useState<string | null>(
    molecule.casNumber || null,
  );
  const [isFetchingCAS, setIsFetchingCAS] = useState(false);

  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const chemicalFormula = formatFormula(molecule);

  const pubChemUrl = molecule.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubChemCid}`
    : null;

  const casUrl = casRegistryNumber
    ? `https://commonchemistry.cas.org/detail?cas_rn=${casRegistryNumber}&search=${casRegistryNumber}`
    : null;

  useEffect(() => {
    if (!casRegistryNumber && molecule.InChI && molecule.InChI.trim()) {
      setIsFetchingCAS(true);
      fetch("/api/cas/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inchi: molecule.InChI }),
      })
        .then((res) => res.json())
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
  }, [molecule.InChI, casRegistryNumber]);

  return (
    <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-lg transition-all hover:shadow-xl sm:flex-row dark:border-gray-700/50 dark:bg-gray-800">
      {/* Image Section - Left side, concentric with container */}
      {molecule.imageUrl && (
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 sm:w-1/2 dark:from-gray-900 dark:to-gray-800">
          {molecule.imageUrl.startsWith("data:") ||
          molecule.imageUrl.toLowerCase().endsWith(".svg") ? (
            <img
              className="h-full w-full object-contain p-6"
              src={molecule.imageUrl}
              alt={primaryName || "Molecule structure"}
            />
          ) : (
            <Image
              src={molecule.imageUrl}
              alt={primaryName || "Molecule structure"}
              fill
              className="object-contain p-6"
              sizes="(max-width: 640px) 100vw, 400px"
            />
          )}
        </div>
      )}

      {/* Content Section - Right side, liquid glass background */}
      <div className="flex flex-1 flex-col justify-between bg-white/80 p-6 backdrop-blur-xl sm:w-1/2 dark:bg-gray-800/80">
        <div className="space-y-4">
          {/* Header with badge */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex-1 text-xl leading-tight font-bold text-gray-900 dark:text-gray-100">
              {primaryName}
            </h3>
            {molecule.experimentCount !== undefined &&
              molecule.experimentCount > 0 && (
                <span className="bg-wsu-crimson shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white">
                  {molecule.experimentCount}
                </span>
              )}
          </div>

          {/* Synonyms */}
          {orderedSynonyms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {orderedSynonyms.slice(0, 5).map((name, idx) => (
                <SynonymBadge key={`${name}-${idx}`} name={name} />
              ))}
            </div>
          )}

          {/* Chemical Formula */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Formula:
            </span>
            <span className="font-mono text-base font-bold text-gray-900 dark:text-gray-100">
              {chemicalFormula || "N/A"}
            </span>
          </div>
        </div>

        {/* Actions at bottom */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200/50 pt-4 dark:border-gray-700/50">
          {molecule.SMILES && (
            <CopyButton text={molecule.SMILES} label="SMILES" />
          )}
          {molecule.InChI && <CopyButton text={molecule.InChI} label="InChI" />}

          {molecule.SMILES || molecule.InChI ? (
            <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />
          ) : null}

          <ExternalLinkBadge
            href={pubChemUrl}
            label="PubChem"
            isPubChem={true}
            disabled={!pubChemUrl}
          />
          {isFetchingCAS ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-gray-400 backdrop-blur-sm dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-500">
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

/**
 * VARIANT 3: Compact Card with Image Thumbnail
 * Space-efficient while keeping image prominent
 */
export const MoleculeDisplayCompact = ({
  molecule,
}: {
  molecule: DisplayMolecule;
}) => {
  const [orderedSynonyms] = useState<string[]>(() => getCommonNames(molecule));
  const [casRegistryNumber, setCasRegistryNumber] = useState<string | null>(
    molecule.casNumber || null,
  );
  const [isFetchingCAS, setIsFetchingCAS] = useState(false);

  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const chemicalFormula = formatFormula(molecule);

  const pubChemUrl = molecule.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubChemCid}`
    : null;

  const casUrl = casRegistryNumber
    ? `https://commonchemistry.cas.org/detail?cas_rn=${casRegistryNumber}&search=${casRegistryNumber}`
    : null;

  useEffect(() => {
    if (!casRegistryNumber && molecule.InChI && molecule.InChI.trim()) {
      setIsFetchingCAS(true);
      fetch("/api/cas/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inchi: molecule.InChI }),
      })
        .then((res) => res.json())
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
  }, [molecule.InChI, casRegistryNumber]);

  return (
    <div className="group flex w-full gap-4 overflow-hidden rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:border-gray-700/50 dark:bg-gray-800/80">
      {/* Image Thumbnail - Concentric with padding */}
      {molecule.imageUrl && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          {molecule.imageUrl.startsWith("data:") ||
          molecule.imageUrl.toLowerCase().endsWith(".svg") ? (
            <img
              className="h-full w-full object-contain p-2"
              src={molecule.imageUrl}
              alt={primaryName || "Molecule structure"}
            />
          ) : (
            <Image
              src={molecule.imageUrl}
              alt={primaryName || "Molecule structure"}
              fill
              className="object-contain p-2"
              sizes="96px"
            />
          )}
        </div>
      )}

      {/* Content - Flexible width */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Header */}
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

        {/* Synonyms */}
        {orderedSynonyms.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {orderedSynonyms.slice(0, 3).map((name, idx) => (
              <SynonymBadge key={`${name}-${idx}`} name={name} />
            ))}
            {orderedSynonyms.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{orderedSynonyms.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Formula */}
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Formula:
          </span>
          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
            {chemicalFormula || "N/A"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {molecule.SMILES && (
            <CopyButton text={molecule.SMILES} label="SMILES" />
          )}
          {molecule.InChI && <CopyButton text={molecule.InChI} label="InChI" />}

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-gray-400 backdrop-blur-sm dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-500">
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
