"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMoleculeDetail } from "@/components/browse/molecule-detail-context";
import { NexafsBrowseExperimentSection } from "@/components/browse/nexafs-browse-experiment-section";
import { trpc } from "~/trpc/client";

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

function MoleculeNexafsBrowse() {
  const pathname = usePathname();
  const { moleculeId } = useMoleculeDetail();
  const contributeHref = `/contribute/nexafs?moleculeId=${moleculeId}`;

  return (
    <NexafsBrowseExperimentSection
      variant="embedded"
      basePath={pathname}
      contributeNexafsHref={contributeHref}
      showMoleculeFilter={false}
      lockedMoleculeId={moleculeId}
      emptyStateBrowseAllHref={`/browse/nexafs?molecule=${encodeURIComponent(moleculeId)}`}
      emptyListMessage="No NEXAFS datasets for this molecule yet."
      itemsPerPageLabelId="molecule-nexafs-items-per-page"
    />
  );
}

function MoleculeNexafsBrowseFallback() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border-border bg-surface h-32 animate-pulse rounded-xl border shadow-lg"
        />
      ))}
    </div>
  );
}

function MoleculeNexafsBrowseAfterMount() {
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return <MoleculeNexafsBrowseFallback />;
  }
  return <MoleculeNexafsBrowse />;
}

export default function MoleculeDetailPage() {
  const { molecule } = useMoleculeDetail();
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

  return (
    <section
      className="space-y-6"
      aria-labelledby="nexafs-heading"
      suppressHydrationWarning
    >
      <h2 id="nexafs-heading" className="sr-only" suppressHydrationWarning>
        NEXAFS spectra for this molecule
      </h2>
      <MoleculeNexafsBrowseAfterMount />
    </section>
  );
}
