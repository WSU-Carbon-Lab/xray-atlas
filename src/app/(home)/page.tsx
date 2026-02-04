"use client";

import Link from "next/link";
import { Upload, Search } from "lucide-react";
import { MoleculeSearch } from "@/components/molecules/molecule-search";
import { MoleculeCard } from "@/components/molecules/molecule-display";
import { MoleculeGridSkeleton } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { DefaultButton as Button } from "@/components/ui/button";
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
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-gray-600 dark:text-zinc-400">
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
      <section className="border-b border-gray-200 from-gray-50 to-white py-16 sm:py-24 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
        <div className={`mx-auto w-full ${CONTENT_MAX_WIDTH} px-4`}>
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl dark:text-gray-100">
              X-ray Atlas
            </h1>
            <p className="mb-8 text-lg text-gray-600 sm:text-xl dark:text-gray-400">
              Advancing material research through collaborative data.
            </p>

            <div className="mb-8 flex justify-center">
              <MoleculeSearch
                placeholder="Search molecules by name, formula, CAS number..."
                className="w-full max-w-2xl"
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contribute">
                <Button variant="primary" className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Contribute
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Search className="mr-2 h-4 w-4" />
                  Browse Database
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`mx-auto w-full ${CONTENT_MAX_WIDTH} px-4 py-12`}>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-gray-100">
            Popular Molecules
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Explore our most popular molecules.
          </p>
        </div>
        <TopUpvotedMolecules />
      </section>
    </div>
  );
}
