"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { DatabaseNavigation } from "~/app/components/DatabaseNavigation";
import {
  MoleculeDisplay,
  type DisplayMolecule,
} from "~/app/components/MoleculeDisplay";
import { MoleculeGridSkeleton } from "~/app/components/LoadingState";
import { ErrorState } from "~/app/components/ErrorState";
import type { Filter } from "~/app/components/DatabaseNavigation";
import Link from "next/link";

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sortBy, setSortBy] = useState("relevance");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 12;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Update URL when query changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "/browse";
    router.replace(newUrl, { scroll: false });
  }, [debouncedQuery, currentPage, router]);

  // Search query
  const { data, isLoading, isError, error } =
    trpc.molecules.searchAdvanced.useQuery(
      {
        query: debouncedQuery || "*", // Use wildcard for empty query to get all results
        limit,
        offset: (currentPage - 1) * limit,
      },
      {
        enabled: true,
        staleTime: 30000,
      },
    );

  // Transform results to DisplayMolecule format
  const transformMolecule = (
    molecule: NonNullable<NonNullable<typeof data>["results"]>[number],
  ): DisplayMolecule | null => {
    if (!molecule) return null;

    return {
      name: molecule.iupacName,
      commonName: molecule.synonyms.length > 0 ? molecule.synonyms : undefined,
      chemical_formula: molecule.chemicalFormula,
      SMILES: molecule.smiles,
      InChI: molecule.inchi,
      pubChemCid: molecule.pubChemCid,
      casNumber: molecule.casNumber,
      imageUrl: molecule.imageUrl,
    };
  };

  const totalPages = data ? Math.ceil((data.total || 0) / limit) : 1;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-gray-100">
          Browse Database
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Search and explore molecules in the X-ray Atlas database.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative w-full max-w-3xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search molecules by name, formula, CAS number, or PubChem CID..."
            className="focus:border-wsu-crimson focus:ring-wsu-crimson dark:focus:border-wsu-crimson w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-4 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Navigation and Filters */}
      <DatabaseNavigation
        filters={filters}
        onFilterChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalResults={data?.total}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Results */}
      <div className="mt-8">
        {isLoading && <MoleculeGridSkeleton count={limit} />}

        {isError && (
          <ErrorState
            title="Failed to load results"
            message={
              error?.message ||
              "An error occurred while loading search results."
            }
            onRetry={() => window.location.reload()}
          />
        )}

        {!isLoading && !isError && data && (
          <>
            {data.results.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <p className="text-gray-600 dark:text-gray-400">
                  {debouncedQuery
                    ? `No molecules found for "${debouncedQuery}".`
                    : "No molecules found in the database."}
                </p>
                {debouncedQuery && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                    Try a different search term or{" "}
                    <Link
                      href="/browse"
                      className="text-wsu-crimson hover:underline"
                    >
                      browse all molecules
                    </Link>
                    .
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.results.map((molecule) => {
                  const displayMolecule = transformMolecule(molecule);
                  if (!displayMolecule) return null;

                  return (
                    <Link
                      key={molecule.id}
                      href={`/molecules/${molecule.id}`}
                      className="cursor-pointer transition-transform hover:scale-105"
                    >
                      <MoleculeDisplay molecule={displayMolecule} />
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
