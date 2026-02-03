"use client";

import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Copy } from "lucide-react";
import { AvatarGroup, type UserWithOrcid } from "../ui/avatar";
import {
  Button,
  Card,
  Input,
  TagGroup,
  Tag,
  Tooltip,
  ScrollShadow,
} from "@heroui/react";
import { useSession } from "next-auth/react";
import { showToast } from "~/app/components/Toast";
import { trpc } from "~/trpc/client";
import { SynonymChipsWithPopup } from "./synonyms-list";
import { MoleculeImageSVG } from "./molecule-image-svg";
import { useRealtimeUpvotes } from "~/hooks/useRealtimeUpvotes";
import type { MoleculeView } from "~/types/molecule";
import { getTagChipClass, getTagInlineStyle } from "~/lib/tag-colors";
import {
  CategoryTagGroupEditable,
  MoleculeTags,
  getPreviewGradient,
} from "./category-tags";
import {
  Atom,
  Check,
  CheckCircle2,
  Circle,
  Database,
  Eye,
  Heart,
  Pencil,
  User,
  X,
} from "lucide-react";

const EDIT_FIELD_CLASS =
  "rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-700/90";

const CAS_FAVICON_URL =
  "https://cdn.prod.website-files.com/650861f00f97fe8153979335/6585a20f2b9c762a8e082a87_cas-favicon.png";
const PUBCHEM_FAVICON_URL = "https://pubchem.ncbi.nlm.nih.gov/favicon.ico";

// API Interface Helper Functions
const pubChemUrl = (cid: string) => {
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
};

const casUrl = (casNumber: string) => {
  return `https://commonchemistry.cas.org/detail?cas_rn=${casNumber}&search=${casNumber}`;
};

const CAS_REGEX = /^\d{1,7}-\d{2}-\d$/;
function validateCas(value: string): boolean {
  if (!value.trim()) return true;
  return CAS_REGEX.test(value.trim());
}

function validatePubChemCid(value: string): boolean {
  if (!value.trim()) return true;
  return /^\d+$/.test(value.trim());
}

const COPIED_RESET_MS = 2000;

function CopyButton({
  text,
  label,
  copiedLabel,
  onCopy,
  className = "",
  size = "default",
}: {
  text: string;
  label: string;
  copiedLabel: string | null;
  onCopy: (text: string, label: string) => void;
  className?: string;
  size?: "default" | "inline";
}) {
  const isInline = size === "inline";
  const [showCheck, setShowCheck] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    onCopy(text, label);
    setShowCheck(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowCheck(false);
      timeoutRef.current = null;
    }, COPIED_RESET_MS);
  }, [text, label, onCopy]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const iconClass = isInline ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0";
  const transitionClass = "transition-opacity duration-200";

  return (
    <Tooltip delay={0}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={showCheck ? "Copied" : `Copy ${label}`}
        className={
          isInline
            ? `focus-visible:ring-accent text-text-tertiary hover:bg-surface-2 hover:text-text-secondary inline-flex shrink-0 items-center justify-center rounded-md p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${className}`
            : `focus-visible:ring-accent text-text-tertiary hover:bg-surface-2 hover:text-text-secondary inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${className}`
        }
      >
        <span className="relative inline-flex items-center justify-center">
          <Copy
            className={`${iconClass} ${transitionClass} ${showCheck ? "pointer-events-none opacity-0" : "opacity-100"}`}
            aria-hidden
          />
          <Check
            className={`${iconClass} absolute shrink-0 text-emerald-600 dark:text-emerald-400 ${transitionClass} ${showCheck ? "opacity-100" : "pointer-events-none opacity-0"}`}
            aria-hidden
          />
        </span>
      </button>
      <Tooltip.Content placement="top">
        {showCheck || copiedLabel === label ? "Copied!" : `Copy ${label}`}
      </Tooltip.Content>
    </Tooltip>
  );
}

const getCommonNames = (molecule: MoleculeView): string[] => {
  const list = molecule.commonName;
  if (Array.isArray(list)) {
    const valid = list.filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0,
    );
    if (valid.length > 0) return valid;
  }
  return [];
};

const clipboard = (text: string, _label: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(text);
  }
};

// Molecule Specific Atomic Components

export interface MoleculeImageProps {
  imageUrl: string;
  name: string;
  size?: "sm" | "md" | "lg";
  experimentCount?: number;
  className?: string;
  badge?: boolean; // Optionally force badge rendering
}

