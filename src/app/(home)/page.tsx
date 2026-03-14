"use client";

import Link from "next/link";
import { Upload, Search } from "lucide-react";
import { MoleculeSearch } from "@/components/molecules/molecule-search";
import { MoleculeCard } from "@/components/molecules/molecule-display";
import { MoleculeGridSkeleton } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";

function TopUpvotedMolecules() {
  const router = useRouter();
  const { data, isLoading, isError, error } =
    trpc.molecules.getTopFavorited.useQuery({
      limit: 4,
    });

  if (isLoading) {
    return <MoleculeGridSkeleton count={4} variant="full" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load molecules"
        message={error?.message || "An error occurred while loading molecules."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!data || data.molecules.length === 0) {
    return (
      <div className="border-border bg-surface rounded-xl border p-8 text-center">
        <p className="text-muted">
          No molecules found in the database.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {data.molecules.map((molecule) => (
        <div
          key={molecule.id}
          onClick={() => router.push(`/molecules/${molecule.id}`)}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <MoleculeCard molecule={molecule} variant="full" />
        </div>
      ))}
    </div>
  );
}

const CONTENT_MAX_WIDTH = "max-w-7xl";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="border-border bg-background border-b py-16 sm:py-24">
        <div className={`mx-auto w-full ${CONTENT_MAX_WIDTH} px-4`}>
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-foreground mb-4 text-4xl font-bold sm:text-5xl md:text-6xl">
              X-ray Atlas
            </h1>
            <p className="text-muted mb-8 text-lg sm:text-xl">
              Advancing material research through collaborative data.
            </p>

            <div className="mb-8 flex justify-center">
              <MoleculeSearch
                placeholder="Search molecules by name, formula, CAS number..."
                className="w-full max-w-2xl"
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contribute"
                className="bg-accent text-accent-foreground focus-visible:ring-accent flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              >
                <Upload className="h-4 w-4 shrink-0" />
                Contribute
              </Link>
              <Link
                href="/browse"
                className="border-border bg-surface text-foreground focus-visible:ring-accent flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              >
                <Search className="h-4 w-4 shrink-0" />
                Browse Database
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`mx-auto w-full ${CONTENT_MAX_WIDTH} px-4 py-12`}>
        <div className="mb-8">
          <h2 className="text-foreground text-2xl font-bold sm:text-3xl">
            Popular Molecules
          </h2>
          <p className="text-muted mt-2">
            Explore our most popular molecules.
          </p>
        </div>
        <TopUpvotedMolecules />
      </section>
    </div>
  );
}
