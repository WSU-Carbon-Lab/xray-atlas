"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Atom, Heart, TriangleRight } from "lucide-react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Chip, Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { trpc } from "~/trpc/client";
import {
  CompactCardMetricsColumn,
  CompactCardMetricStat,
  formatCompactMetricCount,
} from "~/components/browse/compact-card-metrics";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import { MoleculeImageModal } from "~/components/molecules/molecule-image-modal";
import { getPreviewGradient } from "~/components/molecules/category-tags";
import { ContributorsOrEmpty } from "~/components/attribution/contributors-or-empty";
import { nexafsContributorAvatarUsers } from "~/lib/contributor-avatar-display";
import type { NexafsContributorPerson } from "~/lib/nexafs-contributors";
import { useRealtimeExperimentFavorites } from "~/hooks/useRealtimeExperimentFavorites";
import {
  atlasDatasetCitationHref,
  NEXAFS_EXPERIMENT_SEARCH_PARAM,
  parseNexafsExperimentSearchParam,
  pathnameWithoutNexafsExperimentDeepLink,
} from "~/lib/nexafs-experiment-deep-link";
import { nexafsExperimentCardDomId } from "~/lib/scroll-nexafs-experiment-card";
import type { MoleculeView } from "~/types/molecule";
import { NexafsExperimentDatasetPanel } from "~/components/nexafs/nexafs-experiment-dataset-panel";
import { ExperimentAttributionEditSection } from "~/features/process-nexafs/ui/experiment-attribution-edit-section";
import { NexafsPublicationVerificationControl } from "~/components/nexafs/nexafs-publication-verification-control";
import { NexafsDatasetDoiCiteControl } from "~/components/nexafs/nexafs-dataset-doi-cite-control";
import { NexafsDatasetCitationHead } from "~/components/nexafs/nexafs-dataset-citation-head";
import { NexafsDatasetMetricsRail } from "~/components/nexafs/nexafs-dataset-metrics-rail";
import type { NexafsBrowseDatasetMetricsCardModel } from "~/lib/nexafs-dataset-metric-display-model";
import type {
  NexafsBrowseLinkedPublication,
  NexafsBrowseSourcePublication,
} from "~/types/nexafs-browse";
import {
  buildNexafsDatasetCitationTitle,
  buildDatasetBibTeXNote,
  resolveCitationCreatorDisplayName,
} from "~/lib/dataset-citation";
import { contributorCitationSortKey } from "~/lib/datacite-contributor-types";

function trpcKeyMatchesExperimentsProcedure(
  queryKey: readonly unknown[],
  procedure: "browseList" | "browseSearch",
): boolean {
  const head = queryKey[0];
  if (!Array.isArray(head) || head.length < 2) return false;
  return head[0] === "experiments" && head[1] === procedure;
}

function patchExperimentFavoriteInBrowsePayload(
  old: unknown,
  targetExperimentId: string,
  nextFavoriteCount: number,
  nextUserHasFavorited: boolean,
): unknown {
  if (old === undefined || typeof old !== "object") return old;
  const record = old as { groups?: unknown };
  if (!Array.isArray(record.groups)) return old;
  const rawGroups = record.groups as unknown[];
  let changed = false;
  const groups = rawGroups.map((g: unknown) => {
    if (!g || typeof g !== "object") return g;
    const row = g as { experimentId?: string };
    if (row.experimentId !== targetExperimentId) return g;
    changed = true;
    return {
      ...row,
      favoriteCount: nextFavoriteCount,
      userHasFavorited: nextUserHasFavorited,
    };
  });
  return changed ? { ...record, groups } : old;
}

function patchAllNexafsBrowseCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  experimentId: string,
  nextFavoriteCount: number,
  nextUserHasFavorited: boolean,
) {
  for (const procedure of ["browseList", "browseSearch"] as const) {
    queryClient.setQueriesData(
      {
        predicate: (q) =>
          trpcKeyMatchesExperimentsProcedure(q.queryKey, procedure),
      },
      (old) =>
        patchExperimentFavoriteInBrowsePayload(
          old,
          experimentId,
          nextFavoriteCount,
          nextUserHasFavorited,
        ),
    );
  }
}