export const MoleculeImage = ({
  imageUrl,
  name,
  size = "md",
  className = "",
  experimentCount: _experimentCount,
  badge: _badge,
}: MoleculeImageProps) => {
  const sizeMap = {
    sm: "w-14",
    md: "w-20",
    lg: "w-24",
  } as const;
  const sizeClass = sizeMap[size];
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden sm:w-[45%] ${sizeClass} ${className}`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <MoleculeImageSVG
          imageUrl={imageUrl}
          name={name}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
        />
      </div>
    </div>
  );
};

interface MoleculeDecriptionTagsProps extends React.ComponentProps<
  typeof TagGroup
> {
  molecule: MoleculeView;
}

export const MoleculeDecriptionTags = ({
  molecule,
  ...props
}: MoleculeDecriptionTagsProps) => {
  return (
    <TagGroup {...props}>
      <TagGroup.List>
        <Tag id="inchi" onClick={() => clipboard(molecule.InChI, "InChI")}>
          <Copy className="h-4 w-4" />
          InChI
        </Tag>
        <Tag id="smiles" onClick={() => clipboard(molecule.SMILES, "SMILES")}>
          <Copy className="h-4 w-4" />
          SMILES
        </Tag>
        <Tag
          id="pubchem"
          onClick={() =>
            window.open(pubChemUrl(molecule.pubChemCid ?? ""), "_blank")
          }
        >
          <Image
            src={PUBCHEM_FAVICON_URL}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
            unoptimized
          />
          PubChem
        </Tag>
        <Tag
          id="cas"
          onClick={() =>
            window.open(casUrl(molecule.casNumber ?? ""), "_blank")
          }
        >
          <Image
            src={CAS_FAVICON_URL}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
            unoptimized
          />
          CAS
        </Tag>
      </TagGroup.List>
    </TagGroup>
  );
};

interface MoleculeCardActionsProps {
  molecule: MoleculeView;
  pubChemUrl: string | null;
  casUrl: string | null;
  copiedText: string | null;
  handleCopy: (text: string, label: string) => void;
  size?: "sm" | "md";
}

function MoleculeCardActions({
  molecule,
  pubChemUrl,
  casUrl,
  copiedText,
  handleCopy,
  size = "sm",
}: MoleculeCardActionsProps) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textClass = size === "sm" ? "text-[10px]" : "text-xs";
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onClick={(e) => e.stopPropagation()}
      role="group"
    >
      {molecule.InChI ? (
        <Tooltip delay={0}>
          <Button
            size={size}
            variant="secondary"
            aria-label="Copy InChI"
            onPress={() => handleCopy(molecule.InChI, "InChI")}
            className={`focus-visible:ring-accent inline-flex gap-1.5 ${
              copiedText === "InChI"
                ? "text-accent dark:text-accent-light"
                : "text-text-tertiary"
            }`}
          >
            <Copy className={iconClass} aria-hidden />
            <span className={textClass}>InChI</span>
          </Button>
          <Tooltip.Content placement="top">
            {copiedText === "InChI" ? "Copied!" : "Copy InChI"}
          </Tooltip.Content>
        </Tooltip>
      ) : null}
      {molecule.SMILES ? (
        <Tooltip delay={0}>
          <Button
            size={size}
            variant="secondary"
            aria-label="Copy SMILES"
            onPress={() => handleCopy(molecule.SMILES, "SMILES")}
            className={`focus-visible:ring-accent inline-flex gap-1.5 ${
              copiedText === "SMILES"
                ? "text-accent dark:text-accent-light"
                : "text-text-tertiary"
            }`}
          >
            <Copy className={iconClass} aria-hidden />
            <span className={textClass}>SMILES</span>
          </Button>
          <Tooltip.Content placement="top">
            {copiedText === "SMILES" ? "Copied!" : "Copy SMILES"}
          </Tooltip.Content>
        </Tooltip>
      ) : null}
      {casUrl ? (
        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <Link
              href={casUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open CAS Registry"
              className="text-text-secondary focus-visible:ring-accent inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color] hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={CAS_FAVICON_URL}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
                unoptimized
              />
            </Link>
          </Tooltip.Trigger>
          <Tooltip.Content placement="top">
            Open in CAS Registry
          </Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip delay={0}>
          <span
            className="inline-flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-lg opacity-50"
            title="CAS not available"
          >
            <Image
              src={CAS_FAVICON_URL}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 object-contain opacity-50"
              unoptimized
            />
          </span>
          <Tooltip.Content placement="top">CAS not available</Tooltip.Content>
        </Tooltip>
      )}
      {pubChemUrl ? (
        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <Link
              href={pubChemUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open PubChem"
              className="text-text-secondary focus-visible:ring-accent inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color] hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={PUBCHEM_FAVICON_URL}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
                unoptimized
              />
            </Link>
          </Tooltip.Trigger>
          <Tooltip.Content placement="top">Open in PubChem</Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip delay={0}>
          <span
            className="inline-flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-lg opacity-50"
            title="PubChem not available"
          >
            <Image
              src={PUBCHEM_FAVICON_URL}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 object-contain opacity-50"
              unoptimized
            />
          </span>
          <Tooltip.Content placement="top">
            PubChem not available
          </Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
}

interface FavoriteMutationLike {
  isPending: boolean;
  mutateAsync: (input: { moleculeId: string }) => Promise<unknown>;
}

interface MoleculeCardContext {
  onEdit: () => void;
  isSignedIn: boolean;
  canEdit: boolean;
  handleFavorite: () => void;
  favoriteMutation: FavoriteMutationLike;
  realtimeUserHasUpvoted: boolean;
  realtimeUpvoteCount: number;
  copiedText: string | null;
  handleCopy: (text: string, label: string) => void;
}

export interface MoleculeCardProps {
  molecule: MoleculeView;
  primaryName: string;
  orderedSynonyms: string[];
  shortestSynonyms: string[];
  pubChemUrl: string | null;
  casUrl: string | null;
  isSignedIn: boolean;
  canEdit: boolean;
  handleFavorite: () => void;
  favoriteMutation: FavoriteMutationLike;
  realtimeUserHasUpvoted: boolean;
  realtimeUpvoteCount: number;
  onEdit: () => void;
  copiedText: string | null;
  handleCopy: (text: string, label: string) => void;
}

interface MoleculeImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasImage: boolean;
  imageUrl: string;
  primaryName: string;
  chemicalFormula: string | null;
  previewGradient: string;
}

function MoleculeImageModal({
  isOpen,
  onClose,
  hasImage,
  imageUrl,
  primaryName,
  chemicalFormula: _chemicalFormula,
  previewGradient,
}: MoleculeImageModalProps) {
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="button"
      tabIndex={0}
      aria-label="Close"
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl border-2 border-zinc-600 bg-white shadow-2xl dark:border-zinc-500 dark:bg-black"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {hasImage ? (
          <div className="flex h-[min(75vh,800px)] max-h-[85vh] w-[min(75vw,800px)] max-w-[85vw] items-center justify-center overflow-hidden bg-white p-8 dark:bg-black">
            <MoleculeImageSVG
              imageUrl={imageUrl}
              name={primaryName}
              className="h-full max-h-[65vh] w-full max-w-[65vw] [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
            />
          </div>
        ) : (
          <div
            className={`flex h-80 w-80 items-center justify-center rounded-xl bg-linear-to-br ${previewGradient}`}
          >
            <Atom
              className="h-40 w-40 text-white/80"
              strokeWidth={1}
              aria-hidden
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export const CompactCard = memo(function CompactCard({
  props,
}: {
  props: MoleculeCardProps;
}) {
  const fromContributorsCompact =
    (props.molecule.contributors?.length ?? 0) > 0
      ? props.molecule.contributors!.map((c) => c.user)
      : [];
  const avatarUsers: UserWithOrcid[] =
    fromContributorsCompact.length > 0
      ? fromContributorsCompact
      : props.molecule.createdBy
        ? [props.molecule.createdBy]
        : [];
  const previewGradient = getPreviewGradient(props.molecule);
  const hasImage = Boolean(props.molecule.imageUrl?.trim());
  const viewCount = props.molecule.viewCount ?? 0;
  const experimentCount = props.molecule.experimentCount ?? 0;
  const [imageModalOpen, setImageModalOpen] = useState(false);

  return (
    <div className="group border-border-default hover:border-border-strong dark:border-border-default hover:border-accent/30 flex w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 p-3 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md md:flex-row md:items-start md:gap-4 dark:bg-zinc-800">
      <div className="flex min-w-0 flex-1 items-start gap-2 border-r border-zinc-200 pr-2 md:flex-row md:gap-4 md:pr-4 dark:border-zinc-600">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setImageModalOpen(true);
          }}
          className={`relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-105 md:h-14 md:w-14 dark:bg-black ${
            hasImage ? "" : `bg-linear-to-br ${previewGradient}`
          }`}
          aria-label="View molecule structure"
        >
          {hasImage ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-1">
              <MoleculeImageSVG
                imageUrl={props.molecule.imageUrl ?? ""}
                name={props.primaryName}
                className="h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Atom
                className="h-6 w-6 text-white/80"
                strokeWidth={1}
                aria-hidden
              />
            </div>
          )}
          {props.realtimeUserHasUpvoted ? (
            <span
              className="bg-accent absolute top-1 right-1 h-2.5 w-2.5 rounded-full border border-black/50 shadow-[0_0_4px_rgba(99,102,241,0.8)]"
              aria-hidden
            />
          ) : null}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden py-0.5">
            <div className="flex min-w-0 items-end gap-2 overflow-hidden">
              <div className="flex h-5 shrink-0 items-end">
                <Link
                  href={`/molecules/${props.molecule.id}`}
                  className="text-text-primary motion-safe:group-hover:text-accent block truncate text-sm leading-tight font-bold hover:underline motion-safe:transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {props.primaryName}
                </Link>
              </div>
              {props.orderedSynonyms.length > 0 ? (
                <div className="flex h-5 shrink-0 items-end">
                  <SynonymChipsWithPopup
                    synonyms={props.orderedSynonyms}
                    collapseOnly
                  />
                </div>
              ) : null}
            </div>
            <div className="flex min-w-0 shrink items-center gap-2 overflow-hidden">
              <span className="text-text-tertiary border-border-default inline-flex h-5 shrink-0 items-center rounded border bg-zinc-100 px-1.5 font-mono text-[9px] tabular-nums sm:text-[10px] dark:bg-zinc-700">
                {props.molecule.chemicalFormula || "N/A"}
              </span>
              {props.molecule.casNumber ? (
                <Tooltip delay={0}>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      aria-label="Copy CAS number"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.handleCopy(props.molecule.casNumber ?? "", "CAS");
                      }}
                      className={`focus-visible:ring-accent inline-flex h-5 max-w-full shrink items-center gap-1 rounded px-1.5 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:px-2 ${
                        props.copiedText === "CAS"
                          ? "bg-info/30 text-info dark:bg-info/40 dark:text-info-light"
                          : "bg-info/20 text-info dark:bg-info/30 dark:text-info-light"
                      }`}
                    >
                      <Copy
                        className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5"
                        aria-hidden
                      />
                      <span className="truncate font-mono text-[9px] tabular-nums sm:text-[10px]">
                        CAS {props.molecule.casNumber}
                      </span>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="top">
                    {props.copiedText === "CAS" ? "Copied!" : "Copy CAS number"}
                  </Tooltip.Content>
                </Tooltip>
              ) : null}
            </div>
          </div>
          <div className="flex min-w-24 flex-1 shrink-0 flex-wrap items-center justify-start gap-0.5 py-0.5 sm:gap-1">
            {(props.molecule.moleculeTags ?? []).slice(0, 3).map((tag) => {
              const chipClass = getTagChipClass(tag);
              const inlineStyle = getTagInlineStyle(tag);
              return (
                <span
                  key={tag.id}
                  className={`inline-flex max-w-12 shrink-0 items-center truncate rounded-md px-1 py-0.5 text-[8px] font-medium uppercase sm:max-w-none sm:px-1.5 sm:text-[9px] ${chipClass}`}
                  style={inlineStyle}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div
        className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-3 border-t border-zinc-200 pt-3 md:ml-auto md:gap-x-3 md:gap-y-0 md:border-t-0 md:pt-0 md:pl-4 dark:border-zinc-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <MoleculeCardActions
            molecule={props.molecule}
            pubChemUrl={props.pubChemUrl}
            casUrl={props.casUrl}
            copiedText={props.copiedText}
            handleCopy={props.handleCopy}
            size="sm"
          />
        </div>
        <div>
          <AvatarGroup users={avatarUsers} size="sm" />
        </div>
        <div className="flex min-w-[56px] shrink-0 flex-col items-end gap-0.5">
          <span className="flex items-center gap-1 text-[10px] text-sky-500 tabular-nums">
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {viewCount >= 1000
              ? `${(viewCount / 1000).toFixed(1)}k`
              : viewCount}
          </span>
          {props.molecule.id && props.isSignedIn ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                props.handleFavorite();
              }}
              disabled={props.favoriteMutation.isPending}
              aria-label={
                props.realtimeUserHasUpvoted ? "Unfavorite" : "Favorite"
              }
              className={`flex items-center gap-1 text-xs font-medium tabular-nums transition-colors hover:opacity-80 disabled:opacity-50 ${
                props.realtimeUserHasUpvoted
                  ? "text-pink-500"
                  : "text-text-tertiary"
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 shrink-0 ${
                  props.realtimeUserHasUpvoted
                    ? "fill-pink-500 text-pink-500"
                    : ""
                }`}
                aria-hidden
              />
              {props.realtimeUpvoteCount}
            </button>
          ) : (
            <span
              className={`flex items-center gap-1 text-xs font-medium tabular-nums ${
                props.realtimeUserHasUpvoted
                  ? "text-pink-500"
                  : "text-text-tertiary"
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 shrink-0 ${
                  props.realtimeUserHasUpvoted
                    ? "fill-pink-500 text-pink-500"
                    : ""
                }`}
                aria-hidden
              />
              {props.realtimeUpvoteCount}
            </span>
          )}
          <span
            className="flex items-center gap-1 text-[10px] text-amber-500 tabular-nums"
            title="Datasets"
          >
            <Database className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {experimentCount >= 1000
              ? `${(experimentCount / 1000).toFixed(1)}k`
              : experimentCount}
          </span>
        </div>
      </div>
      <MoleculeImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        hasImage={hasImage}
        imageUrl={props.molecule.imageUrl ?? ""}
        primaryName={props.primaryName}
        chemicalFormula={props.molecule.chemicalFormula}
        previewGradient={previewGradient}
      />
    </div>
  );
});

function ContributorsOrEmpty({
  users,
  overlay,
}: {
  users: UserWithOrcid[];
  overlay?: boolean;
}) {
  if (users.length > 0) {
    return <AvatarGroup users={users} size="sm" />;
  }
  return (
    <span
      className={`flex items-center gap-1.5 text-xs ${
        overlay ? "text-slate-700 dark:text-slate-200" : "text-text-tertiary"
      }`}
      title="No contributors"
    >
      <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
      No contributors
    </span>
  );
}

export const FullCard = memo(function FullCard({
  props,
}: {
  props: MoleculeCardProps;
}) {
  const fromContributors =
    (props.molecule.contributors?.length ?? 0) > 0
      ? props.molecule.contributors!.map((c) => c.user)
      : [];
  const avatarUsers: UserWithOrcid[] =
    fromContributors.length > 0
      ? fromContributors
      : props.molecule.createdBy
        ? [props.molecule.createdBy]
        : [];
  const previewGradient = getPreviewGradient(props.molecule);
  const hasImage = Boolean(props.molecule.imageUrl?.trim());
  const experimentCount = props.molecule.experimentCount ?? 0;

  const [imageModalOpen, setImageModalOpen] = useState(false);

  return (
    <Card className="group border-border-default hover:border-border-strong hover:border-accent/30 dark:border-border-default dark:hover:border-border-strong flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md sm:flex-row dark:bg-zinc-800">
      <div
        className="group/image relative flex h-40 w-full shrink-0 overflow-hidden rounded-lg bg-white sm:h-auto sm:min-h-[240px] sm:w-[45%] dark:bg-black"
        aria-hidden
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setImageModalOpen(true);
          }}
          className="flex h-full w-full cursor-pointer items-center justify-center p-4"
          aria-label="View molecule structure"
        >
          {hasImage ? (
            <div className="pointer-events-none flex h-full w-full items-center justify-center">
              <MoleculeImageSVG
                imageUrl={props.molecule.imageUrl ?? ""}
                name={props.primaryName}
                className="h-full w-full motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:group-hover/image:scale-105 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
              />
            </div>
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-linear-to-br ${previewGradient}`}
            >
              <Atom
                className="h-14 w-14 text-white/80 drop-shadow-lg motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:group-hover/image:scale-110 motion-safe:group-hover/image:opacity-100"
                strokeWidth={1}
                aria-hidden
              />
            </div>
          )}
        </button>
        <div
          className="absolute inset-x-0 top-0 flex justify-center p-2"
          onClick={(e) => e.stopPropagation()}
          aria-hidden
        >
          <span
            className="shrink-0 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800 tabular-nums dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            title="Chemical formula"
          >
            {props.molecule.chemicalFormula}
          </span>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex justify-end bg-white/60 px-2 py-2 text-slate-900 backdrop-blur-md dark:bg-black/60 dark:text-slate-100"
          onClick={(e) => e.stopPropagation()}
          aria-hidden
        >
          <ContributorsOrEmpty users={avatarUsers} overlay />
        </div>
      </div>
      <MoleculeImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        hasImage={hasImage}
        imageUrl={props.molecule.imageUrl ?? ""}
        primaryName={props.primaryName}
        chemicalFormula={props.molecule.chemicalFormula}
        previewGradient={previewGradient}
      />
      <Card.Content className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/molecules/${props.molecule.id}`}
            className="text-text-primary hover:text-accent dark:hover:text-accent-light line-clamp-1 text-lg leading-tight font-bold transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {props.primaryName}
          </Link>
        </div>
        {props.orderedSynonyms.length > 0 ? (
          <div
            className="min-w-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <SynonymChipsWithPopup
              synonyms={props.orderedSynonyms}
              maxSynonyms={3}
            />
          </div>
        ) : null}
        {props.molecule.casNumber ? (
          <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <button
                  type="button"
                  aria-label="Copy CAS number"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.handleCopy(props.molecule.casNumber ?? "", "CAS");
                  }}
                  className={`focus-visible:ring-accent inline-flex items-center gap-2 rounded-md px-2 py-1 font-mono text-xs tabular-nums transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                    props.copiedText === "CAS"
                      ? "bg-info/30 text-info dark:bg-info/40 dark:text-info-light"
                      : "bg-info/20 text-info dark:bg-info/30 dark:text-info-light"
                  }`}
                >
                  <Copy className="h-4 w-4 shrink-0" aria-hidden />
                  CAS {props.molecule.casNumber}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="top">
                {props.copiedText === "CAS" ? "Copied!" : "Copy CAS number"}
              </Tooltip.Content>
            </Tooltip>
          </div>
        ) : null}
        {props.molecule.iupacName ? (
          <div
            className="min-w-0 flex-1 text-xs leading-relaxed"
            onClick={(e) => e.stopPropagation()}
          >
            <ScrollShadow
              className="max-h-[3.25em] min-h-0 overflow-x-hidden overflow-y-auto"
              hideScrollBar
            >
              <p className="text-text-tertiary wrap-break-word">
                {props.molecule.iupacName}
              </p>
            </ScrollShadow>
          </div>
        ) : null}
        <div className="p-2" onClick={(e) => e.stopPropagation()}>
          <MoleculeCardActions
            molecule={props.molecule}
            pubChemUrl={props.pubChemUrl}
            casUrl={props.casUrl}
            copiedText={props.copiedText}
            handleCopy={props.handleCopy}
            size="sm"
          />
        </div>
        {(props.molecule.moleculeTags?.length ?? 0) > 0 ? (
          <div onClick={(e) => e.stopPropagation()}>
            <MoleculeTags molecule={props.molecule} />
          </div>
        ) : null}
        <footer
          className="mt-auto flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-600"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className="flex items-center gap-1 text-xs text-sky-500 tabular-nums"
            title="Views"
          >
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {props.molecule.viewCount ?? 0}
          </span>
          <div
            className={`flex items-center gap-1 text-xs tabular-nums ${
              props.realtimeUserHasUpvoted
                ? "font-medium text-pink-500"
                : "text-text-tertiary"
            }`}
          >
            {props.molecule.id && props.isSignedIn ? (
              <Button
                size="sm"
                variant="secondary"
                isIconOnly
                aria-label={
                  props.realtimeUserHasUpvoted ? "Unfavorite" : "Favorite"
                }
                isDisabled={props.favoriteMutation.isPending}
                onPress={props.handleFavorite}
                className={`focus-visible:ring-accent -m-1 ${
                  props.realtimeUserHasUpvoted
                    ? "text-pink-500"
                    : "text-text-tertiary"
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 shrink-0 ${
                    props.realtimeUserHasUpvoted
                      ? "fill-pink-500 text-pink-500"
                      : ""
                  }`}
                  aria-hidden
                />
              </Button>
            ) : (
              <Heart
                className={`h-3.5 w-3.5 shrink-0 ${
                  props.realtimeUserHasUpvoted
                    ? "fill-pink-500 text-pink-500"
                    : ""
                }`}
                aria-hidden
              />
            )}
            {props.realtimeUpvoteCount}
          </div>
          <span
            className="flex items-center gap-1 text-xs text-amber-500 tabular-nums"
            title="Datasets"
          >
            <Database className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {experimentCount >= 1000
              ? `${(experimentCount / 1000).toFixed(1)}k`
              : experimentCount}
          </span>
        </footer>
      </Card.Content>
    </Card>
  );
});

type HeaderEditForm = {
  iupacName: string;
  chemicalFormula: string;
  commonNames: string[];
  primaryIndex: number;
  SMILES: string;
  InChI: string;
  casNumber: string;
  pubChemCid: string;
  tagIds: string[];
};

function initEditForm(m: MoleculeView): HeaderEditForm {
  const commonNames = getCommonNames(m);
  return {
    iupacName: m.iupacName ?? "",
    chemicalFormula: m.chemicalFormula ?? "",
    commonNames: commonNames.length > 0 ? commonNames : [m.name ?? ""],
    primaryIndex: 0,
    SMILES: m.SMILES ?? "",
    InChI: m.InChI ?? "",
    casNumber: m.casNumber ?? "",
    pubChemCid: m.pubChemCid ?? "",
    tagIds: (m.moleculeTags ?? []).map((t) => t.id),
  };
}

function _editFormHasChanges(
  form: HeaderEditForm | null,
  m: MoleculeView,
): boolean {
  if (!form) return false;
  const initial = initEditForm(m);
  if (
    form.iupacName !== initial.iupacName ||
    form.chemicalFormula !== initial.chemicalFormula ||
    form.SMILES !== initial.SMILES ||
    form.InChI !== initial.InChI ||
    form.casNumber !== initial.casNumber ||
    form.pubChemCid !== initial.pubChemCid ||
    form.primaryIndex !== initial.primaryIndex ||
    form.tagIds.length !== initial.tagIds.length ||
    form.tagIds.some((id, i) => id !== initial.tagIds[i])
  )
    return true;
  if (
    form.commonNames.length !== initial.commonNames.length ||
    form.commonNames.some((s, i) => s !== initial.commonNames[i])
  )
    return true;
  return false;
}

function HeaderCardIdentifierRow({
  props,
  isEditing,
  editForm,
  setEditForm,
  isPending,
  showCopyButtons = true,
}: {
  props: MoleculeCardProps;
  isEditing: boolean;
  editForm: HeaderEditForm | null;
  setEditForm: React.Dispatch<React.SetStateAction<HeaderEditForm | null>>;
  isPending: boolean;
  showCopyButtons?: boolean;
}) {
  const m = props.molecule;
  const [debouncedCas, setDebouncedCas] = useState("");
  const [debouncedPubChem, setDebouncedPubChem] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedCas(editForm?.casNumber?.trim() ?? "");
    }, 400);
    return () => clearTimeout(t);
  }, [editForm?.casNumber]);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedPubChem(editForm?.pubChemCid?.trim() ?? "");
    }, 400);
    return () => clearTimeout(t);
  }, [editForm?.pubChemCid]);
  const casFormatValid = !!debouncedCas && validateCas(debouncedCas);
  const pubChemFormatValid =
    !!debouncedPubChem && validatePubChemCid(debouncedPubChem);
  const { data: casValidation } = trpc.external.validateCasNumber.useQuery(
    { casNumber: debouncedCas },
    { enabled: isEditing && casFormatValid },
  );
  const { data: pubChemValidation } = trpc.external.validatePubChemCid.useQuery(
    { cid: debouncedPubChem },
    { enabled: isEditing && pubChemFormatValid },
  );
  const casApiValid = casValidation?.valid === true;
  const pubChemApiValid = pubChemValidation?.valid === true;
  const inVal = (field: "SMILES" | "InChI" | "casNumber" | "pubChemCid") =>
    isEditing && editForm
      ? editForm[field]
      : field === "SMILES"
        ? (m.SMILES ?? "")
        : field === "InChI"
          ? (m.InChI ?? "")
          : field === "casNumber"
            ? (m.casNumber ?? "")
            : (m.pubChemCid ?? "");
  const setVal = (
    field: "SMILES" | "InChI" | "casNumber" | "pubChemCid",
    value: string,
  ) => {
    setEditForm((f) => (f ? { ...f, [field]: value } : f));
  };
  const casInvalid =
    isEditing &&
    editForm &&
    editForm.casNumber.trim() !== "" &&
    !validateCas(editForm.casNumber);
  const pubChemInvalid =
    isEditing &&
    editForm &&
    editForm.pubChemCid.trim() !== "" &&
    !validatePubChemCid(editForm.pubChemCid);
  const inputBaseClass = `${EDIT_FIELD_CLASS} font-mono text-xs`;
  return (
    <div
      className={`flex flex-wrap items-center ${isEditing ? "gap-x-3 gap-y-2" : "gap-x-4 gap-y-3"}`}
      role="group"
    >
      <div
        className={`flex max-w-[200px] min-w-0 items-center ${showCopyButtons ? "gap-2" : "gap-1.5"} ${isEditing ? "mr-3 pr-1" : ""}`}
      >
        <Image
          src={CAS_FAVICON_URL}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 object-contain"
          unoptimized
        />
        <span className="text-text-tertiary shrink-0 text-xs font-medium">
          CAS
        </span>
        {isEditing && editForm ? (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={inVal("casNumber")}
                onChange={(e) => setVal("casNumber", e.target.value)}
                disabled={isPending}
                className={`max-w-[140px] min-w-0 ${inputBaseClass} ${casInvalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : casApiValid ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20" : ""}`}
                aria-label="CAS number"
                aria-invalid={!!casInvalid}
              />
              {casApiValid ? (
                <Check
                  className="h-4 w-4 shrink-0 text-emerald-500"
                  aria-label="CAS number found in registry"
                />
              ) : null}
            </div>
            {casInvalid ? (
              <span className="text-xs text-red-500 dark:text-red-400">
                Invalid CAS format
              </span>
            ) : null}
          </div>
        ) : props.casUrl ? (
          <Link
            href={props.casUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-accent min-w-0 truncate font-mono text-xs"
            title={m.casNumber ?? ""}
          >
            {m.casNumber ?? "—"}
          </Link>
        ) : (
          <span
            className="text-text-secondary min-w-0 truncate font-mono text-xs"
            title={m.casNumber ?? ""}
          >
            {m.casNumber ?? "—"}
          </span>
        )}
        {showCopyButtons ? (
          <CopyButton
            text={inVal("casNumber") || "—"}
            label="CAS number"
            copiedLabel={props.copiedText}
            onCopy={props.handleCopy}
            size="inline"
          />
        ) : null}
      </div>
      <div
        className={`flex max-w-[200px] min-w-0 items-center ${showCopyButtons ? "gap-2" : "gap-1.5"}`}
      >
        <Image
          src={PUBCHEM_FAVICON_URL}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 object-contain"
          unoptimized
        />
        <span className="text-text-tertiary shrink-0 text-xs font-medium">
          PubChem
        </span>
        {isEditing && editForm ? (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={inVal("pubChemCid")}
                onChange={(e) => setVal("pubChemCid", e.target.value)}
                disabled={isPending}
                className={`max-w-[140px] min-w-0 ${inputBaseClass} ${pubChemInvalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : pubChemApiValid ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20" : ""}`}
                aria-label="PubChem CID"
                aria-invalid={!!pubChemInvalid}
              />
              {pubChemApiValid ? (
                <Check
                  className="h-4 w-4 shrink-0 text-emerald-500"
                  aria-label="PubChem compound found"
                />
              ) : null}
            </div>
            {pubChemInvalid ? (
              <span className="text-xs text-red-500 dark:text-red-400">
                Invalid PubChem CID
              </span>
            ) : null}
          </div>
        ) : props.pubChemUrl ? (
          <Link
            href={props.pubChemUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-accent min-w-0 truncate font-mono text-xs"
            title={m.pubChemCid ?? ""}
          >
            {m.pubChemCid ?? "—"}
          </Link>
        ) : (
          <span
            className="text-text-secondary min-w-0 truncate font-mono text-xs"
            title={m.pubChemCid ?? ""}
          >
            {m.pubChemCid ?? "—"}
          </span>
        )}
        {showCopyButtons ? (
          <CopyButton
            text={inVal("pubChemCid") || "—"}
            label="PubChem CID"
            copiedLabel={props.copiedText}
            onCopy={props.handleCopy}
            size="inline"
          />
        ) : null}
      </div>
      <div
        className={`flex max-w-[240px] min-w-0 items-center ${showCopyButtons ? "gap-2" : "gap-1.5"}`}
      >
        <span className="text-text-tertiary shrink-0 text-xs font-medium">
          InChI
        </span>
        {isEditing && editForm ? (
          <Input
            type="text"
            value={inVal("InChI")}
            onChange={(e) => setVal("InChI", e.target.value)}
            disabled={isPending}
            className={`max-w-[200px] min-w-0 ${inputBaseClass}`}
            aria-label="InChI"
          />
        ) : (
          <span
            className="text-text-secondary min-w-0 truncate font-mono text-xs"
            title={m.InChI ?? ""}
          >
            {m.InChI ? m.InChI : "—"}
          </span>
        )}
        {showCopyButtons ? (
          <CopyButton
            text={inVal("InChI") || "—"}
            label="InChI"
            copiedLabel={props.copiedText}
            onCopy={props.handleCopy}
            size="inline"
          />
        ) : null}
      </div>
      <div
        className={`flex max-w-[240px] min-w-0 items-center ${showCopyButtons ? "gap-2" : "gap-1.5"}`}
      >
        <span className="text-text-tertiary shrink-0 text-xs font-medium">
          SMILES
        </span>
        {isEditing && editForm ? (
          <Input
            type="text"
            value={inVal("SMILES")}
            onChange={(e) => setVal("SMILES", e.target.value)}
            disabled={isPending}
            className={`max-w-[200px] min-w-0 ${inputBaseClass}`}
            aria-label="SMILES"
          />
        ) : (
          <span
            className="text-text-secondary min-w-0 truncate font-mono text-xs"
            title={m.SMILES ?? ""}
          >
            {m.SMILES ? m.SMILES : "—"}
          </span>
        )}
        {showCopyButtons ? (
          <CopyButton
            text={inVal("SMILES") || "—"}
            label="SMILES"
            copiedLabel={props.copiedText}
            onCopy={props.handleCopy}
            size="inline"
          />
        ) : null}
      </div>
    </div>
  );
}

