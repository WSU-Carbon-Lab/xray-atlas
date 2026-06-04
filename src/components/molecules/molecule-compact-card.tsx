"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { Atom, Database, Eye, Heart } from "lucide-react";
import { cn } from "@heroui/styles";
import type { UserWithOrcid } from "~/components/ui/avatar";
import { ContributorAvatarGroup } from "~/components/attribution/contributor-avatar-group";
import {
  CompactCardMetricsColumn,
  CompactCardMetricStat,
  formatCompactMetricCount,
} from "~/components/browse/compact-card-metrics";
import { compactOverflowCountChipClassName } from "~/components/ui/compact-overflow-count-chip";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import { moleculeContributorAvatarUsers } from "~/lib/contributor-avatar-display";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import { moleculeOverflowSynonyms } from "~/lib/molecule-synonym-overflow";
import type { MoleculeView } from "~/types/molecule";
import { getTagChipClass, getTagInlineStyle } from "~/lib/tag-colors";
import { MoleculeCardActions } from "./molecule-card-actions";
import type { MoleculeCardProps } from "./molecule-card-types";
import { COMPACT_MOLECULE_TAG_VISIBLE } from "./molecule-display-constants";
import { MoleculeCopyButton } from "./molecule-copy-button";
import { MoleculeImageModal } from "./molecule-image-modal";
import { getPreviewGradient } from "./category-tags";
import { MoleculeImageSVG } from "./molecule-image-svg";
import { SynonymChipsWithPopup } from "./synonyms-list";

type MoleculeTagLike = NonNullable<MoleculeView["moleculeTags"]>[number];

function CompactMoleculeTagChip({
  tag,
  wide = false,
}: {
  tag: MoleculeTagLike;
  wide?: boolean;
}) {
  const chipClass = getTagChipClass(tag);
  const inlineStyle = getTagInlineStyle(tag);
  return (
    <span
      className={cn(
        "inline-flex h-4.5 shrink-0 items-center truncate rounded-full border border-black/10 px-1.5 font-semibold uppercase tracking-wide dark:border-white/15",
        wide ? "max-w-[11rem]" : "max-w-[9rem]",
        "text-[9px] leading-none sm:text-[10px]",
        chipClass,
      )}
      style={inlineStyle}
      title={tag.name}
    >
      {tag.name}
    </span>
  );
}

function CompactMoleculeCopyRow({
  text,
  displayText,
  label,
  copiedLabel,
  onCopy,
}: {
  text: string;
  displayText?: string;
  label: string;
  copiedLabel: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  const shown = displayText ?? text;
  const copyIconVisibilityClass =
    "pointer-events-none opacity-0 motion-safe:transition-opacity group-hover/copyline:pointer-events-auto group-hover/copyline:opacity-100 group-focus-within/copyline:pointer-events-auto group-focus-within/copyline:opacity-100";
  return (
    <div
      role="group"
      aria-label={`Copy ${label}`}
      className="group/copyline relative inline-flex w-fit max-w-full cursor-pointer items-center rounded-md px-1 py-0.5 -mx-1 hover:bg-muted/40 focus-within:bg-muted/40 motion-safe:transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onCopy(text, label);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onCopy(text, label);
        }
      }}
      tabIndex={0}
    >
      <span
        className="text-text-tertiary min-w-0 truncate pr-6 font-mono text-[10px] leading-snug tabular-nums sm:text-[11px]"
        title={shown}
      >
        {shown}
      </span>
      <MoleculeCopyButton
        text={text}
        label={label}
        copiedLabel={copiedLabel}
        onCopy={onCopy}
        size="inline"
        className={`absolute top-1/2 right-0 -translate-y-1/2 ${copyIconVisibilityClass}`}
      />
    </div>
  );
}