function edgeChipClass(edgeLabel: string): string {
  const atom = edgeLabel.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  switch (atom) {
    case "C":
    case "CARBON":
      return "border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-500/35 dark:bg-cyan-500/12 dark:text-cyan-300";
    case "N":
    case "NITROGEN":
      return "border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-500/35 dark:bg-indigo-500/12 dark:text-indigo-300";
    case "O":
    case "OXYGEN":
      return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/12 dark:text-emerald-300";
    case "S":
    case "SULFUR":
    case "SULPHUR":
      return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-300";
    case "F":
      return "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-300";
    default:
      return "border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-500/35 dark:bg-zinc-500/12 dark:text-zinc-300";
  }
}

function hashIndex(input: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return mod <= 0 ? 0 : h % mod;
}

function instrumentChipClass(
  instrumentName: string,
  facilityName: string | null,
): string {
  const palettes = [
    "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-500/35 dark:bg-violet-500/12 dark:text-violet-300",
    "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/35 dark:bg-rose-500/12 dark:text-rose-300",
    "border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-500/35 dark:bg-cyan-500/12 dark:text-cyan-300",
    "border-teal-300 bg-teal-100 text-teal-900 dark:border-teal-500/35 dark:bg-teal-500/12 dark:text-teal-300",
    "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-500/35 dark:bg-blue-500/12 dark:text-blue-300",
    "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-500/35 dark:bg-fuchsia-500/12 dark:text-fuchsia-300",
  ] as const;
  const key = `${instrumentName}|${facilityName ?? ""}`;
  return palettes[hashIndex(key, palettes.length)] ?? palettes[0];
}

function experimentTypeChipClass(experimentTypeLabel: string | null): string {
  if (!experimentTypeLabel) {
    return "border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-500/35 dark:bg-zinc-500/12 dark:text-zinc-300";
  }
  const label = experimentTypeLabel.toLowerCase();
  if (label.includes("fluorescence")) {
    return "border-pink-300 bg-pink-100 text-pink-900 dark:border-pink-500/35 dark:bg-pink-500/12 dark:text-pink-300";
  }
  if (label.includes("partial electron")) {
    return "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-500/35 dark:bg-orange-500/12 dark:text-orange-300";
  }
  if (label.includes("total electron")) {
    return "border-green-300 bg-green-100 text-green-900 dark:border-green-500/35 dark:bg-green-500/12 dark:text-green-300";
  }
  if (label.includes("transmission")) {
    return "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-500/35 dark:bg-blue-500/12 dark:text-blue-300";
  }
  return "border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-500/35 dark:bg-zinc-500/12 dark:text-zinc-300";
}

export type NexafsExperimentCompactCardProps = {
  /** Molecule detail route listing all NEXAFS datasets for this compound. */
  moleculeHref: string;
  experimentId: string;
  moleculeId: string;
  displayName: string;
  iupacname: string;
  chemicalformula: string;
  imageurl: string | null;
  casNumber: string | null;
  pubChemCid: string | null;
  favoriteCount: number;
  userHasFavorited: boolean;
  edgeLabel: string;
  instrumentName: string;
  facilityName: string | null;
  experimentTypeLabel: string | null;
  experimentContributorUsers: NexafsContributorPerson[];
  polarizationCount: number;
  linkedPublications: NexafsBrowseLinkedPublication[];
  sourcePublications: NexafsBrowseSourcePublication[];
  ingestVerified: boolean;
  /** Opaque short id for `/d/{id}`; null until assigned. */
  atlasDatasetId?: string | null;
  datasetDoi: string | null;
  zenodoRecordUrl: string | null;
  zenodoDepositState: "pending" | "depositing" | "published" | "failed" | null;
  datasetMetrics: NexafsBrowseDatasetMetricsCardModel;
  /**
   * Core sample preparation fields for BibTeX citation notes.
   */
  citationSample?: {
    processMethod: string | null;
    substrate: string | null;
    patterningLayer: string | null;
    solvent: string | null;
    thicknessNm: number | null;
    molecularWeightGPerMol: number | null;
    vendorName: string | null;
  } | null;
  /**
   * UTC year used for APA / BibTeX citations (typically experiment `createdat`).
   */
  citationYear?: number;
  /**
   * When true, expands the spectrum panel on mount (e.g. deep-link match from the
   * parent list). The card also expands when `?nexafsExperiment=` matches
   * `experimentId`. The browse section scrolls that card into view after load,
   * and collapsing clears the query param from the address bar.
   */
  defaultExpanded?: boolean;
};

