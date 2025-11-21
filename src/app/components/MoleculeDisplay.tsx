"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { DefaultButton as Button } from "./Button";
import {
  CheckIcon,
  ClipboardDocumentIcon,
  HandThumbUpIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpIconSolid } from "@heroicons/react/24/solid";
import { useUser } from "@clerk/nextjs";
import { trpc } from "~/trpc/client";
import { SynonymsList } from "./SynonymsList";
import { Badge } from "@heroui/react";

const useCasRegistryLookup = (params: {
  inchi: string | undefined | null;
  initialCas: string | null | undefined;
}) => {
  const normalizedInchi = params.inchi?.trim() ?? "";
  const [casRegistryNumber, setCasRegistryNumber] = useState<string | null>(
    params.initialCas ?? null,
  );

  useEffect(() => {
    setCasRegistryNumber(params.initialCas ?? null);
  }, [params.initialCas]);

  const shouldFetch = Boolean(!casRegistryNumber && normalizedInchi.length > 0);

  const casQuery = trpc.external.searchCas.useQuery(
    { inchi: normalizedInchi },
    {
      enabled: shouldFetch,
      retry: false,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (casQuery.data?.ok && casQuery.data.data?.casRegistryNumber) {
      setCasRegistryNumber(casQuery.data.data.casRegistryNumber);
    }
  }, [casQuery.data]);

  useEffect(() => {
    if (casQuery.error) {
      console.error("Failed to fetch CAS registry number:", casQuery.error);
    }
  }, [casQuery.error]);

  return {
    casRegistryNumber,
    isFetching: shouldFetch && casQuery.isLoading,
  };
};

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
  id?: string; // Molecule ID for upvoting and editing
  upvoteCount?: number; // Number of upvotes
  userHasUpvoted?: boolean; // Whether current user has upvoted
  createdBy?: {
    id: string;
    name: string;
    email: string;
    imageurl: string | null;
  } | null; // User who created the molecule
};

// Shared helper components
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
    <Button
      onClick={handleCopy}
      color="primary"
      variant="flat"
      size="sm"
      isDisabled={!text}
    >
      <ClipboardDocumentIcon className="h-3.5 w-3.5 text-gray-400 transition-colors dark:text-gray-500" />
      {label}
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      ) : (
        <ClipboardDocumentIcon className="h-3.5 w-3.5 text-gray-400 transition-colors dark:text-gray-500" />
      )}
    </Button>
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
    <Button
      as={Link}
      href={href}
      className={baseClasses}
      color="primary"
      variant="flat"
      size="sm"
      isDisabled={disabled}
    >
      {iconContent}
      <span>{label}</span>
    </Button>
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

const MoleculeImage = ({
  imageUrl,
  name,
}: {
  imageUrl: string;
  name: string;
}) => {
  return (
    <div className="relative aspect-square w-full overflow-hidden sm:w-[45%]">
      <Image
        src={imageUrl}
        alt={name}
        fill
        className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 300px"
      />
    </div>
  );
};

const BadgedMolecule = ({ molecule }: { molecule: DisplayMolecule }) => {
  const experimentCount =
    typeof molecule.experimentCount === "number" ? molecule.experimentCount : 0;

  if (!experimentCount || experimentCount <= 0) {
    return (
      <MoleculeImage
        imageUrl={molecule.imageUrl ?? ""}
        name={molecule.name ?? ""}
      />
    );
  }

  const displayCount =
    experimentCount > 99 ? "+99" : experimentCount.toString();
  const content = `${displayCount} exp`;

  return (
    <Badge color="primary" variant="flat" size="sm" content={content}>
      <MoleculeImage
        imageUrl={molecule.imageUrl ?? ""}
        name={molecule.name ?? ""}
      />
    </Badge>
  );
};