function CompactMoleculeTagRow({
  tags,
  variant = "rail",
}: {
  tags: MoleculeView["moleculeTags"];
  variant?: "rail" | "stacked";
}) {
  const list = tags ?? [];
  if (list.length === 0) return null;
  const visible = list.slice(0, COMPACT_MOLECULE_TAG_VISIBLE);
  const overflow = list.slice(COMPACT_MOLECULE_TAG_VISIBLE);
  const wideChips = variant === "rail";
  return (
    <div
      className={cn(
        "min-w-0 text-left leading-none",
        variant === "stacked"
          ? "flex w-full flex-wrap items-center gap-x-1.5 gap-y-1"
          : "inline-flex h-5 max-w-full flex-1 flex-nowrap items-center justify-start gap-x-1.5 overflow-hidden",
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {visible.map((tag) => (
        <CompactMoleculeTagChip key={tag.id} tag={tag} wide={wideChips} />
      ))}
      {overflow.length > 0 ? (
        <PopoverMenu
          align="start"
          contentClassName="max-w-xs"
          renderTrigger={({ triggerProps, isOpen }) => (
            <button
              type="button"
              {...triggerProps}
              className={compactOverflowCountChipClassName(isOpen)}
              aria-label={`${overflow.length} more category tags`}
            >
              +{overflow.length}
            </button>
          )}
          renderContent={({ contentProps, contentPositionClassName }) => (
            <PopoverMenuContent
              {...contentProps}
              className={cn(contentPositionClassName, "max-w-xs p-2")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap gap-1.5">
                {overflow.map((tag) => (
                  <CompactMoleculeTagChip key={tag.id} tag={tag} wide />
                ))}
              </div>
            </PopoverMenuContent>
          )}
        />
      ) : null}
    </div>
  );
}

export const CompactCard = memo(function CompactCard({
  props,
}: {
  props: MoleculeCardProps;
}) {
  const avatarUsers: UserWithOrcid[] = moleculeContributorAvatarUsers(
    props.molecule,
  );
  const previewGradient = getPreviewGradient(props.molecule);
  const hasImage = Boolean(props.molecule.imageUrl?.trim());
  const viewCount = props.molecule.viewCount ?? 0;
  const experimentCount = props.molecule.experimentCount ?? 0;
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const compactTags = props.molecule.moleculeTags ?? [];
  const hasCompactTags = compactTags.length > 0;

  return (
    <>
      <div className="border-border-default hover:border-border-strong dark:border-border-default hover:border-accent/30 @container/moleculecard w-full overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md dark:bg-zinc-800">
        <div className="group flex w-full flex-col gap-2 p-3 @md/moleculecard:flex-row @md/moleculecard:items-center @md/moleculecard:gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2 @md/moleculecard:min-w-0 @md/moleculecard:flex-row @md/moleculecard:items-center @md/moleculecard:gap-3">
          <div
            className={cn(
              "flex min-w-0 items-center gap-2 @md/moleculecard:gap-3",
              hasCompactTags
                ? "w-full @md/moleculecard:max-w-[min(42%,22rem)] @md/moleculecard:shrink-0"
                : "w-full @md/moleculecard:min-w-0 @md/moleculecard:flex-1",
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageModalOpen(true);
              }}
              className={`relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-105 @md/moleculecard:h-14 @md/moleculecard:w-14 dark:bg-black ${
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
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden py-0.5">
              <div className="flex min-w-0 items-center gap-x-2 gap-y-1 overflow-hidden">
                <Link
                  href={`/molecules/${canonicalMoleculeSlugFromView(props.molecule)}`}
                  className="text-text-primary motion-safe:group-hover:text-accent min-w-0 shrink self-center truncate text-sm leading-tight font-bold hover:underline motion-safe:transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {props.primaryName}
                </Link>
                {moleculeOverflowSynonyms(props.orderedSynonyms, {
                  primaryName: props.primaryName,
                }).length > 0 ? (
                  <span className="inline-flex shrink-0 items-center self-center leading-none">
                    <SynonymChipsWithPopup
                      synonyms={props.orderedSynonyms}
                      primaryName={props.primaryName}
                      collapseOnly
                    />
                  </span>
                ) : null}
              </div>
              {props.molecule.chemicalFormula ? (
                <CompactMoleculeCopyRow
                  text={props.molecule.chemicalFormula}
                  label="Chemical formula"
                  copiedLabel={props.copiedText}
                  onCopy={props.handleCopy}
                />
              ) : null}
              {props.molecule.casNumber ? (
                <CompactMoleculeCopyRow
                  text={props.molecule.casNumber}
                  displayText={`CAS ${props.molecule.casNumber}`}
                  label="CAS number"
                  copiedLabel={props.copiedText}
                  onCopy={props.handleCopy}
                />
              ) : null}
            </div>
          </div>
          {hasCompactTags ? (
            <div className="hidden min-w-0 flex-1 items-center @md/moleculecard:flex">
              <CompactMoleculeTagRow tags={compactTags} variant="rail" />
            </div>
          ) : null}
          </div>
          {hasCompactTags ? (
            <div className="w-full min-w-0 @md/moleculecard:hidden">
              <CompactMoleculeTagRow tags={compactTags} variant="stacked" />
            </div>
          ) : null}
          <div
            className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-3 border-t border-zinc-200 pt-3 @md/moleculecard:gap-x-3 @md/moleculecard:gap-y-0 @md/moleculecard:border-t-0 @md/moleculecard:border-l @md/moleculecard:pt-0 @md/moleculecard:pl-4 dark:border-zinc-600"
            onClick={(e) => e.stopPropagation()}
          >
            <MoleculeCardActions
              molecule={props.molecule}
              pubChemUrl={props.pubChemUrl}
              casUrl={props.casUrl}
              copiedText={props.copiedText}
              handleCopy={props.handleCopy}
              size="sm"
              actionsLayout="compact"
            />
            <ContributorAvatarGroup users={avatarUsers} size="sm" />
            <CompactCardMetricsColumn>
              <CompactCardMetricStat
                icon={<Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                value={formatCompactMetricCount(viewCount)}
                textClassName="text-[10px] text-sky-500"
              />
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
                  className={`flex items-center gap-1 text-xs leading-none font-medium tabular-nums transition-colors hover:opacity-80 disabled:opacity-50 ${
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
                  className={`flex items-center gap-1 text-xs leading-none font-medium tabular-nums ${
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
              <CompactCardMetricStat
                icon={<Database className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                value={formatCompactMetricCount(experimentCount)}
                textClassName="text-[10px] text-amber-500"
                title="Datasets"
              />
            </CompactCardMetricsColumn>
          </div>
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
    </>
  );
});
