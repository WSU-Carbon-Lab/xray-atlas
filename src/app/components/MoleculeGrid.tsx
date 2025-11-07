"use client";

import React, { useEffect, useRef } from "react";
import { trpc } from "~/trpc/client";
import { MoleculeDisplay, type DisplayMolecule } from "./MoleculeDisplay";
import { MoleculeGridSkeleton } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { useRouter } from "next/navigation";

interface MoleculeGridProps {
  limit?: number;
  enableInfiniteScroll?: boolean;
  className?: string;
}

export function MoleculeGrid({
  limit = 12,
  enableInfiniteScroll = true,
  className = "",
}: MoleculeGridProps) {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = trpc.molecules.list.useInfiniteQuery(
    {
      limit,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Infinite scroll observer
  useEffect(() => {
    if (!enableInfiniteScroll || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage().catch(console.error);
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [enableInfiniteScroll, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Transform Prisma molecules to DisplayMolecule format
  const transformMolecule = (
    molecule: NonNullable<
      NonNullable<typeof data>["pages"][number]["molecules"][number]
    >,
  ): DisplayMolecule | null => {
    if (!molecule) return null;

    const allSynonyms = molecule.moleculesynonyms.map(
      (s: { synonym: string; primary?: boolean }) => s.synonym,
    );

    // Find primary synonym for display, fallback to first synonym
    const primarySynonym = molecule.moleculesynonyms.find(
      (s: { primary?: boolean }) => s.primary,
    );
    const displayName = primarySynonym?.synonym ?? allSynonyms[0] ?? molecule.iupacname;

    return {
      name: displayName, // Use primary name for display
      commonName: allSynonyms.length > 0 ? allSynonyms : undefined,
      chemical_formula: molecule.chemicalformula,
      SMILES: molecule.smiles,
      InChI: molecule.inchi,
      pubChemCid: molecule.pubchemcid,
      casNumber: molecule.casnumber,
      imageUrl: molecule.imageurl ?? undefined,
    };
  };

  if (isLoading) {
    return <MoleculeGridSkeleton count={limit} />;
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

  const molecules = data?.pages.flatMap((page) => page.molecules) ?? [];

  if (molecules.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">
          No molecules found in the database.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {molecules.map((molecule) => {
          const displayMolecule = transformMolecule(molecule);
          if (!displayMolecule) return null;

          return (
            <div
              key={molecule.id}
              onClick={() => router.push(`/molecules/${molecule.id}`)}
              className="cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <MoleculeDisplay molecule={displayMolecule} />
            </div>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      {enableInfiniteScroll && hasNextPage && (
        <div ref={loadMoreRef} className="mt-8 flex justify-center">
          {isFetchingNextPage && (
            <MoleculeGridSkeleton count={4} className="mt-4" />
          )}
        </div>
      )}

      {/* Manual load more button (fallback) */}
      {enableInfiniteScroll && hasNextPage && !isFetchingNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
