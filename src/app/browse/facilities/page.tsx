"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { FacilityCardCompact } from "@/components/facilities/facility-card";
import { ErrorState } from "@/components/feedback/error-state";
import { BrowseTabs } from "@/components/layout/browse-tabs";
import { AddFacilityButton } from "@/components/contribute";
import { BrowseHeader } from "@/components/browse/browse-header";
import { BrowsePageLayout } from "@/components/browse/browse-page-layout";
import { BrowseEmptyState } from "@/components/browse/browse-empty-state";
import { ItemsPerPageSelect } from "@/components/browse/items-per-page-select";
import { Pagination } from "@heroui/react";

function FacilitiesBrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
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
  }, [itemsPerPage]);

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

  const totalPages = data ? Math.ceil((data.total ?? 0) / itemsPerPage) : 1;

  const handleFacilityCreated = () => {
    void searchData.refetch();
    void allData.refetch();
  };

  const subtitle = hasSearchQuery
    ? `Search results for "${debouncedQuery}"`
    : "Explore all facilities in the X-ray Atlas database.";

  return (
    <BrowsePageLayout title="Browse Facilities" subtitle={subtitle}>
      <BrowseTabs />

      <div className="space-y-6">
        <BrowseHeader
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search facilities by name, city, or country..."
        />

        {/* Results */}
        <div>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <div
                  key={i}
                  className="border-border bg-surface h-32 animate-pulse rounded-xl border p-4 shadow-lg"
                />
              ))}
            </div>
          )}

          {isError && (
            <ErrorState
              title="Failed to load results"
              message={
                error?.message ??
                "An error occurred while loading search results."
              }
              onRetry={() => window.location.reload()}
            />
          )}

          {!isLoading && !isError && data && (
            <>
              {data.facilities.length === 0 ? (
                <BrowseEmptyState
                  message={
                    hasSearchQuery
                      ? `No facilities found for "${debouncedQuery}".`
                      : "No facilities found in the database."
                  }
                  hasSearchQuery={hasSearchQuery}
                  browseAllHref="/browse/facilities"
                  onClearSearch={() => {
                    setQuery("");
                    setDebouncedQuery("");
                  }}
                >
                  <AddFacilityButton
                    className="min-h-[140px]"
                    onCreated={handleFacilityCreated}
                  />
                </BrowseEmptyState>
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
                      instrumentCount={facility.instruments?.length ?? 0}
                    />
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <ItemsPerPageSelect
                  value={itemsPerPage}
                  onChange={setItemsPerPage}
                  labelId="facilities-items-per-page"
                />
                {totalPages > 1 ? (
                  <Pagination size="sm" className="gap-2">
                    <Pagination.Content className="gap-2">
                      <Pagination.Item>
                        <Pagination.Previous
                          isDisabled={currentPage <= 1}
                          aria-label="Previous page"
                          onPress={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          className="rounded-lg border border-border bg-surface"
                        >
                          <Pagination.PreviousIcon />
                        </Pagination.Previous>
                      </Pagination.Item>
                      {totalPages <= 20
                        ? Array.from(
                            { length: totalPages },
                            (_, i) => i + 1,
                          ).map((p) => (
                            <Pagination.Item key={p}>
                              <Pagination.Link
                                isActive={p === currentPage}
                                onPress={() => setCurrentPage(p)}
                                className={`rounded-lg border border-border bg-surface text-foreground ${
                                  p === currentPage
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : ""
                                }`}
                              >
                                {p}
                              </Pagination.Link>
                            </Pagination.Item>
                          ))
                        : null}
                      {totalPages > 20 ? (
                        <Pagination.Item>
                          <span className="text-muted px-2 text-xs tabular-nums">
                            {currentPage} / {totalPages}
                          </span>
                        </Pagination.Item>
                      ) : null}
                      <Pagination.Item>
                        <Pagination.Next
                          isDisabled={currentPage >= totalPages}
                          aria-label="Next page"
                          onPress={() =>
                            setCurrentPage((p) =>
                              Math.min(totalPages, p + 1),
                            )
                          }
                          className="rounded-lg border border-border bg-surface"
                        >
                          <Pagination.NextIcon />
                        </Pagination.Next>
                      </Pagination.Item>
                    </Pagination.Content>
                  </Pagination>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </BrowsePageLayout>
  );
}

export default function FacilitiesBrowsePage() {
  return (
    <Suspense
      fallback={
        <BrowsePageLayout
          title="Browse Facilities"
          subtitle="Loading..."
        >
          <BrowseTabs />
        </BrowsePageLayout>
      }
    >
      <FacilitiesBrowseContent />
    </Suspense>
  );
}
