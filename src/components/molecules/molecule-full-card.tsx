"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { Atom, Copy, Database, Eye, Heart } from "lucide-react";
import { Button, Card, ScrollShadow, Tooltip } from "@heroui/react";
import type { UserWithOrcid } from "~/components/ui/avatar";
import { ContributorsOrEmpty } from "~/components/attribution/contributors-or-empty";
import { moleculeContributorAvatarUsers } from "~/lib/contributor-avatar-display";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import { moleculeOverflowSynonyms } from "~/lib/molecule-synonym-overflow";
import { MoleculeCardActions } from "./molecule-card-actions";
import type { MoleculeCardProps } from "./molecule-card-types";
import { MoleculeImageModal } from "./molecule-image-modal";
import { MoleculeRegistryFaviconLinks } from "./molecule-registry-links";
import { getPreviewGradient, MoleculeTags } from "./category-tags";
import { MoleculeImageSVG } from "./molecule-image-svg";
import { SynonymChipsWithPopup } from "./synonyms-list";

export const FullCard = memo(function FullCard({
  props,
}: {
  props: MoleculeCardProps;
}) {
  const avatarUsers: UserWithOrcid[] = moleculeContributorAvatarUsers(
    props.molecule,
  );
  const previewGradient = getPreviewGradient(props.molecule);
  const hasImage = Boolean(props.molecule.imageUrl?.trim());
  const experimentCount = props.molecule.experimentCount ?? 0;

  const [imageModalOpen, setImageModalOpen] = useState(false);

  return (
    <Card className="group border-border-default hover:border-border-strong hover:border-accent/30 dark:border-border-default dark:hover:border-border-strong flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md lg:flex-row dark:bg-zinc-800">
      <div
        className="group/image relative flex h-52 w-full shrink-0 overflow-hidden rounded-lg bg-white lg:h-auto lg:min-h-[260px] lg:w-[min(42%,320px)] lg:max-w-[360px] dark:bg-black"
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
          className="absolute inset-x-0 bottom-0 flex justify-end rounded-b-lg bg-white/90 px-2 py-2 text-slate-900 backdrop-blur-md dark:bg-black/60 dark:text-slate-100"
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
            href={`/molecules/${canonicalMoleculeSlugFromView(props.molecule)}`}
            className="text-text-primary hover:text-accent dark:hover:text-accent-light line-clamp-3 text-lg leading-tight font-bold wrap-break-word transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {props.primaryName}
          </Link>
        </div>
        {moleculeOverflowSynonyms(props.orderedSynonyms, {
          primaryName: props.primaryName,
        }).length > 0 ? (
          <div
            className="min-w-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <SynonymChipsWithPopup
              synonyms={props.orderedSynonyms}
              primaryName={props.primaryName}
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
        <div className="min-w-0 py-1" onClick={(e) => e.stopPropagation()}>
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

export const FullCardCarousel = memo(function FullCardCarousel({
  props,
}: {
  props: MoleculeCardProps;
}) {
  const avatarUsers: UserWithOrcid[] = moleculeContributorAvatarUsers(
    props.molecule,
  );
  const previewGradient = getPreviewGradient(props.molecule);
  const hasImage = Boolean(props.molecule.imageUrl?.trim());
  const experimentCount = props.molecule.experimentCount ?? 0;

  const [imageModalOpen, setImageModalOpen] = useState(false);

  return (
    <Card className="group border-border-default hover:border-border-strong hover:border-accent/30 dark:border-border-default dark:hover:border-border-strong @container flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md @lg:flex-row dark:bg-zinc-800">
      <div
        className="group/image relative flex h-52 w-full shrink-0 overflow-hidden rounded-lg bg-white @lg:h-auto @lg:min-h-[260px] @lg:w-[min(42%,320px)] @lg:max-w-[360px] dark:bg-black"
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
          className="absolute inset-x-0 bottom-0 flex justify-end rounded-b-lg bg-white/90 px-2 py-2 text-slate-900 backdrop-blur-md dark:bg-black/60 dark:text-slate-100"
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
        <div
          className="flex min-w-0 items-start gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/molecules/${canonicalMoleculeSlugFromView(props.molecule)}`}
            className="text-text-primary hover:text-accent dark:hover:text-accent-light min-w-0 flex-1 line-clamp-3 text-lg leading-tight font-bold wrap-break-word transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {props.primaryName}
          </Link>
          <MoleculeRegistryFaviconLinks
            casUrl={props.casUrl}
            pubChemUrl={props.pubChemUrl}
            className="pt-0.5 @lg:hidden"
          />
        </div>
        {moleculeOverflowSynonyms(props.orderedSynonyms, {
          primaryName: props.primaryName,
        }).length > 0 ? (
          <div
            className="min-w-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <SynonymChipsWithPopup
              synonyms={props.orderedSynonyms}
              primaryName={props.primaryName}
              maxSynonyms={3}
            />
          </div>
        ) : null}
        <div
          className="hidden min-h-0 min-w-0 shrink-0 items-center @lg:flex @lg:min-h-[2.5rem]"
          onClick={(e) => e.stopPropagation()}
        >
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
          ) : null}
        </div>
        {props.molecule.iupacName ? (
          <div
            className="hidden min-w-0 flex-1 text-xs leading-relaxed @lg:block"
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
        <div
          className="hidden min-w-0 py-1 @lg:block"
          onClick={(e) => e.stopPropagation()}
        >
          <MoleculeCardActions
            molecule={props.molecule}
            pubChemUrl={props.pubChemUrl}
            casUrl={props.casUrl}
            copiedText={props.copiedText}
            handleCopy={props.handleCopy}
            size="sm"
            actionsLayout="carousel"
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
