"use client";

import React, { memo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Copy } from "lucide-react";
import { AvatarGroup, type UserWithOrcid } from "../ui/avatar";
import {
  Button,
  Card,
  TagGroup,
  Tag,
  Tooltip,
  ScrollShadow,
} from "@heroui/react";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { SynonymChipsWithPopup } from "./synonyms-list";
import { MoleculeImageSVG } from "./molecule-image-svg";
import { useRealtimeUpvotes } from "~/hooks/useRealtimeUpvotes";
import type { MoleculeView } from "~/types/molecule";
import { getTagChipClass, getTagInlineStyle } from "~/lib/tag-colors";
import { MoleculeTags, getPreviewGradient } from "./category-tags";
import { Atom, Database, Eye, Heart, User, X } from "lucide-react";

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
              className="max-h-[3.25em] min-h-0 overflow-y-auto"
              hideScrollBar
            >
              <p className="text-text-tertiary">{props.molecule.iupacName}</p>
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

export const HeaderCard = ({ props: _props }: { props: MoleculeCardProps }) => {
  return <div></div>;
};

export const MoleculeCard = memo(function MoleculeCard({
  molecule,
  onEdit,
  variant = "full",
  enableRealtime = true,
}: {
  molecule: MoleculeView;
  onEdit?: () => void;
  variant?: "full" | "compact";
  enableRealtime?: boolean;
}) {
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!session?.user;
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
    handleFavorite,
    favoriteMutation,
    realtimeUserHasUpvoted: displayUserHasUpvoted,
    realtimeUpvoteCount: displayUpvoteCount,
    copiedText,
    handleCopy,
  };
  const cardProps = resolveMolecule(molecule, context);
  return variant === "compact" ? (
    <CompactCard props={cardProps} />
  ) : (
    <FullCard props={cardProps} />
  );
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
