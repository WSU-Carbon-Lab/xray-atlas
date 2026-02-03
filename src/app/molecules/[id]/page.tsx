"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { MoleculeDisplay } from "@/components/molecules/molecule-display";
import { AddNexafsCard } from "@/components/contribute";
import { PageSkeleton } from "@/components/feedback/loading-state";
import { NotFoundState, ErrorState } from "@/components/feedback/error-state";
import Link from "next/link";
import { CalendarIcon } from "@heroicons/react/24/outline";

type SessionUserWithOrcid = { orcid?: string | null };

const VIEW_SESSION_KEY = "xray-atlas-view-session";
const VIEW_DEBOUNCE_KEY = "xray-atlas-view-debounce";
const VIEW_DEBOUNCE_MS = 2000;

function getOrCreateViewSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(VIEW_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(VIEW_SESSION_KEY, id);
  }
  return id;
}

function shouldDebounceTrackView(): boolean {
  if (typeof window === "undefined") return true;
  const last = sessionStorage.getItem(VIEW_DEBOUNCE_KEY);
  if (!last) return false;
  const elapsed = Date.now() - parseInt(last, 10);
  return elapsed < VIEW_DEBOUNCE_MS;
}

function markTrackViewSent(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(VIEW_DEBOUNCE_KEY, Date.now().toString());
}

export default function MoleculeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [_optimisticViewCount, setOptimisticViewCount] = useState<
    number | null
  >(null);
  const { id: moleculeId } = use(params);
  const trackViewSent = useRef(false);
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const hasOrcid = !!(session?.user as SessionUserWithOrcid)?.orcid;
  const canEdit = isSignedIn && hasOrcid;

  const trackView = trpc.molecules.trackView.useMutation({
    onMutate: () => setOptimisticViewCount(1),
    onSuccess: (data) => {
      if (data?.recorded === true) markTrackViewSent();
      if (data?.recorded !== true) setOptimisticViewCount(null);
    },
    onError: () => setOptimisticViewCount(null),
  });
  const trackViewMutateRef = useRef(trackView.mutate);
  trackViewMutateRef.current = trackView.mutate;

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
    if (shouldDebounceTrackView()) return;
    trackViewSent.current = true;
    const sessionId = getOrCreateViewSessionId();
    trackViewMutateRef.current(
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
        <MoleculeDisplay
          molecule={molecule}
          variant="header"
          canEdit={canEdit}
          isSignedIn={isSignedIn}
        />
      </div>

      <section className="mt-8 space-y-6" aria-labelledby="browse-heading">
        <h2
          id="browse-heading"
          className="text-xl font-semibold text-gray-900 dark:text-gray-100"
        >
          NEXAFS
        </h2>
        <AddNexafsCard href="/contribute/nexafs" />
      </section>

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
