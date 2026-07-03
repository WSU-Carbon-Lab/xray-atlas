"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { HeroUpdatesRow } from "@/components/home/hero-updates-row";
import { AccentNavChip } from "@/components/ui/accent-nav-chip";
import { Upload } from "lucide-react";
import {
  BeakerIcon,
  BoltIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { CatalogHeroSearch } from "@/components/home/catalog-hero-search";
import { MoleculeCard } from "@/components/molecules/molecule-display";
import { MoleculeCardSkeleton } from "@/components/feedback/loading-state";
import { CatalogDataErrorState } from "@/components/feedback/catalog-data-error-state";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";
import { HOME_POPULAR_MOLECULES_LIMIT } from "~/lib/home-popular-molecules";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import { mission, site } from "~/app/brand";

function PopularMoleculesGridSkeleton() {
  return (
    <div className="grid min-h-0 w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: HOME_POPULAR_MOLECULES_LIMIT }).map((_, i) => (
        <div key={i} className="min-w-0">
          <MoleculeCardSkeleton />
        </div>
      ))}
    </div>
  );
}

function TopUpvotedMolecules() {
  const router = useRouter();
  const topFavoritedQuery = trpc.molecules.getTopFavorited.useQuery(
    { limit: HOME_POPULAR_MOLECULES_LIMIT },
    { staleTime: 120_000, gcTime: 300_000 },
  );
  const { data, isLoading, isError, error, refetch } = topFavoritedQuery;

  const molecules = data?.molecules ?? [];

  if (isLoading) {
    return <PopularMoleculesGridSkeleton />;
  }

  if (isError) {
    return (
      <div className="border-border/70 bg-muted/5 rounded-xl border border-dashed px-4 py-10 sm:px-6">
        <CatalogDataErrorState
          error={error}
          title="Failed to load molecules"
          compact
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (molecules.length === 0) {
    return (
      <div className="border-border/70 text-muted bg-muted/5 rounded-xl border border-dashed px-6 py-14 text-center text-sm">
        No molecules found in the database.
      </div>
    );
  }

  return (
    <div role="region" aria-label="Popular molecules">
      <div className="grid min-h-0 w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {molecules.map((molecule) => (
          <div key={molecule.id} className="flex min-h-0 min-w-0 flex-col">
            <div
              onClick={() =>
                router.push(
                  `/molecules/${canonicalMoleculeSlugFromView(molecule)}`,
                )
              }
              className="flex h-full min-h-0 w-full flex-1 cursor-pointer rounded-xl transition-[opacity,box-shadow] hover:opacity-[0.98]"
            >
              <MoleculeCard molecule={molecule} variant="fullCarousel" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CONTENT_MAX_WIDTH = "max-w-7xl";

type HomeQuickLink = {
  readonly href: string;
  readonly title: string;
  readonly hint: string;
  readonly Icon: ComponentType<{ className?: string }>;
};

const homeQuickLinks: readonly HomeQuickLink[] = [
  {
    href: "/contribute",
    title: "Contribute",
    hint: "Upload spectra & metadata",
    Icon: Upload,
  },
  {
    href: "/browse/nexafs",
    title: "NEXAFS datasets",
    hint: "Edge, instrument, facility",
    Icon: BoltIcon,
  },
  {
    href: "/browse/molecules",
    title: "Molecules",
    hint: "Structures & experiments",
    Icon: BeakerIcon,
  },
  {
    href: "/about",
    title: "About",
    hint: "Mission & collaborators",
    Icon: InformationCircleIcon,
  },
];

function BrowseCatalogChip() {
  return (
    <AccentNavChip
      href="/browse/molecules"
      label="Browse catalog"
      icon={BeakerIcon}
    />
  );
}

export function HomePageContent({
  heroAnnouncement,
}: {
  heroAnnouncement?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="border-border bg-background relative isolate overflow-hidden border-b py-12 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          aria-hidden
        >
          <div className="from-accent/50 absolute top-0 -right-24 h-72 w-72 rounded-full bg-gradient-to-bl to-transparent blur-3xl" />
          <div className="absolute -bottom-32 left-0 h-64 w-64 rounded-full bg-gradient-to-tr from-violet-500/35 to-transparent blur-3xl" />
        </div>
        <div className={`relative mx-auto w-full ${CONTENT_MAX_WIDTH} px-4`}>
          <div className="mx-auto max-w-3xl text-center">
            <HeroUpdatesRow
              blogAnnouncement={heroAnnouncement}
              className="mx-auto mb-5 sm:mb-6"
            />
            <h1 className="text-foreground mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {site.name}
            </h1>
            <p className="text-muted mx-auto mb-8 max-w-lg text-base leading-relaxed sm:text-lg">
              {mission.heroShort}
            </p>
            <div className="mb-7 flex justify-center">
              <CatalogHeroSearch
                placeholder="Search molecules, edges, instruments..."
                className="w-full max-w-2xl"
              />
            </div>
          </div>
          <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            {homeQuickLinks.map(({ href, title, hint, Icon }) => (
              <Link
                key={href}
                href={href}
                className="focus-visible:ring-accent border-border bg-surface text-foreground hover:border-accent/30 hover:bg-default group focus-visible:ring-offset-background flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3.5 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 max-sm:min-h-[5.75rem] sm:gap-1.5 sm:px-1.5 sm:py-3"
              >
                <span className="bg-accent/12 text-accent ring-accent/15 inline-flex rounded-lg p-1.5 ring-1 sm:p-2">
                  <Icon
                    className="size-4 shrink-0 sm:size-[1.125rem]"
                    aria-hidden
                  />
                </span>
                <span className="text-foreground group-hover:text-accent text-sm leading-tight font-semibold transition-colors sm:text-xs">
                  {title}
                </span>
                <span className="text-muted max-w-[10rem] px-0.5 text-[11px] leading-snug sm:max-w-[6.75rem] sm:text-[10px]">
                  {hint}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="popular-molecules-heading"
        className={`border-border bg-background border-t ${CONTENT_MAX_WIDTH} mx-auto w-full px-4 py-11 sm:py-14`}
      >
        <div className="border-border bg-surface/35 rounded-2xl border p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-7 lg:p-8 dark:ring-white/[0.06]">
          <header className="mb-7 flex flex-col items-center text-center sm:mb-8">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
              <h2
                id="popular-molecules-heading"
                className="text-foreground text-xl font-bold tracking-tight sm:text-2xl"
              >
                Popular molecules
              </h2>
              <BrowseCatalogChip />
            </div>
          </header>
          <TopUpvotedMolecules />
        </div>
      </section>
    </div>
  );
}
