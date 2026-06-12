"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { HeroUpdatesRow } from "@/components/home/hero-updates-row";
import { AccentNavChip } from "@/components/ui/accent-nav-chip";
import { cn } from "@heroui/styles";
import { Upload } from "lucide-react";
import {
  BeakerIcon,
  BoltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { CatalogHeroSearch } from "@/components/home/catalog-hero-search";
import { MoleculeCard } from "@/components/molecules/molecule-display";
import { MoleculeCardSkeleton } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import { mission, site } from "~/app/brand";

function usePopularCarouselItemsPerPage(): number {
  const [itemsPerPage, setItemsPerPage] = useState(2);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w >= 1280) setItemsPerPage(4);
      else if (w >= 1024) setItemsPerPage(3);
      else if (w >= 640) setItemsPerPage(2);
      else setItemsPerPage(1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return itemsPerPage;
}

function PopularMoleculesCarouselSkeleton({
  itemsPerPage,
}: {
  itemsPerPage: number;
}) {
  return (
    <div
      className="grid min-h-0 w-full gap-4 sm:gap-5"
      style={{
        gridTemplateColumns: `repeat(${itemsPerPage}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: itemsPerPage }).map((_, i) => (
        <div key={i} className="min-w-0">
          <MoleculeCardSkeleton />
        </div>
      ))}
    </div>
  );
}

function PopularMoleculesCarouselFooter({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <footer className="border-border mt-6 flex flex-col items-center gap-4 border-t pt-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="secondary"
          size="sm"
          isIconOnly
          aria-label="Previous page"
          isDisabled={page <= 0}
          onPress={() => onPageChange(Math.max(0, page - 1))}
        >
          <ChevronLeftIcon className="size-5 shrink-0" aria-hidden />
        </Button>
        <span className="text-muted min-w-[4.5rem] text-center text-sm tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          isIconOnly
          aria-label="Next page"
          isDisabled={page >= totalPages - 1}
          onPress={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        >
          <ChevronRightIcon className="size-5 shrink-0" aria-hidden />
        </Button>
      </div>
      {totalPages <= 8 ? (
        <div
          className="flex max-w-full flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Popular molecules pages"
        >
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`Go to page ${String(i + 1)}`}
              onClick={() => onPageChange(i)}
              className={cn(
                "h-2 shrink-0 rounded-full transition-[width,background-color]",
                i === page ? "bg-accent w-8" : "bg-muted hover:bg-muted/80 w-2",
              )}
            />
          ))}
        </div>
      ) : null}
    </footer>
  );
}

function TopUpvotedMolecules() {
  const router = useRouter();
  const itemsPerPage = usePopularCarouselItemsPerPage();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error } =
    trpc.molecules.getTopFavorited.useQuery({
      limit: 16,
    });

  const molecules = data?.molecules ?? [];
  const totalPages =
    molecules.length === 0 ? 1 : Math.ceil(molecules.length / itemsPerPage);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages, itemsPerPage]);

  if (isLoading) {
    return <PopularMoleculesCarouselSkeleton itemsPerPage={itemsPerPage} />;
  }

  if (isError) {
    return (
      <div className="border-border/70 bg-muted/5 rounded-xl border border-dashed px-4 py-10 sm:px-6">
        <ErrorState
          title="Failed to load molecules"
          message={
            error?.message ?? "An error occurred while loading molecules."
          }
          onRetry={() => window.location.reload()}
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

  const start = page * itemsPerPage;
  const pageMolecules = molecules.slice(start, start + itemsPerPage);
  const columnCount = Math.min(itemsPerPage, Math.max(pageMolecules.length, 1));

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Popular molecules"
      aria-live="polite"
    >
      <div
        className="grid min-h-0 w-full gap-4 sm:gap-5"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        {pageMolecules.map((molecule) => (
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
      <PopularMoleculesCarouselFooter
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
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