export const MoleculeDisplay = ({
  molecule,
  onEdit,
}: {
  molecule: DisplayMolecule;
  onEdit?: () => void;
}) => {
  const { user, isSignedIn } = useUser();
  const utils = trpc.useUtils();
  const upvoteMutation = trpc.molecules.upvote.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh upvote count
      if (molecule.id) {
        void utils.molecules.getById.invalidate({ id: molecule.id });
      }
    },
  });

  // Sync synonyms with molecule prop changes
  const getCommonNamesHelper = (): string[] => {
    return getCommonNames(molecule);
  };

  // Initialize state with the actual function call result, not the function itself
  const [orderedSynonyms, setOrderedSynonyms] = useState<string[]>(() =>
    getCommonNamesHelper(),
  );

  useEffect(() => {
    const newCommonNames = getCommonNamesHelper();
    // Always update if the arrays are different
    if (
      newCommonNames.length !== orderedSynonyms.length ||
      !newCommonNames.every((name, idx) => orderedSynonyms[idx] === name)
    ) {
      setOrderedSynonyms(newCommonNames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [molecule]);

  const { casRegistryNumber, isFetching } = useCasRegistryLookup({
    inchi: molecule.InChI,
    initialCas: molecule.casNumber,
  });

  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const chemicalFormula = formatFormula(molecule);

  // Check if current user is the creator
  const isOwner = molecule.createdBy && user?.id === molecule.createdBy.id;

  // Handle upvote
  const handleUpvote = async () => {
    if (!isSignedIn || !molecule.id) return;
    await upvoteMutation.mutateAsync({ moleculeId: molecule.id });
  };

  // Sort synonyms by length (shortest first) and take the first 3
  const shortestSynonyms = useMemo(() => {
    if (orderedSynonyms.length === 0) return [];

    // Simply sort by length (shortest first) and take first 3
    const sorted = [...orderedSynonyms].sort((a, b) => a.length - b.length);

    // Filter out the primary name only if we have multiple synonyms and it's in the list
    const currentPrimaryName =
      orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
    const filtered =
      sorted.length > 1 && sorted.includes(currentPrimaryName)
        ? sorted.filter((syn) => syn !== currentPrimaryName)
        : sorted;

    // Always return at least something - if we filtered everything, use original sorted
    return filtered.length > 0 ? filtered.slice(0, 3) : sorted.slice(0, 3);
  }, [orderedSynonyms, molecule.name]);

  const pubChemUrl = molecule.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubChemCid}`
    : null;

  const casUrl = casRegistryNumber
    ? `https://commonchemistry.cas.org/detail?cas_rn=${casRegistryNumber}&search=${casRegistryNumber}`
    : null;

  return (
    <div className="group relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200/40 bg-white shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gray-300/60 hover:shadow-xl sm:flex-row dark:border-gray-700/40 dark:bg-gray-800 dark:hover:border-gray-600/60">
      {/* Image Section - Left side with concentric shape */}
      <BadgedMolecule molecule={molecule} />

      {/* Content Section - Right side with Liquid Glass material */}
      <div className="relative flex flex-1 flex-col bg-white/60 backdrop-blur-2xl sm:w-[55%] dark:bg-gray-800/60">
        {/* Liquid Glass background effect - layered transparency */}
        <div className="absolute inset-0 rounded-r-2xl bg-linear-to-br from-white/40 to-white/20 dark:from-gray-900/20 dark:to-gray-800/40" />
        {/* Content */}
        <div className="relative flex flex-1 flex-col p-6">
          <div className="space-y-3">
            {/* Header with name - left-aligned typography (Liquid Glass principle) */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-left text-2xl leading-tight font-bold text-gray-900 dark:text-gray-100">
                    <Link href={`/molecules/${molecule.id}`}>
                      <span className="hover:text-wsu-crimson dark:hover:text-wsu-crimson">
                        {primaryName}
                      </span>
                    </Link>
                  </h3>
                  {/* Created by link */}
                  {molecule.createdBy && (
                    <div className="mt-1">
                      <Link
                        href={`/users/${molecule.createdBy.id}`}
                        className="hover:text-wsu-crimson dark:hover:text-wsu-crimson inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
                      >
                        <span>Created by</span>
                        <span className="font-medium">
                          {molecule.createdBy.name}
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
                {/* Upvote/edit buttons - Desktop and Mobile */}
                {molecule.id && isSignedIn && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={handleUpvote}
                      disabled={upvoteMutation.isPending}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 ${
                        molecule.userHasUpvoted
                          ? "border-wsu-crimson bg-wsu-crimson/10 text-wsu-crimson dark:bg-wsu-crimson/20"
                          : "hover:border-wsu-crimson hover:bg-wsu-crimson/10 dark:hover:bg-wsu-crimson/20 border-gray-300 bg-white/60 text-gray-700 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-200"
                      }`}
                    >
                      {molecule.userHasUpvoted ? (
                        <HandThumbUpIconSolid className="h-4 w-4" />
                      ) : (
                        <HandThumbUpIcon className="h-4 w-4" />
                      )}
                      <span className="font-semibold">
                        {molecule.upvoteCount ?? 0}
                      </span>
                    </button>
                    {isOwner && onEdit && (
                      <button
                        onClick={onEdit}
                        className="hover:border-wsu-crimson hover:bg-wsu-crimson/10 dark:hover:bg-wsu-crimson/20 flex items-center gap-1.5 rounded-full border border-gray-300 bg-white/60 px-3 py-1.5 text-xs font-medium text-gray-700 transition-all active:scale-95 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-200"
                        title="Edit molecule"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Synonyms - Capsule shapes for touch-friendly design - Show 3 shortest */}
              {(() => {
                // Always show synonyms if we have them, regardless of filtering
                const synonymsToShow =
                  shortestSynonyms.length > 0
                    ? shortestSynonyms
                    : orderedSynonyms.length > 0
                      ? orderedSynonyms.slice(0, 3)
                      : [];

                if (synonymsToShow.length === 0) return null;

                return (
                  <SynonymsList
                    synonyms={synonymsToShow}
                    allSynonyms={orderedSynonyms}
                    maxDisplay={2}
                    variant="liquid-glass"
                  />
                );
              })()}

              {/* Chemical Formula - Prominent display with better hierarchy */}
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Formula
                </span>
                <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                  {chemicalFormula || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions - Bottom section with capsule buttons - Tighter spacing */}
          <div className="mt-2.5 space-y-2 border-t border-gray-200/20 pt-2.5 dark:border-gray-700/20">
            {/* Copy actions - Capsule shapes (half-height radius) */}
            <div className="flex flex-wrap items-center gap-2">
              {molecule.SMILES && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(molecule.SMILES);
                    } catch (err) {
                      console.error("Failed to copy:", err);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium text-gray-700 backdrop-blur-sm transition-all hover:border-gray-300 hover:bg-white/80 dark:border-gray-600/60 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:bg-gray-700/80"
                >
                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                  SMILES
                </button>
              )}
              {molecule.InChI && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(molecule.InChI);
                    } catch (err) {
                      console.error("Failed to copy:", err);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium text-gray-700 backdrop-blur-sm transition-all hover:border-gray-300 hover:bg-white/80 dark:border-gray-600/60 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:bg-gray-700/80"
                >
                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                  InChI
                </button>
              )}
            </div>

            {/* External links - Capsule shapes with icons */}
            <div className="flex flex-wrap items-center gap-2">
              {pubChemUrl && (
                <ExternalLinkBadge
                  href={pubChemUrl}
                  label="PubChem"
                  isPubChem={true}
                  disabled={!pubChemUrl}
                />
              )}
              {isFetching ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium text-gray-400 backdrop-blur-sm dark:border-gray-600/60 dark:bg-gray-700/60 dark:text-gray-500">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300" />
                  Loading...
                </span>
              ) : (
                casUrl && (
                  <ExternalLinkBadge
                    href={casUrl}
                    label="CAS"
                    isCAS={true}
                    disabled={!casUrl}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * COMPACT: Image-less compact layout that stretches full width
 * Shows up to 10 synonyms and displays horizontally
 */
export const MoleculeDisplayCompact = ({
  molecule,
}: {
  molecule: DisplayMolecule;
}) => {
  // Sync synonyms with molecule prop changes
  const getCommonNamesHelper = (): string[] => {
    return getCommonNames(molecule);
  };

  const [orderedSynonyms, setOrderedSynonyms] = useState<string[]>(() =>
    getCommonNamesHelper(),
  );

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

  const { casRegistryNumber, isFetching } = useCasRegistryLookup({
    inchi: molecule.InChI,
    initialCas: molecule.casNumber,
  });

  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const chemicalFormula = formatFormula(molecule);

  const pubChemUrl = molecule.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubChemCid}`
    : null;

  const casUrl = casRegistryNumber
    ? `https://commonchemistry.cas.org/detail?cas_rn=${casRegistryNumber}&search=${casRegistryNumber}`
    : null;

  return (
    <div className="group flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:border-gray-700/50 dark:bg-gray-800/80">
      {/* Header Row - Name, Formula, Experiment Count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h3 className="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
            {primaryName}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Formula:
            </span>
            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
              {chemicalFormula || "N/A"}
            </span>
          </div>
        </div>
        {molecule.experimentCount !== undefined &&
          molecule.experimentCount > 0 && (
            <span className="bg-wsu-crimson shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white">
              {molecule.experimentCount} exp
            </span>
          )}
      </div>

      {/* Synonyms - Full width, up to 10 synonyms */}
      {orderedSynonyms.length > 0 && (
        <div className="w-full">
          <SynonymsList
            synonyms={orderedSynonyms}
            maxDisplay={10}
            variant="compact"
            className="flex flex-wrap items-center gap-2"
          />
        </div>
      )}

      {/* Actions Row - Copy buttons and External links */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200/20 pt-3 dark:border-gray-700/20">
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
        {isFetching ? (
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
  );
};