function SynonymsEditBlock({
  commonNames,
  primaryIndex,
  onCommonNamesChange,
  onPrimaryIndexChange,
  onSynonymAdded,
}: {
  commonNames: string[];
  primaryIndex: number;
  onCommonNamesChange: (names: string[]) => void;
  onPrimaryIndexChange: (index: number) => void;
  onSynonymAdded?: (synonym: string) => void;
}) {
  const [newSynonym, setNewSynonym] = useState("");
  const addSynonym = () => {
    const trimmed = newSynonym.trim();
    if (trimmed && !commonNames.includes(trimmed)) {
      onCommonNamesChange([...commonNames, trimmed]);
      onSynonymAdded?.(trimmed);
      setNewSynonym("");
    }
  };
  const removeAt = (i: number) => {
    const next = commonNames.filter((_, j) => j !== i);
    onCommonNamesChange(next);
    if (primaryIndex >= next.length && next.length > 0) {
      onPrimaryIndexChange(next.length - 1);
    } else if (primaryIndex > i) {
      onPrimaryIndexChange(primaryIndex - 1);
    } else if (primaryIndex === i && next.length > 0) {
      onPrimaryIndexChange(0);
    }
  };
  return (
    <div className="space-y-1.5">
      <span className="text-text-secondary text-sm font-medium">
        Synonyms (first is primary)
      </span>
      <ul
        className={`${EDIT_FIELD_CLASS} flex max-h-[180px] min-h-[44px] flex-col gap-1 overflow-y-auto p-2`}
      >
        {commonNames.length === 0 ? (
          <li className="text-text-tertiary py-2 text-center text-sm">
            No synonyms. Add one below.
          </li>
        ) : (
          commonNames.map((syn, i) => (
            <li
              key={`${i}-${syn}`}
              className="odd:bg-surface-2/50 dark:odd:bg-surface-3/30 flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <button
                type="button"
                onClick={() => onPrimaryIndexChange(i)}
                aria-label={i === primaryIndex ? "Primary" : "Set as primary"}
                className="focus-visible:ring-accent shrink-0 rounded p-1 focus:outline-none focus-visible:ring-2"
              >
                {i === primaryIndex ? (
                  <CheckCircle2
                    className="h-4 w-4 fill-emerald-500 text-emerald-500"
                    aria-hidden
                  />
                ) : (
                  <Circle className="text-text-tertiary h-4 w-4" aria-hidden />
                )}
              </button>
              <span className="text-text-secondary min-w-0 flex-1 truncate text-sm">
                {syn}
                {i === primaryIndex ? (
                  <span className="text-text-tertiary ml-1 text-xs">
                    (primary)
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${syn}`}
                className="focus-visible:ring-accent text-text-tertiary hover:bg-surface-3 hover:text-text-primary shrink-0 rounded p-1 focus:outline-none focus-visible:ring-2"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={newSynonym}
          onChange={(e) => setNewSynonym(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSynonym();
            }
          }}
          placeholder="Add synonym…"
          aria-label="New synonym"
          className={`min-w-0 flex-1 font-mono ${EDIT_FIELD_CLASS}`}
        />
        <Button
          size="sm"
          variant="secondary"
          onPress={addSynonym}
          isDisabled={!newSynonym.trim()}
          className="focus-visible:ring-accent shrink-0"
          aria-label="Add synonym"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

export const HeaderCard = memo(function HeaderCard({
  props,
}: {
  props: MoleculeCardProps;
}) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.molecules.update.useMutation({
    onSuccess: (_, variables) => {
      if (variables.moleculeId) {
        void utils.molecules.getById.invalidate({ id: variables.moleculeId });
      }
    },
    onError: () => {
      showToast("Failed to save molecule changes", "error", 0);
    },
  });
  const setTagsMutation = trpc.molecules.setTags.useMutation({
    onSuccess: (_, variables) => {
      if (variables?.moleculeId) {
        void utils.molecules.getById.invalidate({ id: variables.moleculeId });
      }
    },
    onError: () => {
      showToast("Failed to save tags", "error", 0);
    },
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<HeaderEditForm | null>(null);
  const [pendingSynonymLookup, setPendingSynonymLookup] = useState<
    string | null
  >(null);
  const processedLookupRef = useRef<string | null>(null);
  const shouldLookup =
    !!editForm &&
    !!pendingSynonymLookup &&
    (!editForm.casNumber?.trim() || !editForm.pubChemCid?.trim());
  const searchPubchem = trpc.external.searchPubchem.useQuery(
    { query: pendingSynonymLookup ?? "", type: "name" },
    { enabled: shouldLookup },
  );
  useEffect(() => {
    const data = searchPubchem.data?.data;
    if (
      !data ||
      !pendingSynonymLookup ||
      !editForm ||
      processedLookupRef.current === pendingSynonymLookup
    )
      return;
    processedLookupRef.current = pendingSynonymLookup;
    setPendingSynonymLookup(null);
    setEditForm((f) => {
      if (!f) return f;
      return {
        ...f,
        InChI: f.InChI?.trim() ? f.InChI : (data.inchi ?? "").trim() || f.InChI,
        SMILES: f.SMILES?.trim()
          ? f.SMILES
          : (data.smiles ?? "").trim() || f.SMILES,
        casNumber:
          f.casNumber?.trim() || (data.casNumber ?? "").trim() || f.casNumber,
        pubChemCid:
          f.pubChemCid?.trim() ||
          (data.pubChemCid ?? "").trim() ||
          f.pubChemCid,
        chemicalFormula: f.chemicalFormula?.trim()
          ? f.chemicalFormula
          : (data.chemicalFormula ?? "").trim() || f.chemicalFormula,
      };
    });
  }, [searchPubchem.data, pendingSynonymLookup, editForm]);
  const handleSynonymAdded = (synonym: string) => {
    if (
      !editForm ||
      (editForm.casNumber?.trim() && editForm.pubChemCid?.trim())
    )
      return;
    setPendingSynonymLookup(synonym);
  };
  const fromContributors =
    (props.molecule.contributors?.length ?? 0) > 0
      ? props.molecule.contributors!.map((c) => c.user)
      : [];
  const avatarUsers: UserWithOrcid[] =
    fromContributors.length > 0
      ? fromContributors
      : props.molecule.createdBy
        ? [props.molecule.createdBy]
        : [];
  const previewGradient = getPreviewGradient(props.molecule);
  const hasImage = Boolean(props.molecule.imageUrl?.trim());
  const experimentCount = props.molecule.experimentCount ?? 0;
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const handleEnterEdit = () => {
    setEditForm(initEditForm(props.molecule));
    setIsEditMode(true);
  };

  const handleDone = () => {
    if (!editForm) return;
    const m = props.molecule;
    const orderedCommonNames =
      editForm.commonNames.length > 0
        ? [
            editForm.commonNames[editForm.primaryIndex] ??
              editForm.commonNames[0],
            ...editForm.commonNames.filter(
              (_, i) => i !== editForm.primaryIndex,
            ),
          ].filter((s): s is string => typeof s === "string" && s.length > 0)
        : [];
    const updatePayload = {
      moleculeId: m.id,
      iupacName: editForm.iupacName.trim() || undefined,
      chemicalFormula: editForm.chemicalFormula.trim() || undefined,
      commonNames:
        orderedCommonNames.length > 0 ? orderedCommonNames : undefined,
      SMILES: editForm.SMILES.trim() || undefined,
      InChI: editForm.InChI.trim() || undefined,
      casNumber: editForm.casNumber.trim() || null,
      pubChemCid: editForm.pubChemCid.trim() || null,
    };
    const tagPayload = { moleculeId: m.id, tagIds: editForm.tagIds };
    setIsEditMode(false);
    setEditForm(null);
    setPendingSynonymLookup(null);
    processedLookupRef.current = null;
    updateMutation.mutate(updatePayload);
    setTagsMutation.mutate(tagPayload);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm(null);
    setPendingSynonymLookup(null);
    processedLookupRef.current = null;
  };

  const showLinkOrcid = props.isSignedIn && !props.canEdit;

  return (
    <>
      <Card className="group border-border-default hover:border-border-strong dark:border-border-default dark:hover:border-border-strong flex w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md sm:flex-row dark:bg-zinc-800">
        <div
          className="group/image relative flex h-44 w-full shrink-0 overflow-hidden rounded-lg bg-white sm:h-auto sm:min-h-[220px] sm:w-[42%] dark:bg-black"
          aria-hidden
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setImageModalOpen(true);
            }}
            className="flex h-full w-full cursor-pointer items-center justify-center p-3 sm:p-4"
            aria-label="View molecule structure"
          >
            {hasImage ? (
              <div className="pointer-events-none flex h-full w-full items-center justify-center">
                <MoleculeImageSVG
                  imageUrl={props.molecule.imageUrl ?? ""}
                  name={props.primaryName}
                  className="h-full w-full motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:group-hover/image:scale-105 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
                />
              </div>
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-linear-to-br ${previewGradient}`}
              >
                <Atom
                  className="h-16 w-16 text-white/80 drop-shadow-lg motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:group-hover/image:scale-110 motion-safe:group-hover/image:opacity-100"
                  strokeWidth={1}
                  aria-hidden
                />
              </div>
            )}
          </button>
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-center gap-1 p-2 sm:p-3"
            onClick={(e) => e.stopPropagation()}
            role="group"
            aria-label="Chemical formula"
          >
            <span
              className="shrink-0 rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-sm text-slate-800 tabular-nums dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              title="Chemical formula"
            >
              {props.molecule.chemicalFormula}
            </span>
            {!isEditMode ? (
              <CopyButton
                text={props.molecule.chemicalFormula ?? ""}
                label="Chemical formula"
                copiedLabel={props.copiedText}
                onCopy={props.handleCopy}
                size="inline"
                className="shrink-0 rounded-md bg-slate-100/90 dark:bg-slate-800/90"
              />
            ) : null}
          </div>
          <div
            className="absolute inset-x-0 bottom-0 flex justify-end bg-white/60 px-3 py-3 text-slate-900 backdrop-blur-md dark:bg-black/60 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
            aria-hidden
          >
            <ContributorsOrEmpty users={avatarUsers} overlay />
          </div>
        </div>
        <MoleculeImageModal
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          hasImage={hasImage}
          imageUrl={props.molecule.imageUrl ?? ""}
          primaryName={props.primaryName}
          chemicalFormula={props.molecule.chemicalFormula}
          previewGradient={previewGradient}
        />
        <Card.Content className="flex min-w-0 flex-1 flex-col gap-3 p-5">
          <div
            className={`min-w-0 flex-1 space-y-3 ${isEditMode ? "min-h-[260px]" : ""}`}
          >
            {isEditMode && editForm ? (
              <>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="header-iupac"
                    className="text-text-secondary text-sm font-medium"
                  >
                    IUPAC name
                  </label>
                  <Input
                    id="header-iupac"
                    type="text"
                    value={editForm.iupacName}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, iupacName: e.target.value } : f,
                      )
                    }
                    className={`w-full min-w-0 font-mono ${EDIT_FIELD_CLASS}`}
                    aria-label="IUPAC name"
                  />
                </div>
                <SynonymsEditBlock
                  commonNames={editForm.commonNames}
                  primaryIndex={editForm.primaryIndex}
                  onCommonNamesChange={(commonNames) =>
                    setEditForm((f) => (f ? { ...f, commonNames } : f))
                  }
                  onPrimaryIndexChange={(primaryIndex) =>
                    setEditForm((f) => (f ? { ...f, primaryIndex } : f))
                  }
                  onSynonymAdded={handleSynonymAdded}
                />
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="header-formula"
                    className="text-text-secondary text-sm font-medium"
                  >
                    Formula
                  </label>
                  <Input
                    id="header-formula"
                    type="text"
                    value={editForm.chemicalFormula}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, chemicalFormula: e.target.value } : f,
                      )
                    }
                    className={`max-w-[200px] min-w-0 font-mono ${EDIT_FIELD_CLASS}`}
                    aria-label="Chemical formula"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-text-primary text-xl leading-tight font-bold sm:text-2xl">
                    {props.primaryName}
                  </h1>
                  <CopyButton
                    text={props.primaryName}
                    label="Primary name"
                    copiedLabel={props.copiedText}
                    onCopy={props.handleCopy}
                    size="inline"
                  />
                </div>
                {props.orderedSynonyms.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <SynonymChipsWithPopup
                      synonyms={props.orderedSynonyms}
                      maxSynonyms={5}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="min-w-0 border-t border-zinc-200 pt-3 dark:border-zinc-600">
            <HeaderCardIdentifierRow
              props={props}
              isEditing={isEditMode}
              editForm={editForm}
              setEditForm={setEditForm}
              isPending={updateMutation.isPending}
              showCopyButtons={!isEditMode}
            />
          </div>
          {!isEditMode && props.molecule.iupacName ? (
            <div className="flex items-start gap-2">
              <ScrollShadow
                className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
                hideScrollBar
              >
                <p className="text-text-tertiary text-sm leading-relaxed wrap-break-word">
                  {props.molecule.iupacName}
                </p>
              </ScrollShadow>
              <CopyButton
                text={props.molecule.iupacName}
                label="IUPAC name"
                copiedLabel={props.copiedText}
                onCopy={props.handleCopy}
                size="inline"
              />
            </div>
          ) : null}
          <div className="min-w-0 border-t border-zinc-200 pt-3 dark:border-zinc-600">
            {isEditMode && editForm ? (
              <CategoryTagGroupEditable
                tagIds={editForm.tagIds}
                onTagIdsChange={(tagIds) =>
                  setEditForm((f) => (f ? { ...f, tagIds } : f))
                }
                label="Tags"
                className="min-w-0"
                inlineLayout
              />
            ) : (props.molecule.moleculeTags?.length ?? 0) > 0 ? (
              <div>
                <span className="text-text-secondary mb-2 block text-sm font-medium">
                  Tags
                </span>
                <MoleculeTags molecule={props.molecule} />
              </div>
            ) : null}
          </div>
          <footer
            className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-4">
              <span
                className="flex items-center gap-1.5 text-sm text-sky-500 tabular-nums"
                title="Views"
              >
                <Eye className="h-4 w-4 shrink-0" aria-hidden />
                {props.molecule.viewCount ?? 0}
              </span>
              <div
                className={`flex items-center gap-1.5 text-sm tabular-nums ${
                  props.realtimeUserHasUpvoted
                    ? "font-medium text-pink-500"
                    : "text-text-tertiary"
                }`}
              >
                {props.molecule.id && props.isSignedIn ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    isIconOnly
                    aria-label={
                      props.realtimeUserHasUpvoted ? "Unfavorite" : "Favorite"
                    }
                    isDisabled={props.favoriteMutation.isPending}
                    onPress={props.handleFavorite}
                    className={`focus-visible:ring-accent -m-1 ${
                      props.realtimeUserHasUpvoted
                        ? "text-pink-500"
                        : "text-text-tertiary"
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 shrink-0 ${
                        props.realtimeUserHasUpvoted
                          ? "fill-pink-500 text-pink-500"
                          : ""
                      }`}
                      aria-hidden
                    />
                  </Button>
                ) : (
                  <Heart
                    className={`h-4 w-4 shrink-0 ${
                      props.realtimeUserHasUpvoted
                        ? "fill-pink-500 text-pink-500"
                        : ""
                    }`}
                    aria-hidden
                  />
                )}
                {props.realtimeUpvoteCount}
              </div>
              <span
                className="flex items-center gap-1.5 text-sm text-amber-500 tabular-nums"
                title="Datasets"
              >
                <Database className="h-4 w-4 shrink-0" aria-hidden />
                {experimentCount >= 1000
                  ? `${(experimentCount / 1000).toFixed(1)}k`
                  : experimentCount}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showLinkOrcid ? (
                <Link
                  href="/api/auth/link-account?provider=orcid"
                  className="text-accent dark:text-accent-light text-sm font-medium hover:underline"
                >
                  Link ORCID to edit this molecule
                </Link>
              ) : null}
              {props.canEdit && !isEditMode ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={handleEnterEdit}
                  className="focus-visible:ring-accent inline-flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                  Edit
                </Button>
              ) : null}
              {isEditMode ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={handleCancelEdit}
                    className="focus-visible:ring-accent inline-flex items-center gap-2"
                  >
                    <X className="h-4 w-4 shrink-0 align-middle" aria-hidden />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={handleDone}
                    isDisabled={
                      updateMutation.isPending || setTagsMutation.isPending
                    }
                    className="focus-visible:ring-accent inline-flex items-center gap-2"
                  >
                    <Check
                      className="h-4 w-4 shrink-0 align-middle"
                      aria-hidden
                    />
                    <span>Submit</span>
                  </Button>
                </>
              ) : null}
            </div>
          </footer>
        </Card.Content>
      </Card>
    </>
  );
});

