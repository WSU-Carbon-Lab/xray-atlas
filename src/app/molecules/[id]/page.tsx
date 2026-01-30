"use client";

import { useState, use } from "react";
import { trpc } from "~/trpc/client";
import {
  MoleculeDisplay,
  type DisplayMolecule,
} from "@/components/molecules/molecule-display";
import { PageSkeleton } from "@/components/feedback/loading-state";
import { NotFoundState, ErrorState } from "@/components/feedback/error-state";
import { EditMoleculeModal } from "~/app/components/EditMoleculeModal";
import Link from "next/link";
import { CalendarIcon } from "@heroicons/react/24/outline";

export default function MoleculeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { id: moleculeId } = use(params);

  const {
    data: molecule,
    isLoading,
    isError,
    error,
  } = trpc.molecules.getById.useQuery(
    { id: moleculeId },
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
    if (error?.data?.code === "NOT_FOUND") {
      return (
        <div className="container mx-auto px-4 py-8">
          <NotFoundState
            title="Molecule Not Found"
            message="The molecule you're looking for doesn't exist in our database."
          />
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load molecule"
          message={
            error?.message || "An error occurred while loading the molecule."
          }
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!molecule) {
    return (
      <div className="container mx-auto px-4 py-8">
        <NotFoundState />
      </div>
    );
  }

  // Transform to DisplayMolecule format
  // Find primary synonym for display, fallback to first synonym or IUPAC name
  const synonyms = molecule.moleculesynonyms.map(
    (s: { synonym: string }) => s.synonym,
  );
  const primarySynonym = molecule.moleculesynonyms.find(
    (s: { order?: number }) => s.order === 0,
  );
  const displayName = primarySynonym?.synonym ?? synonyms[0] ?? molecule.iupacname;

  const displayMolecule: DisplayMolecule = {
    name: displayName, // Use primary name for display
    commonName: synonyms.length > 0 ? synonyms : undefined,
    chemical_formula: molecule.chemicalformula,
    SMILES: molecule.smiles,
    InChI: molecule.inchi,
    pubChemCid: molecule.pubchemcid,
    casNumber: molecule.casnumber,
    imageUrl: molecule.imageurl ?? undefined,
    id: molecule.id,
    upvoteCount: (molecule as { favoriteCount?: number }).favoriteCount,
    userHasUpvoted: (molecule as { userHasFavorited?: boolean }).userHasFavorited,
    createdBy: null,
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const samples = molecule.samples || [];
  // Note: experiments are not included in getById query, would need separate query
  // For now, just show sample count

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="hover:text-accent dark:hover:text-accent-light text-sm text-gray-600 dark:text-gray-400"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="mb-8">
        <MoleculeDisplay molecule={displayMolecule} onEdit={handleEdit} />
      </div>

      {/* Edit Modal */}
      <EditMoleculeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        moleculeId={molecule.id}
        initialData={{
          iupacName: molecule.iupacname,
          commonNames: synonyms,
          chemicalFormula: molecule.chemicalformula,
          SMILES: molecule.smiles,
          InChI: molecule.inchi,
          casNumber: molecule.casnumber,
          pubChemCid: molecule.pubchemcid,
        }}
        onSuccess={() => {
          // Refetch molecule data after successful update
          // This is handled automatically by the mutation's onSuccess
        }}
      />

      {/* Additional Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Molecule Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Molecule Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                IUPAC Name
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {molecule.iupacname}
              </dd>
            </div>
            {synonyms.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Common Names
                </dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {synonyms.map((synonym: string, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {synonym}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Chemical Formula
              </dt>
              <dd className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                {molecule.chemicalformula}
              </dd>
            </div>
            {molecule.casnumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  CAS Number
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                  {molecule.casnumber}
                </dd>
              </div>
            )}
            {molecule.pubchemcid && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  PubChem CID
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                  {molecule.pubchemcid}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Statistics */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Database Statistics
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Samples
              </dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {samples.length}
              </dd>
            </div>
            {(molecule as { favoriteCount?: number }).favoriteCount !== undefined && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Favorites
                </dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(molecule as { favoriteCount?: number }).favoriteCount ?? 0}
                </dd>
              </div>
            )}
            {(molecule as { users?: { id: string; name: string } | null }).users && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Uploaded By
                </dt>
                <dd className="mt-1">
                  <Link
                    href={`/users/${(molecule as { users?: { id: string; name: string } | null }).users?.id}`}
                    className="text-sm font-medium text-accent hover:underline dark:text-accent-light"
                  >
                    {(molecule as { users?: { id: string; name: string } | null }).users?.name}
                  </Link>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Created
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {new Date(molecule.createdat).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Last Updated
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {new Date(molecule.updatedat).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Samples Section */}
      {samples.length > 0 && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Samples ({samples.length})
          </h2>
          <div className="space-y-4">
            {samples.map(
              (sample) => (
                <div
                  key={sample.id}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {sample.identifier}
                      </h3>
                      {sample.preparationdate && (
                        <p className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <CalendarIcon className="mr-1 h-4 w-4" />
                          Prepared:{" "}
                          {new Date(
                            sample.preparationdate,
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
