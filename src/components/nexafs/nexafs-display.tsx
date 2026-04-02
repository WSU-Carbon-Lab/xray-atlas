"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Atom, Copy, Heart, MessageCircle, TriangleRight } from "lucide-react";
import { Tooltip } from "@heroui/react";
import { trpc } from "~/trpc/client";
import {
  CompactCardMetricsColumn,
  CompactCardMetricStat,
  formatCompactMetricCount,
} from "~/components/browse/compact-card-metrics";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import {
  MoleculeCardActions,
  MoleculeImageModal,
} from "~/components/molecules/molecule-display";
import { getPreviewGradient } from "~/components/molecules/category-tags";
import { AvatarGroup, type UserWithOrcid } from "~/components/ui/avatar";
import { useRealtimeExperimentFavorites } from "~/hooks/useRealtimeExperimentFavorites";
import type { MoleculeView } from "~/types/molecule";

const pubChemCompoundUrl = (cid: string) =>
  `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
const casRegistryUrl = (casNumber: string) =>
  `https://commonchemistry.cas.org/detail?cas_rn=${casNumber}&search=${casNumber}`;

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
      return "border-cyan-500/35 bg-cyan-500/12 text-cyan-300";
    case "N":
    case "NITROGEN":
      return "border-indigo-500/35 bg-indigo-500/12 text-indigo-300";
    case "O":
    case "OXYGEN":
      return "border-emerald-500/35 bg-emerald-500/12 text-emerald-300";
    case "S":
    case "SULFUR":
    case "SULPHUR":
      return "border-amber-500/35 bg-amber-500/12 text-amber-300";
    case "F":
      return "border-sky-500/35 bg-sky-500/12 text-sky-300";
    default:
      return "border-zinc-500/35 bg-zinc-500/12 text-zinc-300";
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
    "border-violet-500/35 bg-violet-500/12 text-violet-300",
    "border-rose-500/35 bg-rose-500/12 text-rose-300",
    "border-cyan-500/35 bg-cyan-500/12 text-cyan-300",
    "border-teal-500/35 bg-teal-500/12 text-teal-300",
    "border-blue-500/35 bg-blue-500/12 text-blue-300",
    "border-fuchsia-500/35 bg-fuchsia-500/12 text-fuchsia-300",
  ] as const;
  const key = `${instrumentName}|${facilityName ?? ""}`;
  return palettes[hashIndex(key, palettes.length)] ?? palettes[0];
}

function experimentTypeChipClass(experimentTypeLabel: string | null): string {
  if (!experimentTypeLabel) {
    return "border-zinc-500/35 bg-zinc-500/12 text-zinc-300";
  }
  const label = experimentTypeLabel.toLowerCase();
  if (label.includes("fluorescence")) {
    return "border-pink-500/35 bg-pink-500/12 text-pink-300";
  }
  if (label.includes("partial electron")) {
    return "border-orange-500/35 bg-orange-500/12 text-orange-300";
  }
  if (label.includes("total electron")) {
    return "border-green-500/35 bg-green-500/12 text-green-300";
  }
  if (label.includes("transmission")) {
    return "border-blue-500/35 bg-blue-500/12 text-blue-300";
  }
  return "border-zinc-500/35 bg-zinc-500/12 text-zinc-300";
}

export type NexafsExperimentCompactCardProps = {
  href: string;
  experimentId: string;
  moleculeId: string;
  displayName: string;
  iupacname: string;
  chemicalformula: string;
  imageurl: string | null;
  inchi: string;
  smiles: string;
  casNumber: string | null;
  pubChemCid: string | null;
  favoriteCount: number;
  userHasFavorited: boolean;
  edgeLabel: string;
  instrumentName: string;
  facilityName: string | null;
  experimentTypeLabel: string | null;
  experimentContributorUsers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    orcid: string | null;
  }>;
  polarizationCount: number;
  commentCount: number;
};