export const MoleculeCard = memo(function MoleculeCard({
  molecule,
  onEdit,
  variant = "full",
  enableRealtime = true,
  canEdit: canEditProp,
  isSignedIn: isSignedInProp,
}: {
  molecule: MoleculeView;
  onEdit?: () => void;
  variant?: "full" | "compact" | "header";
  enableRealtime?: boolean;
  canEdit?: boolean;
  isSignedIn?: boolean;
}) {
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = isSignedInProp ?? !!session?.user;
  const canEdit = canEditProp ?? isSignedIn;
  const utils = trpc.useUtils();
  const [optimisticFavoriteDelta, setOptimisticFavoriteDelta] = useState(0);
  const [optimisticUserFavorited, setOptimisticUserFavorited] = useState<
    boolean | null
  >(null);
  const {
    upvoteCount: realtimeUpvoteCount,
    userHasUpvoted: realtimeUserHasUpvoted,
  } = useRealtimeUpvotes({
    moleculeId: enableRealtime ? molecule.id : undefined,
    initialUpvoteCount: molecule.favoriteCount ?? 0,
    initialUserHasUpvoted: molecule.userHasFavorited ?? false,
    userId: user?.id,
    enabled: enableRealtime,
  });
  const baseUpvoteCount = enableRealtime
    ? realtimeUpvoteCount
    : (molecule.favoriteCount ?? 0);
  const baseUserHasUpvoted = enableRealtime
    ? realtimeUserHasUpvoted
    : (molecule.userHasFavorited ?? false);
  const favoriteMutation = trpc.molecules.toggleFavorite.useMutation({
    onMutate: () => {
      setOptimisticUserFavorited(baseUserHasUpvoted ? false : true);
      setOptimisticFavoriteDelta(baseUserHasUpvoted ? -1 : 1);
    },
    onSuccess: () => {
      if (molecule.id) {
        void utils.molecules.getById.invalidate({ id: molecule.id });
      }
    },
    onSettled: () => {
      setOptimisticFavoriteDelta(0);
      setOptimisticUserFavorited(null);
    },
  });
  const displayUpvoteCount = baseUpvoteCount + optimisticFavoriteDelta;
  const displayUserHasUpvoted = optimisticUserFavorited ?? baseUserHasUpvoted;
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleFavorite = () => {
    if (!isSignedIn || !molecule.id) return;
    void favoriteMutation.mutateAsync({ moleculeId: molecule.id });
  };
  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(() => {
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
      });
    }
  };
  const noop = () => {
    return;
  };
  const context: MoleculeCardContext = {
    onEdit: onEdit ?? noop,
    isSignedIn,
    canEdit,
    handleFavorite,
    favoriteMutation,
    realtimeUserHasUpvoted: displayUserHasUpvoted,
    realtimeUpvoteCount: displayUpvoteCount,
    copiedText,
    handleCopy,
  };
  const cardProps = resolveMolecule(molecule, context);
  if (variant === "compact") return <CompactCard props={cardProps} />;
  if (variant === "header") return <HeaderCard props={cardProps} />;
  return <FullCard props={cardProps} />;
});

