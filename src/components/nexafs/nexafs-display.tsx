"use client";

import { useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Atom, Copy, Heart } from "lucide-react";
import { Dropdown, Tooltip } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { trpc } from "~/trpc/client";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import {
  MoleculeCardActions,
  MoleculeImageModal,
} from "~/components/molecules/molecule-display";
import { getPreviewGradient } from "~/components/molecules/category-tags";
import { AvatarGroup, type UserWithOrcid } from "~/components/ui/avatar";
import { useRealtimeUpvotes } from "~/hooks/useRealtimeUpvotes";
import type { MoleculeView } from "~/types/molecule";

const pubChemCompoundUrl = (cid: string) =>
  `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
const casRegistryUrl = (casNumber: string) =>
  `https://commonchemistry.cas.org/detail?cas_rn=${casNumber}&search=${casNumber}`;

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

function PolarizationValuesDropdown({
  title,
  values,
  symbol,
  count,
  metricClassName,
  ariaLabel,
}: {
  title: string;
  values: number[];
  symbol: string;
  count: number;
  metricClassName: string;
  ariaLabel: string;
}) {
  const listText = values.length > 0 ? values.join(", ") : "No values";
  const itemId = useId();
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={ariaLabel}
        className={cn(
          buttonVariants({ variant: "tertiary", size: "sm" }),
          metricClassName,
          "focus-visible:ring-accent relative z-10 inline-grid h-9 min-h-9 min-w-[44px] place-items-center rounded-md px-1 py-0 text-[11px] leading-none font-semibold tabular-nums hover:bg-zinc-700/30 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900",
        )}
      >
        <span className="inline-grid w-full min-w-0 grid-cols-[16px_1fr] items-center justify-items-start gap-x-1">
          <span
            className="inline-flex w-[16px] justify-center font-serif text-base leading-none"
            aria-hidden
          >
            {symbol}
          </span>
          <span className="text-left">{count}</span>
        </span>
      </Dropdown.Trigger>
      <Dropdown.Popover
        placement="left"
        offset={8}
        className="border-border bg-surface max-w-xs rounded-xl border p-0 shadow-lg outline-none"
      >
        <Dropdown.Menu selectionMode="none" aria-label={title}>
          <Dropdown.Item
            id={itemId}
            textValue={`${title} ${listText}`}
            className="text-muted cursor-default py-2 font-mono text-xs leading-relaxed tabular-nums"
          >
            <div className="px-2 py-2">
              <div className="text-foreground text-sm font-semibold">
                {title}
              </div>
              <div className="text-muted mt-1 font-mono text-xs leading-relaxed tabular-nums">
                {listText}
              </div>
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export type NexafsExperimentCompactCardProps = {
  href: string;
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
  uniqueThetaCount: number;
  uniquePhiCount: number;
  thetaValues: number[];
  phiValues: number[];
};

export function NexafsExperimentCompactCard({
  href,
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
  edgeLabel,
  instrumentName,
  facilityName,
  experimentTypeLabel,
  experimentContributorUsers,
  polarizationCount: _polarizationCount,
  uniqueThetaCount,
  uniquePhiCount,
  thetaValues,
  phiValues,
}: NexafsExperimentCompactCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!user;
  const utils = trpc.useUtils();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [optimisticFavoriteDelta, setOptimisticFavoriteDelta] = useState(0);
  const [optimisticUserFavorited, setOptimisticUserFavorited] = useState<
    boolean | null
  >(null);

  const {
    upvoteCount: realtimeUpvoteCount,
    userHasUpvoted: realtimeUserHasUpvoted,
  } = useRealtimeUpvotes({
    moleculeId,
    initialUpvoteCount: favoriteCount,
    initialUserHasUpvoted: false,
    userId: user?.id,
    enabled: true,
  });

  const favoriteMutation = trpc.molecules.toggleFavorite.useMutation({
    onMutate: () => {
      setOptimisticUserFavorited(realtimeUserHasUpvoted ? false : true);
      setOptimisticFavoriteDelta(realtimeUserHasUpvoted ? -1 : 1);
    },
    onSuccess: () => {
      void utils.molecules.getById.invalidate({ id: moleculeId });
    },
    onSettled: () => {
      setOptimisticFavoriteDelta(0);
      setOptimisticUserFavorited(null);
    },
  });

  const displayUpvoteCount = realtimeUpvoteCount + optimisticFavoriteDelta;
  const displayUserHasUpvoted =
    optimisticUserFavorited ?? realtimeUserHasUpvoted;

  const handleFavorite = useCallback(() => {
    if (!isSignedIn || !moleculeId) return;
    void favoriteMutation.mutateAsync({ moleculeId });
  }, [isSignedIn, moleculeId, favoriteMutation]);

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
  const thetaDisplayCount = uniqueThetaCount;
  const phiDisplayCount = uniquePhiCount;
  const instrumentFacilityLabel = `${instrumentName} | ${facilityLine}`;
  return (
    <div className="group border-border-default hover:border-border-strong dark:border-border-default hover:border-accent/30 pointer-events-none flex w-full flex-col overflow-visible rounded-2xl border bg-zinc-50 p-3 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md md:flex-row md:items-center md:gap-4 dark:bg-zinc-800">
      <div
        role="link"
        tabIndex={0}
        className="focus-visible:ring-accent pointer-events-auto flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-r border-zinc-200 pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:flex-row md:gap-4 md:pr-4 dark:border-zinc-600"
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
        <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
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
          <div className="mt-1 inline-flex h-5 max-w-full min-w-0 items-center justify-start gap-x-1.5 overflow-hidden text-left text-[10px] leading-none whitespace-nowrap sm:text-[11px]">
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
        className="pointer-events-auto relative z-30 flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-3 border-t border-zinc-200 pt-3 md:ml-auto md:flex-nowrap md:gap-x-3 md:gap-y-0 md:border-t-0 md:pt-0 md:pl-4 dark:border-zinc-600"
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
        <div className="relative z-40 flex min-w-[64px] shrink-0 flex-col items-end gap-0.5">
          {isSignedIn ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFavorite();
              }}
              disabled={favoriteMutation.isPending}
              aria-label={displayUserHasUpvoted ? "Unfavorite" : "Favorite"}
              className={`grid h-6 w-[42px] grid-cols-[16px_18px] items-center justify-items-start gap-x-1 rounded-md px-0.5 text-[11px] leading-none font-semibold tabular-nums transition-colors hover:bg-zinc-700/30 hover:opacity-80 disabled:opacity-50 ${
                displayUserHasUpvoted ? "text-pink-500" : "text-text-secondary"
              }`}
            >
              <span className="inline-flex w-[16px] justify-center" aria-hidden>
                <Heart
                  className={`h-3.5 w-3.5 shrink-0 ${
                    displayUserHasUpvoted ? "fill-pink-500 text-pink-500" : ""
                  }`}
                  aria-hidden
                />
              </span>
              <span className="text-left">{displayUpvoteCount}</span>
            </button>
          ) : (
            <span
              className={`grid h-6 w-[42px] grid-cols-[16px_18px] items-center justify-items-start gap-x-1 rounded-md px-0.5 text-[11px] leading-none font-semibold tabular-nums ${
                displayUserHasUpvoted ? "text-pink-500" : "text-text-secondary"
              }`}
            >
              <span className="inline-flex w-[16px] justify-center" aria-hidden>
                <Heart
                  className={`h-3.5 w-3.5 shrink-0 ${
                    displayUserHasUpvoted ? "fill-pink-500 text-pink-500" : ""
                  }`}
                  aria-hidden
                />
              </span>
              <span className="text-left">{displayUpvoteCount}</span>
            </span>
          )}
          <PolarizationValuesDropdown
            title="Theta values"
            values={thetaValues}
            symbol="θ"
            count={thetaDisplayCount}
            metricClassName="text-info"
            ariaLabel="Open theta polarization values"
          />
          <PolarizationValuesDropdown
            title="Phi values"
            values={phiValues}
            symbol="φ"
            count={phiDisplayCount}
            metricClassName="text-warning"
            ariaLabel="Open phi polarization values"
          />
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
