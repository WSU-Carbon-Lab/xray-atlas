"use client";

import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { PageSkeleton } from "~/app/components/LoadingState";
import { NotFoundState, ErrorState } from "~/app/components/ErrorState";
import { MoleculeDisplay, type DisplayMolecule } from "~/app/components/MoleculeDisplay";
import Link from "next/link";
import Image from "next/image";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  const {
    data: user,
    isLoading,
    isError,
    error,
  } = trpc.users.getById.useQuery(
    { id: userId },
    {
      retry: false,
    },
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (isError) {
    if (error?.data?.code === "NOT_FOUND" || error?.message === "User not found") {
      return (
        <div className="container mx-auto px-4 py-8">
          <NotFoundState
            title="User Not Found"
            message="The user you're looking for doesn't exist."
          />
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load user"
          message={error?.message || "An error occurred while loading the user."}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <NotFoundState />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-wsu-crimson dark:text-gray-400 dark:hover:text-wsu-crimson"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* User Avatar */}
          {user.imageurl ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-full">
              <Image
                src={user.imageurl}
                alt={user.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-wsu-crimson text-2xl font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {user.name}
            </h1>
            <p className="mb-4 text-gray-600 dark:text-gray-400">{user.email}</p>

            {user.orcid && (
              <div className="mb-4">
                <a
                  href={`https://orcid.org/${user.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-wsu-crimson hover:underline"
                >
                  <span>ORCID: {user.orcid}</span>
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            )}

            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              <span className="capitalize">{user.role}</span>
            </div>
          </div>
        </div>

        {/* User Statistics */}
        <div className="mt-8 border-t border-gray-200 pt-8 dark:border-gray-700">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Contributions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Experiments
              </div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {user.experiments?.length ?? 0}
              </div>
            </div>
            {(user as { _count?: { molecules?: number } })._count?.molecules !== undefined && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Molecules
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(user as { _count?: { molecules?: number } })._count?.molecules ?? 0}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Molecules Created by User */}
      <div className="mt-8">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Molecules Created
        </h2>
        <UserMoleculesList userId={user.clerkid} />
      </div>
    </div>
  );
}

function UserMoleculesList({ userId }: { userId: string }) {
  const {
    data,
    isLoading,
  } = trpc.molecules.getByCreator.useInfiniteQuery(
    {
      creatorId: userId,
      limit: 12,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Loading molecules...
        </div>
      </div>
    );
  }

  const molecules = data?.pages.flatMap((page) => page.molecules) ?? [];

  if (molecules.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This user hasn&apos;t created any molecules yet.
        </p>
      </div>
    );
  }

  // Transform molecules to DisplayMolecule format
  const displayMolecules = molecules.map((molecule) => {
    const synonyms = molecule.moleculesynonyms.map((s) => s.synonym);
    const primarySynonym = molecule.moleculesynonyms.find(
      (s) => s.order === 0,
    );
    const displayName = primarySynonym?.synonym ?? synonyms[0] ?? molecule.iupacname;

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
    };
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {displayMolecules.map((molecule) => (
        <div key={molecule.id}>
          <MoleculeDisplay molecule={molecule} />
        </div>
      ))}
    </div>
  );
}