function shortestSynonymsFromOrdered(
  orderedSynonyms: string[],
  primaryName: string,
): string[] {
  if (orderedSynonyms.length === 0) return [];
  const sorted = [...orderedSynonyms].sort((a, b) => a.length - b.length);
  const filtered =
    sorted.length > 1 && sorted.includes(primaryName)
      ? sorted.filter((s) => s !== primaryName)
      : sorted;
  return filtered.length > 0 ? filtered.slice(0, 3) : sorted.slice(0, 3);
}

export function resolveMolecule(
  molecule: MoleculeView,
  context: MoleculeCardContext,
): MoleculeCardProps {
  const orderedSynonyms = getCommonNames(molecule);
  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const shortestSynonyms = shortestSynonymsFromOrdered(
    orderedSynonyms,
    primaryName,
  );
  const pubChemUrlResolved = molecule.pubChemCid
    ? pubChemUrl(molecule.pubChemCid)
    : null;
  const casUrlResolved = molecule.casNumber ? casUrl(molecule.casNumber) : null;
  return {
    molecule,
    primaryName,
    orderedSynonyms,
    shortestSynonyms,
    pubChemUrl: pubChemUrlResolved,
    casUrl: casUrlResolved,
    ...context,
  };
}

export type DisplayMolecule = MoleculeView;

export const MoleculeDisplay = MoleculeCard;

export function MoleculeDisplayCompact({
  molecule,
  enableRealtime = true,
}: {
  molecule: MoleculeView;
  enableRealtime?: boolean;
}) {
  return (
    <MoleculeCard
      molecule={molecule}
      variant="compact"
      enableRealtime={enableRealtime}
    />
  );
}
