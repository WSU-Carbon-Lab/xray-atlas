"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ClipboardDocumentIcon,
  HandThumbUpIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpIconSolid } from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { SynonymsList } from "./synonyms-list";
import { Badge } from "@heroui/badge";
import { ToggleIconButton } from "../ui/toggle-icon-button";
import { MoleculeImageSVG } from "./molecule-image-svg";
import { useRealtimeUpvotes } from "~/hooks/useRealtimeUpvotes";
import type {
  molecules as Molecule,
  moleculesynonyms as MoleculeSynonym,
  moleculecontributors as MoleculeContributor,
  moleculefavorites as MoleculeFavorite,
  moleculeviews as MoleculeView,
  moleculetags as MoleculeTag,
  moleculeupvotes as MoleculeUpvote,
} from "@prisma/client";

// Helper function to get common names
const getCommonNames = (molecule: Molecule): string[] => {
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
const formatFormula = (molecule: Molecule): string => {
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
  // Check if the image is an SVG
  const isSVG = imageUrl.toLowerCase().endsWith(".svg");

  if (isSVG) {
    return (
      <div className="relative aspect-square w-full overflow-hidden sm:w-[45%]">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <MoleculeImageSVG
            imageUrl={imageUrl}
            name={name}
            className="h-full w-full transition-transform duration-300 group-hover:scale-105 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
          />
        </div>
      </div>
    );
  }

  // For non-SVG images, use Next.js Image component
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

const BadgedMolecule = ({ molecule }: { molecule: Molecule }) => {
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
  molecule: Molecule;
  onEdit?: () => void;
}) => {
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!session?.user;
  const utils = trpc.useUtils();
  const favoriteMutation = trpc.molecules.toggleFavorite.useMutation({
    onSuccess: () => {
      // Real-time updates will handle the UI refresh automatically
      // Still invalidate to ensure data consistency
      if (molecule.id) {
        void utils.molecules.getById.invalidate({ id: molecule.id });
      }
    },
  });

  // Real-time upvote updates
  const {
    upvoteCount: realtimeUpvoteCount,
    userHasUpvoted: realtimeUserHasUpvoted,
  } = useRealtimeUpvotes({
    moleculeId: molecule.id,
    initialUpvoteCount: molecule.upvoteCount ?? 0,
    initialUserHasUpvoted: molecule.userHasUpvoted ?? false,
    userId: user?.id,
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

  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const chemicalFormula = formatFormula(molecule);

  // Check if current user is the creator
  const isOwner = molecule.createdBy && user?.id === molecule.createdBy.id;

  const handleFavorite = async () => {
    if (!isSignedIn || !molecule.id) return;
    await favoriteMutation.mutateAsync({ moleculeId: molecule.id });
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

  // Use database values directly
  const pubChemUrl = molecule.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubChemCid}`
    : null;

  const casUrl = molecule.casNumber
    ? `https://commonchemistry.cas.org/detail?cas_rn=${molecule.casNumber}&search=${molecule.casNumber}`
    : null;

  // Copy handlers
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopy = async (text: string, label: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // No-op handler for external links (navigation handled by Link wrapper)
  const handleExternalLink = () => {
    // Navigation is handled by the Link component wrapper
  };

  return (
    <div className="group relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200/40 bg-white shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gray-300/60 hover:shadow-xl sm:flex-row dark:border-zinc-800/50 dark:bg-zinc-900 dark:hover:border-zinc-700/60">
      {/* Image Section - Left side with concentric shape */}
      <BadgedMolecule molecule={molecule} />

      {/* Content Section - Right side with Liquid Glass material */}
      <div className="relative flex flex-1 flex-col bg-white/60 backdrop-blur-2xl sm:w-[55%] dark:bg-zinc-900/60">
        {/* Liquid Glass background effect - layered transparency */}
        <div className="absolute inset-0 rounded-r-2xl bg-linear-to-br from-white/40 to-white/20 dark:from-zinc-900/20 dark:to-zinc-800/40" />
        {/* Content */}
        <div className="relative flex flex-1 flex-col p-6">
          <div className="space-y-3">
            {/* Header with name - left-aligned typography (Liquid Glass principle) */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-left text-2xl leading-tight font-bold text-gray-900 dark:text-white">
                    <Link href={`/molecules/${molecule.id}`}>
                      <span className="hover:text-accent dark:hover:text-accent-light">
                        {primaryName}
                      </span>
                    </Link>
                  </h3>
                  {/* Created by link */}
                  {molecule.createdBy && (
                    <div className="mt-1">
                      <Link
                        href={`/users/${molecule.createdBy.id}`}
                        className="hover:text-accent dark:hover:text-accent-light inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-400"
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
                      onClick={handleFavorite}
                      disabled={favoriteMutation.isPending}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 ${
                        realtimeUserHasUpvoted
                          ? "border-accent bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light"
                          : "hover:border-accent hover:bg-accent/10 dark:hover:bg-accent/20 border-gray-300 bg-white/60 text-gray-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-200"
                      }`}
                    >
                      {realtimeUserHasUpvoted ? (
                        <HandThumbUpIconSolid className="h-4 w-4" />
                      ) : (
                        <HandThumbUpIcon className="h-4 w-4" />
                      )}
                      <span className="font-semibold">
                        {realtimeUpvoteCount}
                      </span>
                    </button>
                    {isOwner && onEdit && (
                      <button
                        onClick={onEdit}
                        className="hover:border-accent hover:bg-accent/10 dark:hover:bg-accent/20 flex items-center gap-1.5 rounded-full border border-gray-300 bg-white/60 px-3 py-1.5 text-xs font-medium text-gray-700 transition-all active:scale-95 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-200"
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
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-zinc-400">
                  Formula
                </span>
                <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                  {chemicalFormula || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions - Bottom section with all buttons in one row - Responsive layout */}
          <div className="mt-2.5 border-t border-gray-200/20 pt-2.5 dark:border-zinc-800/20">
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 sm:gap-2">
              {molecule.SMILES ? (
                <ToggleIconButton
                  icon={<ClipboardDocumentIcon className="h-4 w-4" />}
                  label="SMILES"
                  isActive={copiedText === "SMILES"}
                  onClick={() => handleCopy(molecule.SMILES, "SMILES")}
                  ariaLabel="Copy SMILES"
                  tooltip={{
                    content:
                      copiedText === "SMILES" ? "Copied!" : "Copy SMILES",
                  }}
                />
              ) : (
                <div className="h-10 w-20" /> // Placeholder for consistent height
              )}
              {molecule.InChI ? (
                <ToggleIconButton
                  icon={<ClipboardDocumentIcon className="h-4 w-4" />}
                  label="InChI"
                  isActive={copiedText === "InChI"}
                  onClick={() => handleCopy(molecule.InChI, "InChI")}
                  ariaLabel="Copy InChI"
                  tooltip={{
                    content: copiedText === "InChI" ? "Copied!" : "Copy InChI",
                  }}
                />
              ) : (
                <div className="h-10 w-20" /> // Placeholder for consistent height
              )}
              {pubChemUrl ? (
                <Link
                  href={pubChemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ToggleIconButton
                    icon={
                      <Image
                        src="https://images.icon-icons.com/2415/PNG/512/c_line_logo_icon_146612.png"
                        alt="PubChem"
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain"
                      />
                    }
                    isActive={false}
                    onClick={handleExternalLink}
                    ariaLabel="Open PubChem"
                    tooltip={{ content: "Open in PubChem" }}
                  />
                </Link>
              ) : (
                <ToggleIconButton
                  icon={
                    <Image
                      src="https://images.icon-icons.com/2415/PNG/512/c_line_logo_icon_146612.png"
                      alt="PubChem"
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain opacity-50"
                    />
                  }
                  isActive={false}
                  disabled={true}
                  onClick={handleExternalLink}
                  ariaLabel="PubChem not available"
                  tooltip={{ content: "PubChem not available" }}
                />
              )}
              {casUrl ? (
                <Link href={casUrl} target="_blank" rel="noopener noreferrer">
                  <ToggleIconButton
                    icon={
                      <Image
                        src="https://cdn.prod.website-files.com/650861f00f97fe8153979335/6585a20f2b9c762a8e082a87_cas-favicon.png"
                        alt="CAS"
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain"
                      />
                    }
                    isActive={false}
                    onClick={handleExternalLink}
                    ariaLabel="Open CAS"
                    tooltip={{ content: "Open in CAS Registry" }}
                  />
                </Link>
              ) : (
                <ToggleIconButton
                  icon={
                    <Image
                      src="https://cdn.prod.website-files.com/650861f00f97fe8153979335/6585a20f2b9c762a8e082a87_cas-favicon.png"
                      alt="CAS"
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain opacity-50"
                    />
                  }
                  isActive={false}
                  disabled={true}
                  onClick={handleExternalLink}
                  ariaLabel="CAS not available"
                  tooltip={{ content: "CAS not available" }}
                />
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
  molecule: Molecule;
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

  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const chemicalFormula = formatFormula(molecule);

  // Use database values directly
  const pubChemUrl = molecule.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubChemCid}`
    : null;

  const casUrl = molecule.casNumber
    ? `https://commonchemistry.cas.org/detail?cas_rn=${molecule.casNumber}&search=${molecule.casNumber}`
    : null;

  // Copy handlers
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopy = async (text: string, label: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // No-op handler for external links (navigation handled by Link wrapper)
  const handleExternalLink = () => {
    // Navigation is handled by the Link component wrapper
  };

  return (
    <div className="group flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:border-zinc-800/50 dark:bg-zinc-900/80">
      {/* Header Row - Name, Formula, Experiment Count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h3 className="truncate text-lg font-bold text-gray-900 dark:text-white">
            {primaryName}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-zinc-400">
              Formula:
            </span>
            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
              {chemicalFormula || "N/A"}
            </span>
          </div>
        </div>
        {molecule.experimentCount !== undefined &&
          molecule.experimentCount > 0 && (
            <span className="bg-accent shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white">
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

      {/* Actions Row - Copy buttons and External links - All in one row - Responsive layout */}
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 border-t border-gray-200/20 pt-3 sm:gap-2 dark:border-zinc-800/20">
        {molecule.SMILES ? (
          <ToggleIconButton
            icon={<ClipboardDocumentIcon className="h-4 w-4" />}
            label="SMILES"
            isActive={copiedText === "SMILES"}
            onClick={() => handleCopy(molecule.SMILES, "SMILES")}
            ariaLabel="Copy SMILES"
            tooltip={{
              content: copiedText === "SMILES" ? "Copied!" : "Copy SMILES",
            }}
          />
        ) : (
          <div className="h-10 w-20" /> // Placeholder
        )}
        {molecule.InChI ? (
          <ToggleIconButton
            icon={<ClipboardDocumentIcon className="h-4 w-4" />}
            label="InChI"
            isActive={copiedText === "InChI"}
            onClick={() => handleCopy(molecule.InChI, "InChI")}
            ariaLabel="Copy InChI"
            tooltip={{
              content: copiedText === "InChI" ? "Copied!" : "Copy InChI",
            }}
          />
        ) : (
          <div className="h-10 w-20" /> // Placeholder
        )}
        {pubChemUrl ? (
          <Link href={pubChemUrl} target="_blank" rel="noopener noreferrer">
            <ToggleIconButton
              icon={
                <Image
                  src="https://images.icon-icons.com/2415/PNG/512/c_line_logo_icon_146612.png"
                  alt="PubChem"
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain"
                />
              }
              isActive={false}
              onClick={handleExternalLink}
              ariaLabel="Open PubChem"
              tooltip={{ content: "Open in PubChem" }}
            />
          </Link>
        ) : (
          <ToggleIconButton
            icon={
              <Image
                src="https://images.icon-icons.com/2415/PNG/512/c_line_logo_icon_146612.png"
                alt="PubChem"
                width={16}
                height={16}
                className="h-4 w-4 object-contain opacity-50"
              />
            }
            isActive={false}
            disabled={true}
            onClick={handleExternalLink}
            ariaLabel="PubChem not available"
            tooltip={{ content: "PubChem not available" }}
          />
        )}
        {casUrl ? (
          <Link href={casUrl} target="_blank" rel="noopener noreferrer">
            <ToggleIconButton
              icon={
                <Image
                  src="https://cdn.prod.website-files.com/650861f00f97fe8153979335/6585a20f2b9c762a8e082a87_cas-favicon.png"
                  alt="CAS"
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain"
                />
              }
              isActive={false}
              onClick={handleExternalLink}
              ariaLabel="Open CAS"
              tooltip={{ content: "Open in CAS Registry" }}
            />
          </Link>
        ) : (
          <ToggleIconButton
            icon={
              <Image
                src="https://cdn.prod.website-files.com/650861f00f97fe8153979335/6585a20f2b9c762a8e082a87_cas-favicon.png"
                alt="CAS"
                width={16}
                height={16}
                className="h-4 w-4 object-contain opacity-50"
              />
            }
            isActive={false}
            disabled={true}
            onClick={handleExternalLink}
            ariaLabel="CAS not available"
            tooltip={{ content: "CAS not available" }}
          />
        )}
      </div>
    </div>
  );
};

// Compact Card
const CompactCard = ({ molecule }: { molecule: Molecule }) => {
  return <div></div>;
};

// Full Card
const FullCard = ({ molecule }: { molecule: Molecule }) => {
  return <div></div>;
};

// Header Card
const HeaderCard = ({ molecule }: { molecule: Molecule }) => {
  return <div></div>;
};

// Card props
type MoleculeCardProps = {
  molecule: Molecule;
  variant: "compact" | "full" | "header";
};

// Just the JSX for the molecule card barren of logic
export const MoleculeCard = ({ molecule, variant }: MoleculeCardProps) => {
  switch (variant) {
    case "compact":
      return <CompactCard molecule={molecule} />;
    case "full":
      return <FullCard molecule={molecule} />;
    case "header":
      return <HeaderCard molecule={molecule} />;
  }
};
