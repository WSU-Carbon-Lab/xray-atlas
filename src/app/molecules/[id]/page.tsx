"use client";

import { useEffect, useRef } from "react";
import { useMoleculeDetail } from "@/components/browse/molecule-detail-context";
import { AddNexafsCard } from "@/components/contribute";
import { trpc } from "~/trpc/client";
import { CalendarIcon } from "@heroicons/react/24/outline";

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

export default function MoleculeDetailPage() {
  const { molecule, moleculeId } = useMoleculeDetail();
  const trackViewSent = useRef(false);

  const trackView = trpc.molecules.trackView.useMutation();
  const trackViewMutateRef = useRef(trackView.mutate);
  trackViewMutateRef.current = trackView.mutate;

  useEffect(() => {
    if (!molecule?.id || trackViewSent.current) return;
    if (shouldDebounceTrackView()) return;
    trackViewSent.current = true;
    const sessionId = getOrCreateViewSessionId();
    trackViewMutateRef.current(
      { moleculeId: molecule.id, ...(sessionId ? { sessionId } : {}) },
      {
        onSuccess: (data) => {
          if (data?.recorded === true) markTrackViewSent();
        },
        onError: () => {
          trackViewSent.current = false;
        },
      },
    );
  }, [molecule?.id]);

  const contributeHref = `/contribute/nexafs?moleculeId=${moleculeId}`;

  return (
    <section className="space-y-6" aria-labelledby="nexafs-heading">
      <h2 id="nexafs-heading" className="sr-only">
        NEXAFS spectra for this molecule
      </h2>
      <div className="space-y-3 [&>a]:block">
        <AddNexafsCard href={contributeHref} className="min-h-[140px] w-full" />
      </div>

      {molecule.samples && molecule.samples.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
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
    </section>
  );
}
