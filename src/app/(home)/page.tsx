"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { Upload } from "lucide-react";
import {
  BeakerIcon,
  BoltIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { MoleculeSearch } from "@/components/molecules/molecule-search";
import { MoleculeCard } from "@/components/molecules/molecule-display";
import { MoleculeCardSkeleton } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import { mission, site } from "~/app/brand";

/**
 * Maps viewport width to how many full molecule cards render per carousel page.
 * Breakpoints align with Tailwind `sm` (640px), `lg` (1024px), and `xl` (1280px).
 */
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
    return (
      <PopularMoleculesCarouselSkeleton itemsPerPage={itemsPerPage} />
    );
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
      <div className="border-border/70 text-muted rounded-xl border border-dashed bg-muted/5 px-6 py-14 text-center text-sm">
        No molecules found in the database.
      </div>
    );
  }

  const start = page * itemsPerPage;
  const pageMolecules = molecules.slice(start, start + itemsPerPage);
  const columnCount = Math.min(
    itemsPerPage,
    Math.max(pageMolecules.length, 1),
  );

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

function WikiQuickStartChip() {
  return (
    <Link
      href="/wiki/home"
      className="focus-visible:ring-accent inline-flex max-w-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Chip
        variant="soft"
        color="accent"
        size="md"
        className={cn(
          "max-w-full cursor-pointer shadow-sm backdrop-blur-sm transition-opacity hover:opacity-90",
          "dark:border dark:border-accent/55 dark:bg-accent/28 dark:shadow-md dark:backdrop-blur-none",
        )}
      >
        <BookOpenIcon
          className="size-4 shrink-0 text-accent dark:text-accent-foreground"
          aria-hidden
        />
        <Chip.Label
          className={cn(
            "min-w-0 text-balance font-medium",
            "text-accent dark:text-accent-foreground",
          )}
        >
          Quick start: NEXAFS terminology & data guide
        </Chip.Label>
        <ChevronRightIcon
          className="size-4 shrink-0 text-accent opacity-75 dark:text-accent-foreground dark:opacity-90"
          aria-hidden
        />
      </Chip>
    </Link>
  );
}

function BrowseCatalogChip() {
  return (
    <Link
      href="/browse/molecules"
      className="focus-visible:ring-accent inline-flex max-w-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Chip
        variant="soft"
        color="accent"
        size="md"
        className={cn(
          "max-w-full cursor-pointer shadow-sm backdrop-blur-sm transition-opacity hover:opacity-90",
          "dark:border dark:border-accent/55 dark:bg-accent/28 dark:shadow-md dark:backdrop-blur-none",
        )}
      >
        <BeakerIcon
          className="size-4 shrink-0 text-accent dark:text-accent-foreground"
          aria-hidden
        />
        <Chip.Label
          className={cn(
            "min-w-0 text-balance font-medium",
            "text-accent dark:text-accent-foreground",
          )}
        >
          Browse catalog
        </Chip.Label>
        <ChevronRightIcon
          className="size-4 shrink-0 text-accent opacity-75 dark:text-accent-foreground dark:opacity-90"
          aria-hidden
        />
      </Chip>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="border-border bg-background relative isolate overflow-hidden border-b py-12 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          aria-hidden
        >
          <div className="from-accent/50 absolute -right-24 top-0 h-72 w-72 rounded-full bg-gradient-to-bl to-transparent blur-3xl" />
          <div className="absolute -bottom-32 left-0 h-64 w-64 rounded-full bg-gradient-to-tr from-violet-500/35 to-transparent blur-3xl" />
        </div>
        <div className={`relative mx-auto w-full ${CONTENT_MAX_WIDTH} px-4`}>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 flex justify-center sm:mb-6">
              <WikiQuickStartChip />
            </div>
            <h1 className="text-foreground mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {site.name}
            </h1>
            <p className="text-muted mx-auto mb-8 max-w-lg text-base leading-relaxed sm:text-lg">
              {mission.heroShort}
            </p>
            <div className="mb-7 flex justify-center">
              <MoleculeSearch
                placeholder="Search by name, formula, or CAS..."
                className="w-full max-w-2xl"
              />
            </div>
          </div>
          <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-3">
            {homeQuickLinks.map(({ href, title, hint, Icon }) => (
              <Link
                key={href}
                href={href}
                className="focus-visible:ring-accent border-border bg-surface text-foreground hover:border-accent/30 hover:bg-default group flex min-h-[6.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-4 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-0 sm:gap-2 sm:py-5"
              >
                <span className="bg-accent/12 text-accent ring-accent/15 inline-flex rounded-lg p-2 ring-1">
                  <Icon className="size-5 shrink-0" aria-hidden />
                </span>
                <span className="text-foreground group-hover:text-accent text-sm font-semibold transition-colors">
                  {title}
                </span>
                <span className="text-muted max-w-[11rem] px-0.5 text-[11px] leading-snug sm:text-xs">
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