export function NexafsExperimentCompactCard({
  href,
  experimentId,
  moleculeId,
  displayName,
  iupacname,
  chemicalformula,
  imageurl,
  inchi,
  smiles,
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
  commentCount,
}: NexafsExperimentCompactCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!user;
  const queryClient = useQueryClient();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [optimisticFavoriteDelta, setOptimisticFavoriteDelta] = useState(0);
  const [optimisticUserFavorited, setOptimisticUserFavorited] = useState<
    boolean | null
  >(null);

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

  const handleCopy = useCallback((text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(() => {
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
      });
    }
  }, []);

  const previewMolecule: MoleculeView = {
    id: moleculeId,
    name: displayName,
    iupacName: iupacname,
    chemicalFormula: chemicalformula,
    SMILES: smiles,
    InChI: inchi,
    pubChemCid,
    casNumber,
    favoriteCount,
    userHasFavorited: displayUserHasUpvoted,
  };

  const previewGradient = getPreviewGradient(previewMolecule);
  const hasImage = Boolean(imageurl?.trim());
  const pubChemUrlResolved = pubChemCid ? pubChemCompoundUrl(pubChemCid) : null;
  const casUrlResolved = casNumber ? casRegistryUrl(casNumber) : null;

  const actionsMolecule = {
    InChI: inchi,
    SMILES: smiles,
    pubChemCid,
    casNumber,
    name: displayName,
    iupacName: iupacname,
    chemicalFormula: chemicalformula,
    id: moleculeId,
    favoriteCount: displayUpvoteCount,
    userHasFavorited: displayUserHasUpvoted,
  } as MoleculeView;

  const avatarUsers: UserWithOrcid[] = experimentContributorUsers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    image: c.image,
    orcid: c.orcid,
  }));

  const facilityLine = facilityName ?? "Facility unknown";
  const edgeClass = edgeChipClass(edgeLabel);
  const instrumentClass = instrumentChipClass(instrumentName, facilityName);
  const experimentTypeClass = experimentTypeChipClass(experimentTypeLabel);
  const instrumentFacilityLabel = `${instrumentName} | ${facilityLine}`;
  return (
    <div className="group border-border-default hover:border-border-strong dark:border-border-default hover:border-accent/30 pointer-events-none flex w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 p-3 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md md:flex-row md:items-center md:gap-4 dark:bg-zinc-800">
      <div
        role="link"
        tabIndex={0}
        className="focus-visible:ring-accent pointer-events-auto flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-r border-zinc-200 pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:gap-4 md:pr-4 dark:border-zinc-600"
        onClick={() => router.push(href)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(href);
          }
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
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
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <div className="min-w-0 shrink">
              <span className="text-text-primary motion-safe:group-hover:text-accent block truncate text-sm leading-tight font-bold motion-safe:transition-colors">
                {displayName}
              </span>
            </div>
            <span className="text-text-tertiary border-border-default inline-flex h-5 shrink-0 items-center rounded border bg-zinc-100 px-1.5 font-mono text-[9px] tabular-nums sm:text-[10px] dark:bg-zinc-700">
              {chemicalformula || "N/A"}
            </span>
          </div>
          <div className="flex min-w-0 shrink items-center gap-2 overflow-hidden">
            {casNumber ? (
              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <button
                    type="button"
                    aria-label="Copy CAS number"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopy(casNumber, "CAS");
                    }}
                    className={`focus-visible:ring-accent inline-flex h-5 max-w-full shrink items-center gap-1 rounded px-1.5 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:px-2 ${
                      copiedText === "CAS"
                        ? "bg-info/30 text-info dark:bg-info/40 dark:text-info-light"
                        : "bg-info/20 text-info dark:bg-info/30 dark:text-info-light"
                    }`}
                  >
                    <Copy
                      className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5"
                      aria-hidden
                    />
                    <span className="truncate font-mono text-[9px] tabular-nums sm:text-[10px]">
                      CAS {casNumber}
                    </span>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content placement="top">
                  {copiedText === "CAS" ? "Copied!" : "Copy CAS number"}
                </Tooltip.Content>
              </Tooltip>
            ) : null}
          </div>
          <div className="inline-flex h-5 max-w-full min-w-0 items-center justify-start gap-x-1.5 overflow-hidden text-left text-[10px] leading-none whitespace-nowrap sm:text-[11px]">
            <span
              className={`inline-flex h-4.5 shrink-0 items-center rounded-full border px-1.5 font-semibold ${edgeClass}`}
            >
              {edgeLabel}
            </span>
            <span
              className={`inline-flex h-4.5 max-w-[74%] min-w-0 items-center truncate rounded-full border px-1.5 font-medium ${instrumentClass}`}
              title={instrumentFacilityLabel}
            >
              {instrumentFacilityLabel}
            </span>
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
      <div
        className="pointer-events-auto relative z-30 flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-3 border-t border-zinc-200 pt-3 md:ml-auto md:gap-x-3 md:gap-y-0 md:border-t-0 md:pt-0 md:pl-4 dark:border-zinc-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <MoleculeCardActions
            molecule={actionsMolecule}
            pubChemUrl={pubChemUrlResolved}
            casUrl={casUrlResolved}
            copiedText={copiedText}
            handleCopy={handleCopy}
            size="sm"
          />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AvatarGroup users={avatarUsers} size="sm" />
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
          <CompactCardMetricStat
            icon={
              <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            }
            value={formatCompactMetricCount(commentCount)}
            textClassName="text-[10px] text-teal-400"
            title="Comments"
          />
        </CompactCardMetricsColumn>
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
