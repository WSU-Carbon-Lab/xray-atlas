"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { FacilityCardCompact } from "~/app/components/FacilityCardCompact";
import { ErrorState } from "~/app/components/ErrorState";
import { BrowseTabs } from "~/app/components/BrowseTabs";
import Link from "next/link";
import { AddFacilityButton } from "~/app/components/AddEntityButtons";

export default function FacilitiesBrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sortBy, setSortBy] = useState<"name" | "city" | "country">("name");
  const [facilityType, setFacilityType] = useState<
    "SYNCHROTRON" | "FREE_ELECTRON_LASER" | "LAB_SOURCE" | undefined
  >(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, itemsPerPage, facilityType]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }
    const newUrl = `/browse/facilities${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [debouncedQuery, currentPage, router]);

  const hasSearchQuery = debouncedQuery.trim().length > 0;

  const searchData = trpc.facilities.search.useQuery(
    {
      query: debouncedQuery,
      limit: itemsPerPage,
    },
    {
      enabled: hasSearchQuery,
      staleTime: 30000,
    },
  );

  const allData = trpc.facilities.list.useQuery(
    {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortBy,
      facilityType,
    },
    {
      enabled: !hasSearchQuery,
      staleTime: 30000,
    },
  );

  const data = hasSearchQuery
    ? {
        facilities: searchData.data?.facilities ?? [],
        total: searchData.data?.facilities.length ?? 0,
        hasMore: false,
      }
    : allData.data;
  const isLoading = hasSearchQuery ? searchData.isLoading : allData.isLoading;
  const isError = hasSearchQuery ? searchData.isError : allData.isError;
  const error = hasSearchQuery ? searchData.error : allData.error;

  const totalPages = data
    ? Math.ceil((data.total ?? 0) / itemsPerPage)
    : 1;

  const handleFacilityCreated = () => {
    searchData.refetch();
    allData.refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-gray-100">
          Browse Facilities
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {hasSearchQuery
            ? `Search results for "${debouncedQuery}"`
            : "Explore all facilities in the X-ray Atlas database."}
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
            placeholder="Search facilities by name, city, or country..."
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
              {Math.min(currentPage * itemsPerPage, data.total)} of {data.total}{" "}
              facilities
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

        {!hasSearchQuery && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="facility-type"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Type:
              </label>
              <select
                id="facility-type"
                value={facilityType ?? ""}
                onChange={(e) =>
                  setFacilityType(
                    e.target.value === ""
                      ? undefined
                      : (e.target.value as
                          | "SYNCHROTRON"
                          | "FREE_ELECTRON_LASER"
                          | "LAB_SOURCE"),
                  )
                }
                className="focus:border-wsu-crimson focus:ring-wsu-crimson rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">All Types</option>
                <option value="SYNCHROTRON">Synchrotron</option>
                <option value="FREE_ELECTRON_LASER">Free Electron Laser</option>
                <option value="LAB_SOURCE">Lab Source</option>
              </select>
            </div>
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
                  setSortBy(e.target.value as "name" | "city" | "country")
                }
                className="focus:border-wsu-crimson focus:ring-wsu-crimson rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="name">Name (A-Z)</option>
                <option value="city">City</option>
                <option value="country">Country</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: itemsPerPage }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
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
            {data.facilities.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <p className="text-gray-600 dark:text-gray-400">
                  {hasSearchQuery
                    ? `No facilities found for "${debouncedQuery}".`
                    : "No facilities found in the database."}
                </p>
                {hasSearchQuery && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                    Try a different search term or{" "}
                    <Link
                      href="/browse/facilities"
                      className="text-wsu-crimson hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setQuery("");
                        setDebouncedQuery("");
                      }}
                    >
                      browse all facilities
                    </Link>
                    .
                  </p>
                )}
                <div className="mt-6">
                  <AddFacilityButton
                    className="min-h-[140px]"
                    onCreated={handleFacilityCreated}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <AddFacilityButton
                  className="min-h-[140px]"
                  onCreated={handleFacilityCreated}
                />
                {data.facilities.map((facility) => (
                  <FacilityCardCompact
                    key={facility.id}
                    id={facility.id}
                    name={facility.name}
                    city={facility.city}
                    country={facility.country}
                    facilityType={facility.facilitytype}
                    instrumentCount={facility._count?.instruments ?? facility.instruments?.length ?? 0}
                  />
                ))}
              </div>
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
                  {totalPages <= 7
                    ? Array.from({ length: totalPages }, (_, i) => i + 1).map(
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
                    : (
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
