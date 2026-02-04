"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import {
  MoleculeDisplayCompact,
  MoleculeDisplay,
  type DisplayMolecule,
} from "@/components/molecules/molecule-display";
import { ErrorState } from "@/components/feedback/error-state";
import {
  MoleculeCardSkeleton,
  MoleculeCompactSkeleton,
} from "@/components/feedback/loading-state";
import { BrowseTabs } from "@/components/layout/browse-tabs";
import {
  Squares2X2Icon,
  ListBulletIcon,
  ArrowsUpDownIcon,
  HeartIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { AddMoleculeButton } from "@/components/contribute";
import { BrowseHeader, selectClasses } from "@/components/browse/browse-header";
import { TagFilterBar } from "@/components/browse/tag-filter-bar";
import { TagsDropdown } from "@/components/browse/tags-dropdown";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Label, Tabs, Tooltip } from "@heroui/react";
import { Pagination } from "@heroui/pagination";

const BROWSE_CONTENT_CLASS = "mx-auto w-full max-w-7xl px-4 py-8";

function MoleculesBrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sortBy, setSortBy] = useState<
    "favorites" | "created" | "name" | "views"
  >("favorites");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<"compact" | "spacious">("spacious");

  const selectedTagIds = useMemo(() => {
    const tagsParam = searchParams.get("tags");
    if (!tagsParam) return new Set<string>();
    return new Set(tagsParam.split(",").filter(Boolean));
  }, [searchParams]);

  const tagIdsArray = useMemo(
    () => (selectedTagIds.size > 0 ? [...selectedTagIds] : []),
    [selectedTagIds],
  );

  const updateTagsInUrl = useCallback(
    (newTagIds: Set<string>) => {
      setCurrentPage(1);
      const params = new URLSearchParams();
      if (debouncedQuery) {
        params.set("q", debouncedQuery);
      }
      if (newTagIds.size > 0) {
        params.set("tags", [...newTagIds].join(","));
      }
      const newUrl = `/browse/molecules${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    },
    [debouncedQuery, router],
  );

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useLayoutEffect(() => {
    const savedViewMode = localStorage.getItem("moleculeViewMode");
    if (savedViewMode === "compact" || savedViewMode === "spacious") {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("moleculeViewMode", viewMode);
  }, [viewMode]);

  // Reset to first page when sort, items per page, or tag selection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, itemsPerPage, selectedTagIds]);

  // Update URL when query or page changes; preserve tags from URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }
    const tagsFromUrl = searchParams.get("tags");
    if (tagsFromUrl) {
      params.set("tags", tagsFromUrl);
    }
    const newUrl = `/browse/molecules${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [debouncedQuery, currentPage, searchParams, router]);

  const hasSearchQuery = debouncedQuery.trim().length > 0;

  const searchData = trpc.molecules.searchAdvanced.useQuery(
    {
      query: debouncedQuery,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      tagIds: tagIdsArray,
    },
    {
      enabled: hasSearchQuery,
      staleTime: 30000,
      placeholderData: (previousData) => previousData,
    },
  );

  const allData = trpc.molecules.getAllPaginated.useQuery(
    {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortBy,
      tagIds: tagIdsArray,
    },
    {
      enabled: !hasSearchQuery,
      staleTime: 30000,
      placeholderData: (previousData) => previousData,
    },
  );

  const data = hasSearchQuery ? searchData.data : allData.data;
  const isLoading = hasSearchQuery ? searchData.isLoading : allData.isLoading;
  const isError = hasSearchQuery ? searchData.isError : allData.isError;
  const error = hasSearchQuery ? searchData.error : allData.error;
  type SearchResult = NonNullable<typeof searchData.data>;
  type PaginatedResult = NonNullable<typeof allData.data>;
  type SearchResultMolecule = NonNullable<SearchResult["results"]>[number];
  type PaginatedResultMolecule = NonNullable<
    PaginatedResult["molecules"]
  >[number];
  type NormalizedMolecule = SearchResultMolecule | PaginatedResultMolecule;

  const normalizedData = hasSearchQuery
    ? {
        molecules: (searchData.data?.results ?? []) as NormalizedMolecule[],
        total: searchData.data?.total ?? searchData.data?.results?.length ?? 0,
        hasMore: searchData.data?.hasMore ?? false,
      }
    : {
        molecules: (allData.data?.molecules ?? []) as NormalizedMolecule[],
        total: allData.data?.total ?? 0,
        hasMore: allData.data?.hasMore ?? false,
      };

  const isSearchResultMolecule = (
    molecule: NormalizedMolecule,
  ): molecule is SearchResultMolecule =>
    "iupacName" in molecule && "synonyms" in molecule;

  const searchResultToView = (
    molecule: SearchResultMolecule,
  ): DisplayMolecule => ({
    name: molecule.iupacName,
    iupacName: molecule.iupacName,
    commonName: molecule.synonyms.length > 0 ? molecule.synonyms : undefined,
    chemicalFormula: molecule.chemicalFormula,
    SMILES: molecule.smiles,
    InChI: molecule.inchi,
    pubChemCid: molecule.pubChemCid ?? undefined,
    casNumber: molecule.casNumber ?? undefined,
    imageUrl: molecule.imageUrl ?? undefined,
    id: molecule.id,
    favoriteCount: 0,
    userHasFavorited: false,
  });

  const toDisplayMolecule = (
    molecule: NormalizedMolecule,
  ): DisplayMolecule | null => {
    if (!molecule) return null;
    if (isSearchResultMolecule(molecule)) return searchResultToView(molecule);
    return molecule as DisplayMolecule;
  };

  const totalPages = Math.max(
    1,
    Math.ceil((normalizedData.total ?? 0) / itemsPerPage),
  );
  const molecules = normalizedData.molecules;

  const handleMoleculeCreated = () => {
    void searchData.refetch();
    void allData.refetch();
  };

  return (
    <div className={BROWSE_CONTENT_CLASS}>
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
        <BrowseHeader
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search molecules…"
        >
          <TagsDropdown
            selectedTagIds={selectedTagIds}
            onSelectionChange={updateTagsInUrl}
          />
          {!hasSearchQuery && (
            <Dropdown>
              <DropdownTrigger>
                <button
                  type="button"
                  className="focus-visible:ring-accent flex h-12 min-h-12 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  aria-label="Sort molecules"
                >
                  <ArrowsUpDownIcon className="h-5 w-5 shrink-0 stroke-[1.5]" />
                  <span className="text-sm font-medium">Sort</span>
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Sort molecules"
                className="rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <DropdownItem
                  key="name"
                  textValue="Name"
                  onPress={() => setSortBy("name")}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">A</span>
                    <Label>Name (A-Z)</Label>
                  </span>
                </DropdownItem>
                <DropdownItem
                  key="favorites"
                  textValue="Favorites"
                  onPress={() => setSortBy("favorites")}
                >
                  <span className="flex items-center gap-2">
                    <HeartIcon className="h-4 w-4 shrink-0" />
                    <Label>Most Favorited</Label>
                  </span>
                </DropdownItem>
                <DropdownItem
                  key="views"
                  textValue="Views"
                  onPress={() => setSortBy("views")}
                >
                  <span className="flex items-center gap-2">
                    <EyeIcon className="h-4 w-4 shrink-0" />
                    <Label>Most Viewed</Label>
                  </span>
                </DropdownItem>
                <DropdownItem
                  key="created"
                  textValue="Newest"
                  onPress={() => setSortBy("created")}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs">New</span>
                    <Label>Newest First</Label>
                  </span>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
          <Tooltip delay={0}>
            <div>
              <Tabs
                selectedKey={viewMode}
                onSelectionChange={(key) =>
                  setViewMode(key as "compact" | "spacious")
                }
                className="w-fit"
              >
                <Tabs.ListContainer>
                  <Tabs.List
                    aria-label="View mode"
                    className="*:data-[selected=true]:bg-accent/15 *:data-[selected=true]:text-accent *:data-[selected=true]:dark:bg-accent/20 *:data-[selected=true]:dark:text-accent-light flex h-12 min-h-12 w-fit flex-row gap-0.5 rounded-lg border border-gray-300 bg-white p-0.5 *:flex *:h-10 *:min-h-10 *:w-9 *:min-w-9 *:items-center *:justify-center *:p-0 *:text-sm *:leading-none *:font-normal *:transition-colors dark:border-gray-600 dark:bg-gray-800 *:[&_svg]:block"
                  >
                    <Tabs.Tab
                      id="compact"
                      aria-label="Compact list view"
                      className="rounded-md"
                    >
                      <ListBulletIcon className="h-5 w-5 shrink-0 stroke-[1.5]" />
                      <Tabs.Indicator className="bg-accent rounded" />
                    </Tabs.Tab>
                    <Tabs.Tab
                      id="spacious"
                      aria-label="Spacious grid view"
                      className="rounded-md"
                    >
                      <Squares2X2Icon className="h-5 w-5 shrink-0 stroke-[1.5]" />
                      <Tabs.Indicator className="bg-accent rounded" />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
            </div>
            <Tooltip.Content
              placement="top"
              className="rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg dark:bg-gray-700 dark:text-gray-100"
            >
              Display molecules in a compact list or spacious grid view
            </Tooltip.Content>
          </Tooltip>
        </BrowseHeader>

        <TagFilterBar
          selectedTagIds={selectedTagIds}
          onRemove={(tagId) => {
            const next = new Set(selectedTagIds);
            next.delete(tagId);
            updateTagsInUrl(next);
          }}
        />

        <div className="min-w-0">
          {isLoading && (
            <div
              className={
                viewMode === "compact"
                  ? "w-full space-y-3"
                  : "grid w-full grid-cols-1 gap-6 md:grid-cols-2"
              }
            >
              {Array.from({ length: itemsPerPage }).map((_, i) =>
                viewMode === "compact" ? (
                  <MoleculeCompactSkeleton key={i} />
                ) : (
                  <MoleculeCardSkeleton key={i} />
                ),
              )}
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
                        className="text-accent dark:text-accent-light hover:underline"
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
                    <div className="w-full space-y-3 [&>div]:[contain-intrinsic-size:0_80px] [&>div]:[content-visibility:auto]">
                      <AddMoleculeButton
                        className="min-h-[140px]"
                        onCreated={handleMoleculeCreated}
                      />
                      {molecules.map((molecule) => {
                        const displayMolecule = toDisplayMolecule(molecule);
                        if (!displayMolecule) return null;

                        return (
                          <div key={molecule.id}>
                            <MoleculeDisplayCompact
                              molecule={displayMolecule}
                              enableRealtime={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 [&>div]:[contain-intrinsic-size:0_220px] [&>div]:[content-visibility:auto]">
                      <AddMoleculeButton
                        className="min-h-[220px]"
                        onCreated={handleMoleculeCreated}
                      />
                      {molecules.map((molecule) => {
                        const displayMolecule = toDisplayMolecule(molecule);
                        if (!displayMolecule) return null;

                        return (
                          <div key={molecule.id}>
                            <MoleculeDisplay
                              molecule={displayMolecule}
                              enableRealtime={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Pagination */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="items-per-page"
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    Show
                  </label>
                  <select
                    id="items-per-page"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className={selectClasses}
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
                {totalPages > 1 && (
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                    size="sm"
                    classNames={{
                      base: "gap-2",
                      item: "rounded-lg border border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
                      cursor:
                        "bg-accent text-white border-accent dark:bg-accent dark:text-white dark:border-accent",
                      prev: "rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800",
                      next: "rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800",
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MoleculesBrowsePage() {
  return (
    <Suspense
      fallback={
        <div className={BROWSE_CONTENT_CLASS}>
          <div className="mb-8">
            <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-gray-100">
              Browse Molecules
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Loading…</p>
          </div>
          <BrowseTabs />
        </div>
      }
    >
      <MoleculesBrowseContent />
    </Suspense>
  );
}
