"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import {
  MoleculeDisplayCompact,
  MoleculeDisplay,
  type DisplayMolecule,
} from "~/app/components/MoleculeDisplay";
import { ErrorState } from "~/app/components/ErrorState";
import { BrowseTabs } from "~/app/components/BrowseTabs";
import { Squares2X2Icon, ListBulletIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { molecules } from "@prisma/client";
import { AddMoleculeButton } from "~/app/components/AddEntityButtons";

export default function MoleculesBrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sortBy, setSortBy] = useState<"upvotes" | "created" | "name">(
    "upvotes",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<"compact" | "spacious">("compact");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Load view mode from localStorage on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem("moleculeViewMode");
    if (savedViewMode === "compact" || savedViewMode === "spacious") {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("moleculeViewMode", viewMode);
  }, [viewMode]);

  // Reset to first page when sort or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, itemsPerPage]);

  // Update URL when query or page changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }
    const newUrl = `/browse/molecules${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [debouncedQuery, currentPage, router]);

  const hasSearchQuery = debouncedQuery.trim().length > 0;

  const searchData = trpc.molecules.searchAdvanced.useQuery(
    {
      query: debouncedQuery,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    },
    {
      enabled: hasSearchQuery,
      staleTime: 30000,
    },
  );

  const allData = trpc.molecules.getAllPaginated.useQuery(
    {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortBy,
    },
    {
      enabled: !hasSearchQuery,
      staleTime: 30000,
    },
  );

  const data = hasSearchQuery ? searchData.data : allData.data;
  const isLoading = hasSearchQuery ? searchData.isLoading : allData.isLoading;
  const isError = hasSearchQuery ? searchData.isError : allData.isError;
  const error = hasSearchQuery ? searchData.error : allData.error;

  const transformMolecule = (
    molecule:
      | NonNullable<NonNullable<typeof data>["molecules"]>[number]
      | NonNullable<NonNullable<typeof data>["results"]>[number],
  ): DisplayMolecule | null => {
    if (!molecule) return null;

    if ("iupacName" in molecule && "synonyms" in molecule) {
      return {
        name: molecule.iupacName,
        commonName:
          molecule.synonyms.length > 0 ? molecule.synonyms : undefined,
        chemical_formula: molecule.chemicalFormula,
        SMILES: molecule.smiles,
        InChI: molecule.inchi,
        pubChemCid: molecule.pubChemCid,
        casNumber: molecule.casNumber,
        imageUrl: molecule.imageUrl,
        id: molecule.id,
      };
    }

    const synonyms = molecule.moleculesynonyms.map(
      (s: { synonym: string }) => s.synonym,
    );
    const primarySynonym = molecule.moleculesynonyms.find(
      (s: { order?: number }) => s.order === 0,
    );
    const displayName =
      primarySynonym?.synonym ?? synonyms[0] ?? molecule.iupacname;

    return {
      name: displayName,
      commonName: synonyms.length > 0 ? synonyms : undefined,
      chemical_formula: molecule.chemicalformula,
      SMILES: molecule.smiles,
      InChI: molecule.inchi,
      pubChemCid: molecule.pubchemcid,
      casNumber: molecule.casnumber,
      imageUrl: molecule.imageurl ?? undefined,
      id: molecule.id,
      upvoteCount: (molecule as { upvoteCount?: number }).upvoteCount,
      userHasUpvoted: false,
      createdBy: (
        molecule as {
          users?: {
            id: string;
            name: string;
            email: string;
            imageurl: string | null;
          } | null;
        }
      ).users
        ? {
            id: (
              molecule as {
                users: {
                  id: string;
                  name: string;
                  email: string;
                  imageurl: string | null;
                };
              }
            ).users!.id,
            name: (
              molecule as {
                users: {
                  id: string;
                  name: string;
                  email: string;
                  imageurl: string | null;
                };
              }
            ).users!.name,
            email: (
              molecule as {
                users: {
                  id: string;
                  name: string;
                  email: string;
                  imageurl: string | null;
                };
              }
            ).users!.email,
            imageurl: (
              molecule as {
                users: {
                  id: string;
                  name: string;
                  email: string;
                  imageurl: string | null;
                };
              }
            ).users!.imageurl,
          }
        : null,
    };
  };

  const totalPages = data
    ? Math.ceil(
        (hasSearchQuery
          ? (data as { total?: number }).total || 0
          : (data as { total: number }).total) / itemsPerPage,
      )
    : 1;
  const molecules = hasSearchQuery
    ? ((
        data as {
          results?: Array<{
            id: string;
            iupacName: string;
            synonyms: string[];
            chemicalFormula: string;
            smiles: string;
            inchi: string;
            pubChemCid: string | null;
            casNumber: string | null;
            imageUrl?: string;
          }>;
        }
      )?.results ?? [])
    : ((data as { molecules?: Array<unknown> })?.molecules ?? []);

  const handleMoleculeCreated = () => {
    searchData.refetch();
    allData.refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-gray-100">
          Browse Molecules
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {hasSearchQuery
            ? `Search results for "${debouncedQuery}"`
            : "Explore all molecules in the X-ray Atlas database."}
        </p>
      </div>

      <BrowseTabs />

      <div className="space-y-6">
        {/* Search Bar */}
        <div>
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

        {/* Controls Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {data && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, data.total)} of{" "}
                {data.total} molecules
              </div>
            )}
            <div className="flex items-center gap-2">
              <label
                htmlFor="items-per-page"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Show:
              </label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="focus:border-wsu-crimson focus:ring-wsu-crimson rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                per page
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
              <button
                onClick={() => setViewMode("compact")}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "compact"
                    ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
                aria-label="Compact view"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("spacious")}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "spacious"
                    ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
                aria-label="Spacious view"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
            </div>

            {!hasSearchQuery && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="sort-select"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Sort:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "upvotes" | "created" | "name")
                  }
                  className="focus:border-wsu-crimson focus:ring-wsu-crimson rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="upvotes">Most Upvoted</option>
                  <option value="created">Newest First</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div>
          {isLoading && (
            <div
              className={
                viewMode === "compact"
                  ? "space-y-3"
                  : "grid grid-cols-1 gap-6 md:grid-cols-2"
              }
            >
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <div
                  key={i}
                  className={`animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
                    viewMode === "compact" ? "h-32" : "h-64"
                  }`}
                />
              ))}
            </div>
          )}

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
              {molecules.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-gray-600 dark:text-gray-400">
                    {hasSearchQuery
                      ? `No molecules found for "${debouncedQuery}".`
                      : "No molecules found in the database."}
                  </p>
                  {hasSearchQuery && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                      Try a different search term or{" "}
                      <Link
                        href="/browse/molecules"
                        className="text-wsu-crimson hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          setQuery("");
                          setDebouncedQuery("");
                        }}
                      >
                        browse all molecules
                      </Link>
                      .
                    </p>
                  )}
                  <div className="mt-6">
                    <AddMoleculeButton
                      className="min-h-[140px]"
                      onCreated={handleMoleculeCreated}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {viewMode === "compact" ? (
                    <div className="space-y-3">
                      <AddMoleculeButton
                        className="min-h-[140px]"
                        onCreated={handleMoleculeCreated}
                      />
                      {molecules.map(
                        (
                          molecule: NonNullable<
                            NonNullable<typeof data>["molecules"]
                          >[number],
                        ) => {
                          const displayMolecule = transformMolecule(molecule);
                          if (!displayMolecule) return null;

                          const handleCardClick = (e: React.MouseEvent) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest("a") ||
                              target.closest("button") ||
                              target.tagName === "A" ||
                              target.tagName === "BUTTON"
                            ) {
                              return;
                            }
                            router.push(`/molecules/${molecule.id}`);
                          };

                          return (
                            <div
                              key={molecule.id}
                              onClick={handleCardClick}
                              className="cursor-pointer"
                            >
                              <MoleculeDisplayCompact
                                molecule={displayMolecule}
                              />
                            </div>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <AddMoleculeButton
                        className="min-h-[220px]"
                        onCreated={handleMoleculeCreated}
                      />
                      {molecules.map(
                        (
                          molecule: NonNullable<
                            NonNullable<typeof data>["molecules"]
                          >[number],
                        ) => {
                          const displayMolecule = transformMolecule(molecule);
                          if (!displayMolecule) return null;

                          const handleCardClick = (e: React.MouseEvent) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest("a") ||
                              target.closest("button") ||
                              target.tagName === "A" ||
                              target.tagName === "BUTTON"
                            ) {
                              return;
                            }
                            router.push(`/molecules/${molecule.id}`);
                          };

                          return (
                            <div
                              key={molecule.id}
                              onClick={handleCardClick}
                              className="cursor-pointer"
                            >
                              <MoleculeDisplay molecule={displayMolecule} />
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    {totalPages <= 7 ? (
                      Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`rounded px-3 py-1 text-sm ${
                              page === currentPage
                                ? "bg-wsu-crimson text-white"
                                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            }`}
                          >
                            {page}
                          </button>
                        ),
                      )
                    ) : (
                      <>
                        {currentPage > 3 && (
                          <>
                            <button
                              onClick={() => setCurrentPage(1)}
                              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              1
                            </button>
                            {currentPage > 4 && (
                              <span className="text-gray-500">...</span>
                            )}
                          </>
                        )}
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) =>
                            Math.max(
                              1,
                              Math.min(currentPage - 2 + i, totalPages - 4 + i),
                            ),
                        )
                          .filter((page, idx, arr) => arr.indexOf(page) === idx)
                          .filter((page) => page >= 1 && page <= totalPages)
                          .map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`rounded px-3 py-1 text-sm ${
                                page === currentPage
                                  ? "bg-wsu-crimson text-white"
                                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <span className="text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
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
    </div>
  );
}