export function NexafsExperimentCompactCard({
  moleculeHref,
  experimentId,
  moleculeId,
  displayName,
  iupacname,
  chemicalformula,
  imageurl,
  casNumber,
  pubChemCid,
  favoriteCount,
  userHasFavorited,
  edgeLabel,
  instrumentName,
  facilityName,
  experimentTypeLabel,
  experimentContributorUsers,
  polarizationCount,
  linkedPublications,
  sourcePublications,
  ingestVerified,
  atlasDatasetId = null,
  datasetDoi,
  zenodoRecordUrl,
  zenodoDepositState,
  datasetMetrics,
  citationSample = null,
  citationYear,
  defaultExpanded = false,
}: NexafsExperimentCompactCardProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!user;
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [spectrumExpanded, setSpectrumExpanded] = useState(false);
  const [optimisticFavoriteDelta, setOptimisticFavoriteDelta] = useState(0);
  const [optimisticUserFavorited, setOptimisticUserFavorited] = useState<
    boolean | null
  >(null);

  useLayoutEffect(() => {
    const targetId = parseNexafsExperimentSearchParam(
      searchParams.get(NEXAFS_EXPERIMENT_SEARCH_PARAM),
    );
    const shouldExpand =
      defaultExpanded || (targetId !== null && targetId === experimentId);
    if (!shouldExpand) return;
    setSpectrumExpanded(true);
  }, [defaultExpanded, experimentId, searchParams]);

  const {
    favoriteCount: realtimeFavoriteCount,
    userHasFavorited: realtimeUserHasFavorited,
  } = useRealtimeExperimentFavorites({
    experimentId,
    initialFavoriteCount: favoriteCount,
    initialUserHasFavorited: userHasFavorited,
    userId: user?.id,
    enabled: true,
  });

  const favoriteMutation = trpc.experiments.toggleFavorite.useMutation({
    onMutate: () => {
      setOptimisticUserFavorited(realtimeUserHasFavorited ? false : true);
      setOptimisticFavoriteDelta(realtimeUserHasFavorited ? -1 : 1);
    },
    onSuccess: (data) => {
      patchAllNexafsBrowseCaches(
        queryClient,
        experimentId,
        data.favoriteCount,
        data.favorited,
      );
      setOptimisticFavoriteDelta(0);
      setOptimisticUserFavorited(null);
    },
    onError: () => {
      setOptimisticFavoriteDelta(0);
      setOptimisticUserFavorited(null);
    },
  });

  const displayUpvoteCount = realtimeFavoriteCount + optimisticFavoriteDelta;
  const displayUserHasUpvoted =
    optimisticUserFavorited ?? realtimeUserHasFavorited;

  const handleFavorite = useCallback(() => {
    if (!isSignedIn || !experimentId) return;
    void favoriteMutation.mutateAsync({ experimentId });
  }, [isSignedIn, experimentId, favoriteMutation]);

  const previewMolecule: MoleculeView = {
    id: moleculeId,
    name: displayName,
    iupacName: iupacname,
    chemicalFormula: chemicalformula,
    SMILES: "",
    InChI: "",
    pubChemCid,
    casNumber,
    favoriteCount,
    userHasFavorited: displayUserHasUpvoted,
  };

  const previewGradient = getPreviewGradient(previewMolecule);
  const hasImage = Boolean(imageurl?.trim());

  const clearNexafsExperimentDeepLink = useCallback(() => {
    const next = pathnameWithoutNexafsExperimentDeepLink(
      pathname,
      searchParams.toString(),
      experimentId,
    );
    if (next === null) return;
    router.replace(next, { scroll: false });
  }, [experimentId, pathname, router, searchParams]);

  const toggleSpectrumExpanded = useCallback(() => {
    setSpectrumExpanded((open) => {
      if (open) {
        queueMicrotask(() => {
          clearNexafsExperimentDeepLink();
        });
      }
      return !open;
    });
  }, [clearNexafsExperimentDeepLink]);

  const readOnlyContributorUsers = nexafsContributorAvatarUsers(
    experimentContributorUsers,
  );

  const readOnlyContributorAvatars = (
    <ContributorsOrEmpty
      users={readOnlyContributorUsers}
      size="sm"
      max={8}
      empty="hidden"
    />
  );

  const facilityLine = facilityName ?? "Facility unknown";
  const edgeClass = edgeChipClass(edgeLabel);
  const instrumentClass = instrumentChipClass(instrumentName, facilityName);
  const experimentTypeClass = experimentTypeChipClass(experimentTypeLabel);
  const instrumentFacilityLabel = `${instrumentName} | ${facilityLine}`;
  const citationCreators = [...experimentContributorUsers]
    .sort((a, b) => {
      const keyDelta =
        contributorCitationSortKey(a.roles) -
        contributorCitationSortKey(b.roles);
      if (keyDelta !== 0) return keyDelta;
      return (a.name ?? a.orcid).localeCompare(b.name ?? b.orcid);
    })
    .map((person) =>
      resolveCitationCreatorDisplayName({
        name: person.name,
        orcid: person.orcid,
      }),
    )
    .filter((name): name is string => name !== null);
  const citationYearResolved = citationYear ?? new Date().getUTCFullYear();
  const atlasCitationUrl = atlasDatasetId
    ? typeof window !== "undefined"
      ? `${window.location.origin}${atlasDatasetCitationHref(atlasDatasetId)}`
      : atlasDatasetCitationHref(atlasDatasetId)
    : null;
  const citationTitle = buildNexafsDatasetCitationTitle({
    moleculeDisplayName: displayName,
    edgeLabel,
    instrumentName,
    facilityName,
    experimentTypeLabel,
  });
  const citationNote = buildDatasetBibTeXNote({
    edgeLabel,
    instrumentName,
    facilityName,
    experimentTypeLabel,
    sample: citationSample,
    datasetDoi,
    atlasCitationUrl,
  });
  return (
    <div
      id={nexafsExperimentCardDomId(experimentId)}
      className="border-border-default dark:border-border-default @container/nexafscard flex w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm dark:bg-zinc-800"
    >
      <NexafsDatasetCitationHead
        active={spectrumExpanded}
        title={citationTitle}
        authors={citationCreators}
        year={citationYearResolved}
        datasetDoi={datasetDoi}
        atlasCitationUrl={atlasCitationUrl}
        description={citationNote}
      />
      <div
        aria-expanded={spectrumExpanded}
        onClick={toggleSpectrumExpanded}
        className={cn(
          "flex w-full cursor-pointer flex-col p-3 motion-safe:transition-colors motion-safe:duration-200 @md/nexafscard:flex-row @md/nexafscard:items-center @md/nexafscard:gap-4",
          spectrumExpanded
            ? "bg-zinc-100/80 dark:bg-zinc-700/40"
            : "hover:bg-zinc-100/60 dark:hover:bg-zinc-700/25",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 border-r border-zinc-200 pr-2 @md/nexafscard:gap-4 @md/nexafscard:pr-4 dark:border-zinc-600">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setImageModalOpen(true);
            }}
            className={`relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-105 @md/nexafscard:h-14 @md/nexafscard:w-14 dark:bg-black ${
              hasImage ? "" : `bg-linear-to-br ${previewGradient}`
            }`}
            aria-label="View molecule structure"
          >
            {hasImage ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-1">
                <MoleculeImageSVG
                  imageUrl={imageurl ?? ""}
                  name={displayName}
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
            {displayUserHasUpvoted ? (
              <span
                className="bg-accent absolute top-1 right-1 h-2.5 w-2.5 rounded-full border border-black/50 shadow-[0_0_4px_rgba(99,102,241,0.8)]"
                aria-hidden
              />
            ) : null}
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden py-0.5">
            <div className="flex min-w-0 items-center gap-x-2 gap-y-1 overflow-hidden">
              <span className="text-text-primary min-w-0 shrink truncate text-sm leading-tight font-bold">
                {displayName}
              </span>
              <span
                className="inline-flex shrink-0 items-center self-center"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <NexafsPublicationVerificationControl
                  ingestVerified={ingestVerified}
                  linkedPublications={linkedPublications}
                  sourcePublications={sourcePublications}
                  experimentId={experimentId}
                />
              </span>
            </div>
            <div className="inline-flex h-5 max-w-full min-w-0 flex-nowrap items-center justify-start gap-x-1.5 overflow-hidden text-left text-[10px] leading-none whitespace-nowrap sm:text-[11px]">
              <span
                className={`inline-flex h-4.5 shrink-0 items-center rounded-full border px-1.5 font-semibold ${edgeClass}`}
              >
                {edgeLabel}
              </span>
              <Tooltip delay={0}>
                <Tooltip.Trigger className="inline-flex max-w-[74%] min-w-0 shrink">
                  <span
                    className={`inline-flex h-4.5 max-w-full min-w-0 items-center truncate rounded-full border px-1.5 font-medium ${instrumentClass}`}
                    title={instrumentFacilityLabel}
                  >
                    <span className="truncate @3xl/nexafscard:hidden">
                      {instrumentName}
                    </span>
                    <span className="hidden min-w-0 truncate @3xl/nexafscard:inline">
                      {instrumentFacilityLabel}
                    </span>
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content placement="top">
                  {instrumentFacilityLabel}
                </Tooltip.Content>
              </Tooltip>
              {experimentTypeLabel ? (
                <span
                  className={`inline-flex h-4.5 shrink-0 items-center rounded-full border px-1.5 text-[9px] leading-none font-semibold sm:text-[10px] ${experimentTypeClass}`}
                  title={experimentTypeLabel}
                >
                  {experimentTypeLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="relative z-30 flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-3 border-t border-zinc-200 pt-3 @md/nexafscard:ml-auto @md/nexafscard:gap-x-3 @md/nexafscard:gap-y-0 @md/nexafscard:border-t-0 @md/nexafscard:pt-0 @md/nexafscard:pl-4 dark:border-zinc-600">
          <div className="flex shrink-0 items-center self-center border-r border-zinc-200 pr-2 @md/nexafscard:pr-3 dark:border-zinc-600">
            <NexafsDatasetDoiCiteControl
              experimentId={experimentId}
              atlasDatasetId={atlasDatasetId}
              datasetDoi={datasetDoi}
              zenodoRecordUrl={zenodoRecordUrl}
              zenodoDepositState={zenodoDepositState}
              moleculeDisplayName={displayName}
              edgeLabel={edgeLabel}
              instrumentName={instrumentName}
              facilityName={facilityName}
              experimentTypeLabel={experimentTypeLabel}
              sourcePublications={sourcePublications}
              citationCreators={citationCreators}
              citationYear={citationYearResolved}
              citationSample={citationSample}
            />
          </div>
          <Link
            href={moleculeHref}
            className={cn(
              "focus-visible:ring-accent group/to-molecule focus-visible:ring-offset-background inline-flex max-w-full shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Chip
              variant="soft"
              color="accent"
              size="md"
              className={cn(
                "max-w-full cursor-pointer shadow-sm backdrop-blur-sm",
                "motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-200",
                "group-hover/to-molecule:border-accent/45 group-hover/to-molecule:bg-accent/12 group-hover/to-molecule:shadow-md",
                "dark:border-accent/55 dark:bg-accent/28 dark:border dark:shadow-md dark:backdrop-blur-none",
                "dark:group-hover/to-molecule:border-accent/80 dark:group-hover/to-molecule:bg-accent/42 dark:group-hover/to-molecule:shadow-lg",
              )}
            >
              <Chip.Label
                className={cn(
                  "min-w-0 font-medium",
                  "text-accent dark:text-accent-foreground",
                )}
              >
                To molecule
              </Chip.Label>
              <ChevronRightIcon
                className={cn(
                  "text-accent dark:text-accent-foreground size-4 shrink-0 opacity-75 motion-safe:transition-[transform,opacity] motion-safe:duration-200 dark:opacity-90",
                  "group-hover/to-molecule:translate-x-0.5 group-hover/to-molecule:opacity-100",
                )}
                aria-hidden
              />
            </Chip>
          </Link>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <NexafsDatasetMetricsRail
              metrics={datasetMetrics}
              className="relative z-50"
            />
          </div>
          <div
            className="flex max-w-full min-w-0 items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <ExperimentAttributionEditSection
              experimentId={experimentId}
              enabled
              variant="inline"
              readOnlyFallback={readOnlyContributorAvatars}
              skeletonAvatarCount={Math.max(1, readOnlyContributorUsers.length)}
              skeletonTrailingSlotCount={2}
            />
          </div>
          <CompactCardMetricsColumn className="relative z-40">
            {isSignedIn ? (
              <Tooltip delay={0}>
                <Tooltip.Trigger className="inline-flex shrink-0 justify-end">
                  <span
                    tabIndex={favoriteMutation.isPending ? 0 : undefined}
                    className="inline-flex"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFavorite();
                      }}
                      disabled={favoriteMutation.isPending}
                      aria-label={
                        displayUserHasUpvoted ? "Unfavorite" : "Favorite"
                      }
                      className={`flex items-center gap-1 text-xs leading-none font-medium tabular-nums transition-colors hover:opacity-80 disabled:opacity-50 ${
                        displayUserHasUpvoted
                          ? "text-pink-500"
                          : "text-text-tertiary"
                      }`}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 shrink-0 ${
                          displayUserHasUpvoted
                            ? "fill-pink-500 text-pink-500"
                            : ""
                        }`}
                        aria-hidden
                      />
                      {displayUpvoteCount}
                    </button>
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content placement="left">
                  {favoriteMutation.isPending
                    ? "Favorite is updating"
                    : displayUserHasUpvoted
                      ? "Remove favorite"
                      : "Add favorite"}
                </Tooltip.Content>
              </Tooltip>
            ) : (
              <span
                className={`inline-flex shrink-0 items-center gap-1 text-xs leading-none font-medium tabular-nums ${
                  displayUserHasUpvoted ? "text-pink-500" : "text-text-tertiary"
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 shrink-0 ${
                    displayUserHasUpvoted ? "fill-pink-500 text-pink-500" : ""
                  }`}
                  aria-hidden
                />
                {displayUpvoteCount}
              </span>
            )}
            <CompactCardMetricStat
              icon={
                <TriangleRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              }
              value={formatCompactMetricCount(polarizationCount)}
              textClassName="text-[10px] text-cyan-500"
              title="Geometries"
            />
          </CompactCardMetricsColumn>
        </div>
      </div>
      <div
        className={cn(
          "grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-in-out",
          spectrumExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="pointer-events-auto min-h-0 overflow-hidden">
          <div className="w-full min-w-0 border-t border-zinc-200 px-3 pt-3 pb-3 dark:border-zinc-600">
            <NexafsExperimentDatasetPanel
              experimentId={experimentId}
              enabled={spectrumExpanded}
            />
          </div>
        </div>
      </div>
      <MoleculeImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        hasImage={hasImage}
        imageUrl={imageurl ?? ""}
        primaryName={displayName}
        chemicalFormula={chemicalformula}
        previewGradient={previewGradient}
      />
    </div>
  );
}
