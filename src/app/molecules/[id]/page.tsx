"use client";

import { useState, use, useEffect, useRef } from "react";
import { trpc } from "~/trpc/client";
import { MoleculeDisplay } from "@/components/molecules/molecule-display";
import { PageSkeleton } from "@/components/feedback/loading-state";
import { NotFoundState, ErrorState } from "@/components/feedback/error-state";
import { EditMoleculeModal } from "~/app/components/EditMoleculeModal";
import Link from "next/link";
import { CalendarIcon } from "@heroicons/react/24/outline";

const VIEW_SESSION_KEY = "xray-atlas-view-session";

function getOrCreateViewSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(VIEW_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(VIEW_SESSION_KEY, id);
  }
  return id;
}

export default function MoleculeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { id: moleculeId } = use(params);
  const trackViewSent = useRef(false);

  const trackView = trpc.molecules.trackView.useMutation();

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

  useEffect(() => {
    if (!molecule?.id || trackViewSent.current) return;
    trackViewSent.current = true;
    const sessionId = getOrCreateViewSessionId();
    trackView.mutate(
      { moleculeId: molecule.id, ...(sessionId ? { sessionId } : {}) },
      {
        onError: () => {
          trackViewSent.current = false;
        },
      },
    );
  }, [molecule?.id]);

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

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const samplesCount = molecule.sampleCount ?? 0;

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
        <MoleculeDisplay molecule={molecule} onEdit={handleEdit} />
      </div>

      <EditMoleculeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        moleculeId={molecule.id}
        initialData={{
          iupacName: molecule.iupacName,
          commonNames: molecule.commonName ?? [],
          chemicalFormula: molecule.chemicalFormula,
          SMILES: molecule.SMILES,
          InChI: molecule.InChI,
          casNumber: molecule.casNumber ?? null,
          pubChemCid: molecule.pubChemCid ?? null,
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
                {molecule.iupacName}
              </dd>
            </div>
            {(molecule.commonName?.length ?? 0) > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Common Names
                </dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {molecule.commonName!.map((synonym: string, idx: number) => (
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
                {molecule.chemicalFormula}
              </dd>
            </div>
            {molecule.casNumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  CAS Number
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                  {molecule.casNumber}
                </dd>
              </div>
            )}
            {molecule.pubChemCid && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  PubChem CID
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                  {molecule.pubChemCid}
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
                {samplesCount}
              </dd>
            </div>
            {molecule.favoriteCount !== undefined && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Favorites
                </dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {molecule.favoriteCount ?? 0}
                </dd>
              </div>
            )}
            {molecule.createdBy && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Uploaded By
                </dt>
                <dd className="mt-1">
                  <Link
                    href={`/users/${molecule.createdBy.id}`}
                    className="text-accent dark:text-accent-light text-sm font-medium hover:underline"
                  >
                    {molecule.createdBy.name}
                  </Link>
                </dd>
              </div>
            )}
            {molecule.createdAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(molecule.createdAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            {molecule.updatedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(molecule.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {molecule.samples && molecule.samples.length > 0 && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Samples ({molecule.samples.length})
          </h2>
          <div className="space-y-4">
            {molecule.samples.map((sample) => (
              <div
                key={sample.id}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {sample.identifier ?? "—"}
                    </h3>
                    {sample.preparationdate && (
                      <p className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="mr-1 h-4 w-4" />
                        Prepared:{" "}
                        {new Date(sample.preparationdate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
