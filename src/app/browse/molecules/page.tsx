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
import { AddMoleculeButton } from "@/components/contribute";
import { BrowseHeader, selectClasses } from "@/components/browse/browse-header";
import { BrowsePageLayout, BROWSE_CONTENT_CLASS } from "@/components/browse/browse-page-layout";
import { BrowseEmptyState } from "@/components/browse/browse-empty-state";
import { ItemsPerPageSelect } from "@/components/browse/items-per-page-select";
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

  const searchData = trpc.molecules.autosuggest.useQuery(
    {
      query: debouncedQuery,
      limit: itemsPerPage,
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
        total: searchData.data?.results?.length ?? 0,
        hasMore: false,
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

  const subtitle = hasSearchQuery
    ? `Search results for "${debouncedQuery}"`
    : "Explore all molecules in the X-ray Atlas database.";

  return (
    <BrowsePageLayout title="Browse Molecules" subtitle={subtitle}>
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
                  className="border-border bg-surface text-muted focus-visible:ring-accent flex h-12 min-h-12 items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  aria-label="Sort molecules"
                >
                  <ArrowsUpDownIcon className="h-5 w-5 shrink-0 stroke-[1.5]" />
                  <span className="text-sm font-medium">Sort</span>
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Sort molecules"
                className="border-border bg-default rounded-lg border"
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
                    className="*:flex *:h-10 *:min-h-10 *:w-9 *:min-w-9 *:items-center *:justify-center *:p-0 *:text-sm *:leading-none *:font-normal *:transition-colors *:[&_svg]:block *:text-muted *:data-[selected=true]:bg-accent *:data-[selected=true]:text-accent-foreground flex h-12 min-h-12 w-fit flex-row gap-0.5 rounded-lg border border-border bg-surface p-0.5"
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
              className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg"
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
                <BrowseEmptyState
                  message={
                    hasSearchQuery
                      ? `No molecules found for "${debouncedQuery}".`
                      : "No molecules found in the database."
                  }
                  hasSearchQuery={hasSearchQuery}
                  browseAllHref="/browse/molecules"
                  onClearSearch={() => {
                    setQuery("");
                    setDebouncedQuery("");
                  }}
                >
                  <AddMoleculeButton
                    className="min-h-[140px]"
                    onCreated={handleMoleculeCreated}
                  />
                </BrowseEmptyState>
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
                <ItemsPerPageSelect
                  value={itemsPerPage}
                  onChange={setItemsPerPage}
                />
                {totalPages > 1 && (
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                    size="sm"
                    classNames={{
                      base: "gap-2",
                      item: "rounded-lg border border-border bg-surface text-foreground",
                      cursor: "bg-accent text-accent-foreground border-accent",
                      prev: "rounded-lg border border-border bg-surface",
                      next: "rounded-lg border border-border bg-surface",
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </BrowsePageLayout>
  );
}

export default function MoleculesBrowsePage() {
  return (
    <Suspense
      fallback={
        <BrowsePageLayout
          title="Browse Molecules"
          subtitle="Loading…"
        >
          <BrowseTabs />
        </BrowsePageLayout>
      }
    >
      <MoleculesBrowseContent />
    </Suspense>
  );
}
